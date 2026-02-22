"use client";

/**
 * Client-side providers that wrap the entire application.
 *
 * Add new providers here instead of nesting them in layout.tsx.
 * This keeps the root layout clean and makes provider management centralized.
 *
 * Current providers:
 * - ClerkProvider: Authentication state
 *
 * Future providers to add here:
 * - ThemeProvider (dark mode)
 * - ToastProvider (notifications)
 * - ModalProvider (global modals)
 */

import { ClerkProvider } from "@clerk/nextjs";

interface ProvidersProps {
  children: React.ReactNode;
}

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export function Providers({ children }: ProvidersProps) {
  // Skip ClerkProvider if no valid key is configured (allows build to pass)
  if (!clerkKey || clerkKey.includes("placeholder")) {
    return <>{children}</>;
  }

  return (
    <ClerkProvider afterSignOutUrl="/">
      {children}
    </ClerkProvider>
  );
}
