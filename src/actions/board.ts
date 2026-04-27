/**
 * Board server actions — full CRUD for authenticated users.
 *
 * All actions:
 * - Require authentication (return error if not authenticated)
 * - Return `ActionResult<T>` — never throw to the client
 * - Verify user has access to the board's team before operating
 *
 * Board ownership model:
 * - Boards belong to a team
 * - Users access boards via team membership
 * - `getOrCreateBoard(boardId)` bridges the URL slug → DB UUID gap:
 *   if a board with that slug doesn't exist yet, it creates one in the
 *   user's personal team (Phase 8 will fully resolve this)
 */

"use server";

import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
  boards,
  favorites,
  teamMembers,
  teams,
  users,
  boardAssets,
} from "@/lib/db/schema";
import type { ActionResult, BoardWithDetails, UserRole } from "@/types";
import { ROUTES } from "@/lib/constants";
import { getOrCreatePersonalTeam } from "./team";

// ─── Auth helper ─────────────────────────────────────────────────────────────

async function getCurrentDbUser() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  const user = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  return user[0] ?? null;
}

// ─── Access check helper ──────────────────────────────────────────────────────

/**
 * Verify a user is a member of the team that owns the given board.
 * Returns the user's role on the team, or null if not a member.
 */
async function getUserBoardRole(
  userId: string,
  boardId: string
): Promise<UserRole | null> {
  const result = await db
    .select({ role: teamMembers.role })
    .from(boards)
    .innerJoin(teamMembers, eq(teamMembers.teamId, boards.teamId))
    .where(and(eq(boards.id, boardId), eq(teamMembers.userId, userId)))
    .limit(1);

  return (result[0]?.role as UserRole) ?? null;
}

// ─── Enrich boards with favorites + creator name ──────────────────────────────

async function enrichBoards(
  rawBoards: (typeof boards.$inferSelect)[],
  userId: string
): Promise<BoardWithDetails[]> {
  if (rawBoards.length === 0) return [];

  const boardIds = rawBoards.map((b) => b.id);

  // Favorites for current user
  const userFavs = await db
    .select({ boardId: favorites.boardId })
    .from(favorites)
    .where(
      and(eq(favorites.userId, userId), inArray(favorites.boardId, boardIds))
    );
  const favSet = new Set(userFavs.map((f) => f.boardId));

  // Creator names
  const creatorIds = [...new Set(rawBoards.map((b) => b.createdBy))];
  const creators = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(inArray(users.id, creatorIds));
  const creatorMap = new Map(creators.map((c) => [c.id, c.name]));

  // User role per board (via team membership)
  const teamIds = [...new Set(rawBoards.map((b) => b.teamId))];
  const memberships = await db
    .select({ teamId: teamMembers.teamId, role: teamMembers.role })
    .from(teamMembers)
    .where(
      and(eq(teamMembers.userId, userId), inArray(teamMembers.teamId, teamIds))
    );
  const roleMap = new Map(memberships.map((m) => [m.teamId, m.role as UserRole]));

  return rawBoards.map((b) => ({
    id: b.id,
    teamId: b.teamId,
    name: b.name,
    description: b.description,
    thumbnailUrl: b.thumbnailUrl,
    createdBy: b.createdBy,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
    isFavorite: favSet.has(b.id),
    creatorName: creatorMap.get(b.createdBy) ?? "Unknown",
    userRole: roleMap.get(b.teamId) ?? "viewer",
  }));
}

// ─── Get Boards ───────────────────────────────────────────────────────────────

export interface GetBoardsOptions {
  /** Search by board name (case-insensitive partial match) */
  search?: string;
  /** Filter by tab */
  filter?: "all" | "favorites" | "recent";
  teamId?: string;
}

/**
 * Get all boards accessible to the current user, with optional filtering.
 * Boards are sorted by most recently updated first.
 */
export async function getBoards(
  options: GetBoardsOptions = {}
): Promise<ActionResult<BoardWithDetails[]>> {
  const user = await getCurrentDbUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { search, filter = "all", teamId } = options;

  // Get team IDs the user belongs to
  const userTeams = await db
    .select({ teamId: teamMembers.teamId })
    .from(teamMembers)
    .where(eq(teamMembers.userId, user.id));

  const teamIds = userTeams.map((t) => t.teamId);
  if (teamIds.length === 0) return { success: true, data: [] };

  // Build query conditions
  const conditions = [inArray(boards.teamId, teamIds)];

  if (teamId) {
    conditions.push(eq(boards.teamId, teamId));
  }

  if (search?.trim()) {
    conditions.push(ilike(boards.name, `%${search.trim()}%`));
  }

  if (filter === "favorites") {
    // Subquery: only boards the user has favorited
    const favBoardIds = await db
      .select({ boardId: favorites.boardId })
      .from(favorites)
      .where(eq(favorites.userId, user.id));
    const ids = favBoardIds.map((f) => f.boardId);
    if (ids.length === 0) return { success: true, data: [] };
    conditions.push(inArray(boards.id, ids));
  }

  if (filter === "recent") {
    // Recent = updated in the last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    conditions.push(
      sql`${boards.updatedAt} >= ${sevenDaysAgo.toISOString()}`
    );
  }

  const rawBoards = await db
    .select()
    .from(boards)
    .where(and(...conditions))
    .orderBy(desc(boards.updatedAt));

  const enriched = await enrichBoards(rawBoards, user.id);
  return { success: true, data: enriched };
}

// ─── Get Single Board ─────────────────────────────────────────────────────────

/**
 * Get a single board by ID with access check.
 */
export async function getBoard(
  boardId: string
): Promise<ActionResult<BoardWithDetails>> {
  const user = await getCurrentDbUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const role = await getUserBoardRole(user.id, boardId);
  if (!role) return { success: false, error: "Board not found or access denied" };

  const board = await db
    .select()
    .from(boards)
    .where(eq(boards.id, boardId))
    .limit(1);

  if (!board[0]) return { success: false, error: "Board not found" };

  const [enriched] = await enrichBoards([board[0]], user.id);
  return { success: true, data: enriched };
}

// ─── Create Board ─────────────────────────────────────────────────────────────

/**
 * Create a new board in the user's personal team.
 * Returns the new board's ID (UUID) for redirect.
 */
export async function createBoard(
  name: string = "Untitled Board",
  skipRevalidate: boolean = false
): Promise<ActionResult<{ boardId: string }>> {
  const user = await getCurrentDbUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // Ensure personal team exists
  const teamResult = await getOrCreatePersonalTeam();
  if (!teamResult.success) return teamResult;

  const [newBoard] = await db
    .insert(boards)
    .values({
      teamId: teamResult.data.teamId,
      name: name.trim() || "Untitled Board",
      createdBy: user.id,
    })
    .returning({ id: boards.id });

  if (!skipRevalidate) {
    revalidatePath(ROUTES.HOME);
  }
  return { success: true, data: { boardId: newBoard.id } };
}

// ─── Get or Create Board (URL slug bridge) ────────────────────────────────────

/**
 * Get a board by its URL slug ID (UUID from the URL).
 * If it doesn't exist in the DB yet, creates it in the user's personal team.
 *
 * This bridges the gap between guest-mode boards (where the URL ID is a nanoid)
 * and auth-mode boards (where the URL ID should be a DB UUID).
 *
 * Used by the board page in auth mode.
 */
export async function getOrCreateBoard(boardId: string): Promise<
  ActionResult<{ boardId: string; boardName: string; isNew: boolean; role: UserRole }>
> {
  const user = await getCurrentDbUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // Check if the ID looks like a valid UUID before executing DB queries
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(boardId);

  if (isUuid) {
    // Check if board already exists and user has access
    const role = await getUserBoardRole(user.id, boardId);
    if (role) {
      const board = await db
        .select({ id: boards.id, name: boards.name })
        .from(boards)
        .where(eq(boards.id, boardId))
        .limit(1);

      if (board[0]) {
        return {
          success: true,
          data: { boardId: board[0].id, boardName: board[0].name, isNew: false, role },
        };
      }
    }
  }

  if (!isUuid) {
    // It's a guest nanoid board — create a new DB board and redirect, skipping revalidation during rendering
    const result = await createBoard("Untitled Board", true);
    if (!result.success) return result;
    return {
      success: true,
      data: { boardId: result.data.boardId, boardName: "Untitled Board", isNew: true, role: "owner" },
    };
  }

  // It's a UUID but user doesn't have access — access denied
  return { success: false, error: "Board not found or access denied" };
}

// ─── Rename Board ─────────────────────────────────────────────────────────────

export async function renameBoard(
  boardId: string,
  name: string
): Promise<ActionResult<void>> {
  const user = await getCurrentDbUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const trimmed = name.trim();
  if (!trimmed) return { success: false, error: "Board name cannot be empty" };
  if (trimmed.length > 100) return { success: false, error: "Name too long (max 100 chars)" };

  const role = await getUserBoardRole(user.id, boardId);
  if (!role) return { success: false, error: "Board not found or access denied" };
  if (role === "viewer") return { success: false, error: "Viewers cannot rename boards" };

  await db
    .update(boards)
    .set({ name: trimmed, updatedAt: new Date() })
    .where(eq(boards.id, boardId));

  revalidatePath(ROUTES.HOME);
  return { success: true, data: undefined };
}

// ─── Delete Board ─────────────────────────────────────────────────────────────

export async function deleteBoard(boardId: string): Promise<ActionResult<void>> {
  const user = await getCurrentDbUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const role = await getUserBoardRole(user.id, boardId);
  if (!role) return { success: false, error: "Board not found or access denied" };
  if (!["owner", "admin"].includes(role)) {
    return { success: false, error: "Only owners and admins can delete boards" };
  }

  // 1. Fetch associated media URLs to delete from Uploadthing
  const assetsToDelete = await db
    .select({ url: boardAssets.url })
    .from(boardAssets)
    .where(eq(boardAssets.boardId, boardId));

  if (assetsToDelete.length > 0) {
    const urls = assetsToDelete.map((a) => a.url);
    const keysToDelete: string[] = [];
    for (const url of urls) {
      const key = url.split("/f/")[1] || url.substring(url.lastIndexOf("/") + 1);
      if (key) {
        keysToDelete.push(key);
      }
    }

    if (keysToDelete.length > 0) {
      try {
        const { UTApi } = await import("uploadthing/server");
        const utapi = new UTApi();
        await utapi.deleteFiles(keysToDelete);
      } catch (err) {
        console.error("[deleteBoard] Failed to delete files from Uploadthing:", err);
      }
    }

    // 2. Delete assets from database
    await db.delete(boardAssets).where(eq(boardAssets.boardId, boardId));
  }

  // 3. Delete the board
  await db.delete(boards).where(eq(boards.id, boardId));

  revalidatePath(ROUTES.HOME);
  return { success: true, data: undefined };
}

// ─── Duplicate Board ──────────────────────────────────────────────────────────

export async function duplicateBoard(
  boardId: string
): Promise<ActionResult<{ newBoardId: string }>> {
  const user = await getCurrentDbUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const role = await getUserBoardRole(user.id, boardId);
  if (!role) return { success: false, error: "Board not found or access denied" };

  const original = await db
    .select()
    .from(boards)
    .where(eq(boards.id, boardId))
    .limit(1);

  if (!original[0]) return { success: false, error: "Board not found" };

  const [copy] = await db
    .insert(boards)
    .values({
      teamId: original[0].teamId,
      name: `${original[0].name} (Copy)`,
      description: original[0].description,
      createdBy: user.id,
    })
    .returning({ id: boards.id });

  revalidatePath(ROUTES.HOME);
  return { success: true, data: { newBoardId: copy.id } };
}

// ─── Toggle Favorite ──────────────────────────────────────────────────────────

export async function toggleFavorite(
  boardId: string
): Promise<ActionResult<{ isFavorite: boolean }>> {
  const user = await getCurrentDbUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const role = await getUserBoardRole(user.id, boardId);
  if (!role) return { success: false, error: "Board not found or access denied" };

  // Check if already favorited
  const existing = await db
    .select({ id: favorites.id })
    .from(favorites)
    .where(
      and(eq(favorites.userId, user.id), eq(favorites.boardId, boardId))
    )
    .limit(1);

  if (existing[0]) {
    // Remove from favorites
    await db
      .delete(favorites)
      .where(
        and(eq(favorites.userId, user.id), eq(favorites.boardId, boardId))
      );
    revalidatePath(ROUTES.HOME);
    return { success: true, data: { isFavorite: false } };
  } else {
    // Add to favorites
    await db.insert(favorites).values({
      userId: user.id,
      boardId,
    });
    revalidatePath(ROUTES.HOME);
  }
  return { success: true, data: { isFavorite: true } };
}

// ─── Update Board Thumbnail ───────────────────────────────────────────────────

/**
 * Update a board's thumbnail URL (called from the canvas on periodic snapshots).
 * This is a lightweight write — no revalidation needed.
 */
export async function updateBoardThumbnail(
  boardId: string,
  thumbnailUrl: string
): Promise<ActionResult<void>> {
  const user = await getCurrentDbUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const role = await getUserBoardRole(user.id, boardId);
  if (!role) return { success: false, error: "Access denied" };

  await db
    .update(boards)
    .set({ thumbnailUrl, updatedAt: new Date() })
    .where(eq(boards.id, boardId));

  return { success: true, data: undefined };
}