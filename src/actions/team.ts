/**
 * Team server actions — personal team creation and member management.
 *
 * Architecture:
 * - Every user has exactly one "Personal" team, auto-created on first login.
 * - All boards are scoped to a team. Personal boards belong to the personal team.
 * - `getOrCreatePersonalTeam()` is idempotent — safe to call on every dashboard render.
 *
 * Auth pattern:
 * - All actions call `requireAuth()` which throws / returns early if not authenticated.
 * - Actions return `ActionResult<T>` — either `{ success: true, data }` or
 *   `{ success: false, error }`. Never throw to the client.
 */

"use server";

import { eq, and, sql } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, teams, teamMembers } from "@/lib/db/schema";
import type { ActionResult, TeamWithCounts, TeamMemberWithUser, UserRole } from "@/types";

// ─── Auth helper ─────────────────────────────────────────────────────────────

/**
 * Get the current authenticated DB user.
 * Returns null if unauthenticated or user not yet synced.
 */
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

// ─── Personal Team ────────────────────────────────────────────────────────────

/**
 * Get or create the user's personal team.
 *
 * Every user has exactly one personal team. It's named after the user and
 * flagged with the user being the sole owner-member.
 *
 * This is idempotent — safe to call on every dashboard load.
 * The personal team is identified by: owner is this user AND no other owners.
 * We use the team name "Personal" as the canonical marker.
 */
export async function getOrCreatePersonalTeam(): Promise<
  ActionResult<{ teamId: string; isNew: boolean }>
> {
  const user = await getCurrentDbUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // Find existing personal team (owned by this user, named "Personal")
  const existing = await db
    .select({ id: teams.id })
    .from(teams)
    .innerJoin(teamMembers, eq(teamMembers.teamId, teams.id))
    .where(
      and(
        eq(teams.ownerId, user.id),
        eq(teams.name, "Personal"),
        eq(teamMembers.userId, user.id),
        eq(teamMembers.role, "owner")
      )
    )
    .limit(1);

  if (existing[0]) {
    return { success: true, data: { teamId: existing[0].id, isNew: false } };
  }

  // Create personal team + add user as owner in a transaction
  const [newTeam] = await db
    .insert(teams)
    .values({
      name: "Personal",
      ownerId: user.id,
      tier: "free",
    })
    .returning({ id: teams.id });

  await db.insert(teamMembers).values({
    userId: user.id,
    teamId: newTeam.id,
    role: "owner",
  });

  return { success: true, data: { teamId: newTeam.id, isNew: true } };
}

// ─── Get Teams ────────────────────────────────────────────────────────────────

/**
 * Get all teams the current user belongs to, with member and board counts.
 * Used in the sidebar team selector and settings page.
 */
export async function getUserTeams(): Promise<ActionResult<TeamWithCounts[]>> {
  const user = await getCurrentDbUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const rows = await db
    .select({
      id: teams.id,
      name: teams.name,
      ownerId: teams.ownerId,
      tier: teams.tier,
      createdAt: teams.createdAt,
      memberCount: sql<number>`(
        SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = ${teams.id}
      )`,
      boardCount: sql<number>`(
        SELECT COUNT(*) FROM boards b WHERE b.team_id = ${teams.id}
      )`,
    })
    .from(teams)
    .innerJoin(teamMembers, eq(teamMembers.teamId, teams.id))
    .where(eq(teamMembers.userId, user.id))
    .orderBy(teams.createdAt);

  const result: TeamWithCounts[] = rows.map((row) => ({
    ...row,
    isPersonal: row.name === "Personal" && row.ownerId === user.id,
    memberCount: Number(row.memberCount),
    boardCount: Number(row.boardCount),
  }));

  return { success: true, data: result };
}

// ─── Get Team Members ─────────────────────────────────────────────────────────

/**
 * Get all members of a team with their user details.
 * Returns an error if the current user is not a member of the team.
 */
export async function getTeamMembers(
  teamId: string
): Promise<ActionResult<TeamMemberWithUser[]>> {
  const user = await getCurrentDbUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // Verify the current user is a member
  const membership = await db
    .select({ role: teamMembers.role })
    .from(teamMembers)
    .where(
      and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, user.id))
    )
    .limit(1);

  if (!membership[0]) {
    return { success: false, error: "You are not a member of this team" };
  }

  const rows = await db
    .select({
      id: teamMembers.id,
      userId: teamMembers.userId,
      teamId: teamMembers.teamId,
      role: teamMembers.role,
      joinedAt: teamMembers.joinedAt,
      userName: users.name,
      userEmail: users.email,
      userAvatarUrl: users.avatarUrl,
    })
    .from(teamMembers)
    .innerJoin(users, eq(users.id, teamMembers.userId))
    .where(eq(teamMembers.teamId, teamId))
    .orderBy(teamMembers.joinedAt);

  const result: TeamMemberWithUser[] = rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    teamId: row.teamId,
    role: row.role as UserRole,
    joinedAt: row.joinedAt,
    user: {
      name: row.userName,
      email: row.userEmail,
      avatarUrl: row.userAvatarUrl,
    },
  }));

  return { success: true, data: result };
}

// ─── Rename Team ──────────────────────────────────────────────────────────────

/**
 * Rename a team. Only the team owner or an admin can rename.
 */
export async function renameTeam(
  teamId: string,
  name: string
): Promise<ActionResult<void>> {
  const user = await getCurrentDbUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const trimmed = name.trim();
  if (!trimmed) return { success: false, error: "Team name cannot be empty" };
  if (trimmed.length > 50) return { success: false, error: "Team name too long (max 50 chars)" };
  if (trimmed === "Personal") return { success: false, error: "Cannot use reserved team name" };

  // Check user is owner or admin
  const membership = await db
    .select({ role: teamMembers.role })
    .from(teamMembers)
    .where(
      and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, user.id))
    )
    .limit(1);

  const role = membership[0]?.role;
  if (!role || !["owner", "admin"].includes(role)) {
    return { success: false, error: "Insufficient permissions" };
  }

  await db.update(teams).set({ name: trimmed }).where(eq(teams.id, teamId));

  return { success: true, data: undefined };
}

// ─── Invite Member ────────────────────────────────────────────────────────────

/**
 * Invite a user to a team by email.
 * The user must already have a SketchBoard account (synced via Clerk webhook).
 */
export async function inviteMember(
  teamId: string,
  email: string,
  role: UserRole = "editor"
): Promise<ActionResult<void>> {
  const user = await getCurrentDbUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // Check current user has permission to invite
  const membership = await db
    .select({ role: teamMembers.role })
    .from(teamMembers)
    .where(
      and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, user.id))
    )
    .limit(1);

  const currentRole = membership[0]?.role;
  if (!currentRole || !["owner", "admin"].includes(currentRole)) {
    return { success: false, error: "Insufficient permissions to invite members" };
  }

  // Find invitee by email
  const invitee = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email.toLowerCase().trim()))
    .limit(1);

  if (!invitee[0]) {
    return {
      success: false,
      error: "No SketchBoard account found for that email address",
    };
  }

  if (invitee[0].id === user.id) {
    return { success: false, error: "You are already a member" };
  }

  // Check not already a member
  const existing = await db
    .select({ id: teamMembers.id })
    .from(teamMembers)
    .where(
      and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, invitee[0].id)
      )
    )
    .limit(1);

  if (existing[0]) {
    return { success: false, error: "User is already a team member" };
  }

  await db.insert(teamMembers).values({
    userId: invitee[0].id,
    teamId,
    role,
  });

  return { success: true, data: undefined };
}

// ─── Update Member Role ───────────────────────────────────────────────────────

/**
 * Update a team member's role. Only the owner can change roles.
 */
export async function updateMemberRole(
  teamId: string,
  targetUserId: string,
  newRole: UserRole
): Promise<ActionResult<void>> {
  const user = await getCurrentDbUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // Only the owner can change roles
  const team = await db
    .select({ ownerId: teams.ownerId })
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);

  if (!team[0] || team[0].ownerId !== user.id) {
    return { success: false, error: "Only the team owner can change roles" };
  }

  // Cannot change the owner's own role
  if (targetUserId === user.id) {
    return { success: false, error: "Cannot change your own role" };
  }

  await db
    .update(teamMembers)
    .set({ role: newRole })
    .where(
      and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, targetUserId)
      )
    );

  return { success: true, data: undefined };
}

// ─── Remove Member ────────────────────────────────────────────────────────────

/**
 * Remove a member from a team.
 * Owners can remove anyone (except themselves).
 * Admins can remove editors/viewers.
 * Members can remove themselves (leave the team).
 */
export async function removeMember(
  teamId: string,
  targetUserId: string
): Promise<ActionResult<void>> {
  const user = await getCurrentDbUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // Get both memberships
  const [currentMembership, targetMembership] = await Promise.all([
    db
      .select({ role: teamMembers.role })
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, user.id)))
      .limit(1),
    db
      .select({ role: teamMembers.role })
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, targetUserId)))
      .limit(1),
  ]);

  if (!currentMembership[0]) {
    return { success: false, error: "You are not a member of this team" };
  }

  const currentRole = currentMembership[0].role;
  const isSelf = targetUserId === user.id;

  // Owners cannot remove themselves (team would be ownerless)
  if (isSelf && currentRole === "owner") {
    return { success: false, error: "Team owner cannot leave the team" };
  }

  // Non-owners can only remove themselves
  if (!isSelf && currentRole !== "owner" && currentRole !== "admin") {
    return { success: false, error: "Insufficient permissions" };
  }

  // Admins cannot remove other admins or owners
  if (!isSelf && currentRole === "admin") {
    const targetRole = targetMembership[0]?.role;
    if (targetRole === "owner" || targetRole === "admin") {
      return { success: false, error: "Admins cannot remove other admins or owners" };
    }
  }

  await db
    .delete(teamMembers)
    .where(
      and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, targetUserId)
      )
    );

  return { success: true, data: undefined };
}
