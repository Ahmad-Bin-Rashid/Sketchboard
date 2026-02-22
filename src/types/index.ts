/**
 * Shared TypeScript types used across the application.
 *
 * Naming conventions:
 * - Types/Interfaces: PascalCase (e.g., Board, TeamMember)
 * - Enums: PascalCase with PascalCase values
 * - DB row types are inferred from Drizzle schema (see @/lib/db/schema)
 */

// ─── User ────────────────────────────────────────────────────────────────────

export type UserRole = "owner" | "admin" | "editor" | "viewer";

export interface User {
  id: string;
  clerkId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  createdAt: Date;
}

// ─── Team ────────────────────────────────────────────────────────────────────

export interface Team {
  id: string;
  name: string;
  ownerId: string;
  tier: TierName;
  createdAt: Date;
}

export interface TeamMember {
  userId: string;
  teamId: string;
  role: UserRole;
  joinedAt: Date;
}

export type TierName = "free" | "pro" | "team";

// ─── Board ───────────────────────────────────────────────────────────────────

export interface Board {
  id: string;
  teamId: string;
  name: string;
  thumbnailUrl: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BoardWithMeta extends Board {
  /** Number of current active collaborators */
  activeUsers: number;
  /** User's permission on this board */
  userRole: UserRole;
}

// ─── Collaboration / Presence ────────────────────────────────────────────────

export interface CursorPresence {
  userId: string;
  name: string;
  avatarUrl: string | null;
  color: string;
  x: number;
  y: number;
}

export interface CollaboratorInfo {
  userId: string;
  name: string;
  avatarUrl: string | null;
  color: string;
  isActive: boolean;
}

/**
 * Connection status for the real-time sync layer.
 * Matches the ConnectionStatus type in @/lib/sync/connection.
 */
export type SyncConnectionStatus = "disconnected" | "connecting" | "connected";

// ─── API Responses ───────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

// ─── Action Results (Server Actions) ────────────────────────────────────────

export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };
