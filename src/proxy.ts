/**
 * Next.js proxy (middleware) for authentication and route protection.
 *
 * Uses Clerk's middleware to:
 * - Protect /dashboard/* and /settings/* routes (require sign-in)
 * - Allow public access to /, /sign-in, /sign-up, /api/webhooks/*, /board/*
 *
 * Note: /board/* is public at the proxy level; page-level auth checks
 * will be added in Phase 7 when board access control is implemented.
 */

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
  "/api/liveblocks-auth",  // must be public — called by guests with no Clerk session
  "/api/uploadthing",      // Uploadthing handles its own auth
  "/board(.*)",
]);

// If Clerk isn't configured, pass all requests through
function passthroughMiddleware(request: NextRequest) {
  return NextResponse.next();
}

const authMiddleware = clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export default !clerkKey || clerkKey.includes("placeholder")
  ? passthroughMiddleware
  : authMiddleware;

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
