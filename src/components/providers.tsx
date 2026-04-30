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
import { ThemeProvider, useTheme } from "./theme-provider";
import { dark } from "@clerk/themes";

interface ProvidersProps {
  children: React.ReactNode;
}

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

function ClerkProviderWrapper({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();

  // Skip ClerkProvider if no valid key is configured (allows build to pass)
  if (!clerkKey || clerkKey.includes("placeholder")) {
    return <>{children}</>;
  }

  return (
    <ClerkProvider
      afterSignOutUrl="/"
      appearance={{
        baseTheme: resolvedTheme === "dark" ? dark : undefined,
        variables: {
          colorPrimary: "#5b8a72",
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider>
      <ClerkProviderWrapper>{children}</ClerkProviderWrapper>
    </ThemeProvider>
  );
}
