"use client";

/**
 * SettingsClient — interactive settings sections for workspace and storage.
 *
 * Handles:
 * - Workspace: invite member by email, list members with role badges, remove self
 * - Storage: usage bar (used MB / 100MB)
 *
 * Team rename is omitted for the personal team (it's always "Personal").
 */

import { useState, useTransition } from "react";
import { HardDrive, Users, Mail, Loader2, X, UserMinus } from "lucide-react";
import { cn } from "@/lib/utils";
import { inviteMember, removeMember } from "@/actions/team";
import type { TeamMemberWithUser, UserRole } from "@/types";

// ─── Types ───────────────────────────────────────────────────────────────────

interface StorageSummary {
  usedMB: number;
  maxMB: number;
  percentUsed: number;
}

interface SettingsClientProps {
  teamId: string;
  initialMembers: TeamMemberWithUser[];
  storage: StorageSummary;
}

// ─── Role badge ───────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: UserRole }) {
  const styles: Record<UserRole, string> = {
    owner: "bg-primary-light text-primary",
    admin: "bg-secondary-light text-secondary",
    editor: "bg-surface text-muted-foreground",
    viewer: "bg-surface text-muted-foreground",
  };
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium capitalize", styles[role])}>
      {role}
    </span>
  );
}

// ─── Member row ───────────────────────────────────────────────────────────────

function MemberRow({
  member,
  onRemove,
  canRemove,
  isRemoving,
}: {
  member: TeamMemberWithUser;
  onRemove: () => void;
  canRemove: boolean;
  isRemoving: boolean;
}) {
  const initials = member.user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex items-center gap-3 py-3">
      {/* Avatar */}
      {member.user.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={member.user.avatarUrl}
          alt={member.user.name}
          className="h-8 w-8 flex-shrink-0 rounded-full object-cover"
        />
      ) : (
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-light text-xs font-semibold text-primary">
          {initials}
        </div>
      )}

      {/* User info */}
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium">{member.user.name}</p>
        <p className="truncate text-xs text-muted-foreground">{member.user.email}</p>
      </div>

      {/* Role */}
      <RoleBadge role={member.role} />

      {/* Remove */}
      {canRemove && (
        <button
          onClick={onRemove}
          disabled={isRemoving}
          className="ml-1 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
          title="Remove member"
          aria-label={`Remove ${member.user.name}`}
        >
          {isRemoving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <UserMinus className="h-3.5 w-3.5" />
          )}
        </button>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SettingsClient({
  teamId,
  initialMembers,
  storage,
}: SettingsClientProps) {
  const [members, setMembers] = useState(initialMembers);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [isPendingInvite, startInviteTransition] = useTransition();
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Find current user (the owner) to determine permissions
  const currentUserId = members.find((m) => m.role === "owner")?.userId;

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;

    setInviteError(null);
    setInviteSuccess(false);

    startInviteTransition(async () => {
      const result = await inviteMember(teamId, email);
      if (result.success) {
        setInviteEmail("");
        setInviteSuccess(true);
        // We can't easily update the members list without a refetch,
        // so just show a success message — the page will update on next load
      } else {
        setInviteError(result.error);
      }
    });
  };

  const handleRemove = async (member: TeamMemberWithUser) => {
    setRemovingId(member.userId);
    const result = await removeMember(teamId, member.userId);
    if (result.success) {
      setMembers((prev) => prev.filter((m) => m.userId !== member.userId));
    }
    setRemovingId(null);
  };

  const storagePercent = Math.min(100, storage.percentUsed);
  const storageColor =
    storagePercent > 90
      ? "bg-destructive"
      : storagePercent > 70
      ? "bg-amber-500"
      : "bg-primary";

  return (
    <>
      {/* Workspace / Team Members */}
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Workspace Members
        </h2>
        <div className="rounded-2xl border border-card-border bg-card p-5">
          {/* Invite form */}
          <form onSubmit={handleInvite} className="mb-4">
            <p className="mb-2 text-xs text-muted-foreground">
              Invite a team member by their SketchBoard account email:
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => {
                    setInviteEmail(e.target.value);
                    setInviteError(null);
                    setInviteSuccess(false);
                  }}
                  placeholder="colleague@example.com"
                  className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  disabled={isPendingInvite}
                />
              </div>
              <button
                type="submit"
                disabled={isPendingInvite || !inviteEmail.trim()}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
              >
                {isPendingInvite ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  "Invite"
                )}
              </button>
            </div>
            {inviteError && (
              <p className="mt-1.5 text-xs text-destructive">{inviteError}</p>
            )}
            {inviteSuccess && (
              <p className="mt-1.5 text-xs text-green-600">
                Invitation sent successfully!
              </p>
            )}
          </form>

          {/* Members list */}
          <div className="divide-y divide-border">
            {members.map((member) => {
              const isOwner = member.role === "owner";
              const canRemove = !isOwner;

              return (
                <MemberRow
                  key={member.userId}
                  member={member}
                  onRemove={() => handleRemove(member)}
                  canRemove={canRemove}
                  isRemoving={removingId === member.userId}
                />
              );
            })}
          </div>

          {members.length === 0 && (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>No team members yet</span>
            </div>
          )}
        </div>
      </section>

      {/* Storage usage */}
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Storage
        </h2>
        <div className="rounded-2xl border border-card-border bg-card p-5">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-light">
              <HardDrive className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Image Storage</p>
              <p className="text-xs text-muted-foreground">
                Used by images uploaded to your boards
              </p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-sm font-semibold">
                {storage.usedMB.toFixed(1)} MB
              </p>
              <p className="text-xs text-muted-foreground">
                of {storage.maxMB} MB
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                storageColor
              )}
              style={{ width: `${storagePercent}%` }}
            />
          </div>

          <p className="mt-2 text-xs text-muted-foreground">
            {storagePercent < 80
              ? `${(storage.maxMB - storage.usedMB).toFixed(1)} MB remaining`
              : storagePercent >= 100
              ? "Storage limit reached — delete images to free up space"
              : "Storage almost full"}
          </p>
        </div>
      </section>
    </>
  );
}
