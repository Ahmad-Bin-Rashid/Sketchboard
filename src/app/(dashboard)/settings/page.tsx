import type { Metadata } from "next";
import { User, Users, CreditCard } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Settings",
};

/**
 * Settings page — user/team settings.
 * Phase 7-8 will add team management, billing, and profile editing.
 */
export default function SettingsPage() {
  return (
    <div className="px-8 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Manage your account and team settings
        </p>
      </div>

      <div className="max-w-2xl space-y-4">
        <SettingsCard
          icon={<User className="h-4 w-4" />}
          title="Profile"
          description="Your profile is managed through your authentication provider. Click your avatar in the sidebar to update."
        />

        <SettingsCard
          icon={<Users className="h-4 w-4" />}
          title="Team"
          description="Invite team members, manage roles, and organize your workspace. Coming soon."
          comingSoon
        />

        <SettingsCard
          icon={<CreditCard className="h-4 w-4" />}
          title="Billing"
          description="Manage your subscription, view usage, and update payment methods. Coming soon."
          comingSoon
        />
      </div>
    </div>
  );
}

function SettingsCard({
  icon,
  title,
  description,
  comingSoon,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  comingSoon?: boolean;
}) {
  return (
    <div className="animate-fade-in rounded-xl border border-card-border bg-card p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-light text-primary">
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">{title}</h2>
            {comingSoon && (
              <span className="rounded-full bg-secondary-light px-2 py-0.5 text-[10px] font-medium text-secondary">
                Coming soon
              </span>
            )}
          </div>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
