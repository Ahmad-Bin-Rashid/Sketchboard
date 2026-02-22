/**
 * Auth layout — centered, minimal layout for sign-in/sign-up pages.
 * Uses Clerk's route group pattern: (auth) is not part of the URL.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      {children}
    </div>
  );
}
