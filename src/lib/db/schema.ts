/**
 * Database schema definitions using Drizzle ORM.
 *
 * This is the single source of truth for all database tables.
 * Run `npm run db:generate` after changes, then `npm run db:migrate` to apply.
 *
 * Conventions:
 * - Table names: plural, snake_case (e.g., team_members)
 * - Column names: camelCase in code, snake_case in DB (Drizzle handles mapping)
 * - All tables have an `id` primary key (UUID)
 * - All tables have `createdAt` timestamps
 */

import {
  pgTable,
  text,
  timestamp,
  uuid,
  pgEnum,
  integer,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ───────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", [
  "owner",
  "admin",
  "editor",
  "viewer",
]);

export const tierEnum = pgEnum("tier", ["free", "pro", "team"]);

// ─── Users ───────────────────────────────────────────────────────────────────

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clerkId: text("clerk_id").notNull(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    avatarUrl: text("avatar_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("users_clerk_id_idx").on(table.clerkId),
    uniqueIndex("users_email_idx").on(table.email),
  ]
);

export const usersRelations = relations(users, ({ many }) => ({
  teamMembers: many(teamMembers),
  ownedTeams: many(teams),
  createdBoards: many(boards),
  favorites: many(favorites),
}));

// ─── Teams ───────────────────────────────────────────────────────────────────

export const teams = pgTable(
  "teams",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tier: tierEnum("tier").default("free").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("teams_owner_id_idx").on(table.ownerId),
  ]
);

export const teamsRelations = relations(teams, ({ one, many }) => ({
  owner: one(users, {
    fields: [teams.ownerId],
    references: [users.id],
  }),
  members: many(teamMembers),
  boards: many(boards),
}));

// ─── Team Members ────────────────────────────────────────────────────────────

export const teamMembers = pgTable(
  "team_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    role: userRoleEnum("role").default("editor").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("team_members_user_team_idx").on(table.userId, table.teamId),
    index("team_members_team_id_idx").on(table.teamId),
  ]
);

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
}));

// ─── Boards ──────────────────────────────────────────────────────────────────

export const boards = pgTable(
  "boards",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    name: text("name").notNull().default("Untitled Board"),
    /** Optional board description */
    description: text("description"),
    thumbnailUrl: text("thumbnail_url"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("boards_team_id_idx").on(table.teamId),
    index("boards_created_by_idx").on(table.createdBy),
    index("boards_updated_at_idx").on(table.updatedAt),
  ]
);

export const boardsRelations = relations(boards, ({ one, many }) => ({
  team: one(teams, {
    fields: [boards.teamId],
    references: [teams.id],
  }),
  creator: one(users, {
    fields: [boards.createdBy],
    references: [users.id],
  }),
  favorites: many(favorites),
}));

// ─── Board Snapshots (CRDT State Persistence) ───────────────────────────────

export const boardSnapshots = pgTable(
  "board_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    boardId: uuid("board_id")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    /** Serialized Yjs document state as base64 */
    state: text("state").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("board_snapshots_board_id_idx").on(table.boardId),
  ]
);

export const boardSnapshotsRelations = relations(boardSnapshots, ({ one }) => ({
  board: one(boards, {
    fields: [boardSnapshots.boardId],
    references: [boards.id],
  }),
}));

// ─── Board Assets (Uploaded Images) ─────────────────────────────────────────

export const boardAssets = pgTable(
  "board_assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    boardId: uuid("board_id")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    fileName: text("file_name").notNull(),
    fileSize: integer("file_size").notNull(), // bytes
    mimeType: text("mime_type").notNull(),
    uploadedBy: uuid("uploaded_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("board_assets_board_id_idx").on(table.boardId),
    index("board_assets_uploaded_by_idx").on(table.uploadedBy),
  ]
);

export const boardAssetsRelations = relations(boardAssets, ({ one }) => ({
  board: one(boards, {
    fields: [boardAssets.boardId],
    references: [boards.id],
  }),
  uploader: one(users, {
    fields: [boardAssets.uploadedBy],
    references: [users.id],
  }),
}));

// ─── Favorites ───────────────────────────────────────────────────────────────

export const favorites = pgTable(
  "favorites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    boardId: uuid("board_id")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("favorites_user_board_idx").on(table.userId, table.boardId),
    index("favorites_user_id_idx").on(table.userId),
  ]
);

export const favoritesRelations = relations(favorites, ({ one }) => ({
  user: one(users, {
    fields: [favorites.userId],
    references: [users.id],
  }),
  board: one(boards, {
    fields: [favorites.boardId],
    references: [boards.id],
  }),
}));

// ─── Type Exports ────────────────────────────────────────────────────────────
// Inferred types from schema for use in application code.

export type UserRow = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type TeamRow = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;

export type TeamMemberRow = typeof teamMembers.$inferSelect;
export type NewTeamMember = typeof teamMembers.$inferInsert;

export type BoardRow = typeof boards.$inferSelect;
export type NewBoard = typeof boards.$inferInsert;

export type BoardSnapshotRow = typeof boardSnapshots.$inferSelect;
export type NewBoardSnapshot = typeof boardSnapshots.$inferInsert;

export type BoardAssetRow = typeof boardAssets.$inferSelect;
export type NewBoardAsset = typeof boardAssets.$inferInsert;

export type FavoriteRow = typeof favorites.$inferSelect;
export type NewFavorite = typeof favorites.$inferInsert;
