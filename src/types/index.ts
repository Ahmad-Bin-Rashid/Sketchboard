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
  /** Unique awareness client ID (unique per connection, unlike userId) */
  clientId: number;
  userId: string;
  name: string;
  avatarUrl: string | null;
  color: string;
  x: number;
  y: number;
}

export interface CollaboratorInfo {
  /** Unique awareness client ID (unique per connection, unlike userId) */
  clientId: number;
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

// ─── Dashboard Types ─────────────────────────────────────────────────────────

/** Board enriched with computed fields for dashboard display */
export interface BoardWithDetails {
  id: string;
  teamId: string;
  name: string;
  description: string | null;
  thumbnailUrl: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  /** Whether the current user has favorited this board */
  isFavorite: boolean;
  /** Creator's display name */
  creatorName: string;
  /** User's role on the board's team */
  userRole: UserRole;
}

/** Team with member count for display in sidebar / settings */
export interface TeamWithCounts {
  id: string;
  name: string;
  ownerId: string;
  tier: TierName;
  createdAt: Date;
  memberCount: number;
  boardCount: number;
  /** Whether this is the user's personal team (auto-created) */
  isPersonal: boolean;
}

/** Team member with user details for the settings member list */
export interface TeamMemberWithUser {
  id: string;
  userId: string;
  teamId: string;
  role: UserRole;
  joinedAt: Date;
  user: {
    name: string;
    email: string;
    avatarUrl: string | null;
  };
}

export * from "./whiteboard";

