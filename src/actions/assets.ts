/**
 * Asset server actions — storage quota tracking and asset lifecycle management.
 *
 * These actions are only called in auth mode (guest images are stored inline).
 * All operations are scoped to the authenticated user via Clerk.
 *
 * Storage model:
 * - Each upload is recorded in the `board_assets` table with its file size
 * - Quota is calculated as the sum of fileSize for all assets uploaded by the user
 * - Limit: 100MB per user (enforced before upload via checkUserStorageUsage)
 * - Deleting assets from tldraw removes them from the DB (soft-delete not needed)
 */

"use server";

import { auth } from "@clerk/nextjs/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { boardAssets, users } from "@/lib/db/schema";
import type { ActionResult } from "@/types";
import { TIERS } from "@/lib/constants";
import { UTApi } from "uploadthing/server";

const utapi = new UTApi();

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_STORAGE_BYTES = TIERS.FREE.maxStorageMB * 1024 * 1024; // 100MB in bytes

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RecordAssetInput {
  boardId: string;
  url: string;
  fileName: string;
  fileSize: number; // bytes
  mimeType: string;
}

export interface StorageUsage {
  usedBytes: number;
  maxBytes: number;
  usedMB: number;
  maxMB: number;
  percentUsed: number;
  hasCapacity: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Resolve the DB user ID from a Clerk user ID.
 * Returns null if the user hasn't been synced to the DB yet.
 */
async function getDbUserId(clerkId: string): Promise<string | null> {
  const user = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  return user[0]?.id ?? null;
}

// ─── Actions ─────────────────────────────────────────────────────────────────

/**
 * Get the current user's storage usage.
 * Used to display the storage bar in settings and to check quota before upload.
 */
export async function getStorageUsage(): Promise<ActionResult<StorageUsage>> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { success: false, error: "Not authenticated" };

  const dbUserId = await getDbUserId(clerkId);
  if (!dbUserId) return { success: false, error: "User not found in database" };

  const result = await db
    .select({ total: sql<number>`COALESCE(SUM(${boardAssets.fileSize}), 0)` })
    .from(boardAssets)
    .where(eq(boardAssets.uploadedBy, dbUserId));

  const usedBytes = Number(result[0]?.total ?? 0);
  const maxBytes = MAX_STORAGE_BYTES;

  return {
    success: true,
    data: {
      usedBytes,
      maxBytes,
      usedMB: Math.round((usedBytes / (1024 * 1024)) * 100) / 100,
      maxMB: TIERS.FREE.maxStorageMB,
      percentUsed: Math.min(100, (usedBytes / maxBytes) * 100),
      hasCapacity: usedBytes < maxBytes,
    },
  };
}

/**
 * Check if the user has enough storage capacity to upload a file.
 * Call this BEFORE starting the Uploadthing upload to prevent wasted uploads.
 *
 * @param fileSizeBytes - The size of the file being uploaded
 */
export async function checkUploadCapacity(
  fileSizeBytes: number
): Promise<ActionResult<{ hasCapacity: boolean; usedBytes: number; maxBytes: number }>> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { success: false, error: "Not authenticated" };

  const dbUserId = await getDbUserId(clerkId);
  if (!dbUserId) return { success: false, error: "User not found in database" };

  const result = await db
    .select({ total: sql<number>`COALESCE(SUM(${boardAssets.fileSize}), 0)` })
    .from(boardAssets)
    .where(eq(boardAssets.uploadedBy, dbUserId));

  const usedBytes = Number(result[0]?.total ?? 0);
  const hasCapacity = usedBytes + fileSizeBytes <= MAX_STORAGE_BYTES;

  return {
    success: true,
    data: { hasCapacity, usedBytes, maxBytes: MAX_STORAGE_BYTES },
  };
}

/**
 * Record a newly uploaded asset in the database.
 * Called after a successful Uploadthing upload completes.
 *
 * The boardId here is a string ID (can be the URL slug, which may differ from
 * the DB UUID in Phase 7+). For now it's stored as a string reference.
 */
export async function recordAsset(
  input: RecordAssetInput
): Promise<ActionResult<{ assetId: string }>> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { success: false, error: "Not authenticated" };

  const dbUserId = await getDbUserId(clerkId);
  if (!dbUserId) return { success: false, error: "User not found in database" };

  // Re-check capacity before recording (double-check, the pre-upload check may be stale)
  const capacityCheck = await checkUploadCapacity(input.fileSize);
  if (!capacityCheck.success || !capacityCheck.data.hasCapacity) {
    return {
      success: false,
      error: `Storage limit exceeded. You have used ${TIERS.FREE.maxStorageMB}MB of your ${TIERS.FREE.maxStorageMB}MB allowance.`,
    };
  }

  // Note: boardId here is the URL slug. In Phase 7+ this will be resolved to a UUID.
  // For now, we store a placeholder since the board may not exist in DB yet.
  // The actual FK constraint will be enforced once getOrCreateBoard is implemented.
  const [inserted] = await db
    .insert(boardAssets)
    .values({
      boardId: input.boardId as unknown as string, // cast: will be UUID in Phase 7
      url: input.url,
      fileName: input.fileName,
      fileSize: input.fileSize,
      mimeType: input.mimeType,
      uploadedBy: dbUserId,
    })
    .returning({ assetId: boardAssets.id });

  return { success: true, data: { assetId: inserted.assetId } };
}

/**
 * Remove asset records from the database when the user deletes images from the canvas.
 * This is called from the TLAssetStore.remove() callback.
 *
 * Note: This removes the DB record only; the CDN file remains (Uploadthing handles CDN TTL).
 */
export async function deleteAssets(
  assetUrls: string[]
): Promise<ActionResult<{ deleted: number }>> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { success: false, error: "Not authenticated" };

  const dbUserId = await getDbUserId(clerkId);
  if (!dbUserId) return { success: false, error: "User not found in database" };

  if (assetUrls.length === 0) return { success: true, data: { deleted: 0 } };

  // Only delete assets that belong to this user
  let deleted = 0;
  const keysToDelete: string[] = [];

  for (const url of assetUrls) {
    const result = await db
      .delete(boardAssets)
      .where(
        sql`${boardAssets.url} = ${url} AND ${boardAssets.uploadedBy} = ${dbUserId}`
      )
      .returning({ id: boardAssets.id, url: boardAssets.url });

    if (result.length > 0) {
      deleted += result.length;
      for (const row of result) {
        const key = row.url.split("/f/")[1] || row.url.substring(row.url.lastIndexOf("/") + 1);
        if (key) {
          keysToDelete.push(key);
        }
      }
    }
  }

  if (keysToDelete.length > 0) {
    try {
      await utapi.deleteFiles(keysToDelete);
    } catch (err) {
      console.error("[deleteAssets] Failed to delete files from Uploadthing:", err);
    }
  }

  return { success: true, data: { deleted } };
}

/**
 * Get all assets uploaded by the current user.
 */
export async function getUserAssets(): Promise<ActionResult<Array<typeof boardAssets.$inferSelect>>> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { success: false, error: "Not authenticated" };

  const dbUserId = await getDbUserId(clerkId);
  if (!dbUserId) return { success: false, error: "User not found in database" };

  const assets = await db
    .select()
    .from(boardAssets)
    .where(eq(boardAssets.uploadedBy, dbUserId))
    .orderBy(sql`${boardAssets.createdAt} DESC`);

  return { success: true, data: assets };
}

/**
 * Delete assets uploaded by guest users.
 */
export async function deleteGuestAssets(
  urls: string[]
): Promise<ActionResult<{ deleted: number }>> {
  const keysToDelete: string[] = [];

  for (const url of urls) {
    const key = url.split("/f/")[1] || url.substring(url.lastIndexOf("/") + 1);
    if (key) {
      keysToDelete.push(key);
    }
  }

  if (keysToDelete.length > 0) {
    try {
      await utapi.deleteFiles(keysToDelete);
    } catch (err) {
      console.error("[deleteGuestAssets] Failed to delete files from Uploadthing:", err);
    }
  }

  return { success: true, data: { deleted: keysToDelete.length } };
}
