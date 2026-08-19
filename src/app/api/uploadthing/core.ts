/**
 * Uploadthing file router — the server-side endpoint for image uploads.
 *
 * Defines which file types and sizes are accepted, and applies Clerk auth
 * so only logged-in users can upload (auth-gated CDN uploads).
 *
 * Guest users never hit this endpoint — their images are stored inline as
 * base64 data URLs inside the tldraw store (handled client-side in assets.ts).
 *
 * Endpoint: POST /api/uploadthing
 *
 * Accepted types: PNG, JPEG, WebP, SVG
 * Max size per file: 10MB
 * Auth: Clerk session required (401 if not authenticated)
 */

import { createUploadthing, type FileRouter } from "uploadthing/next";
import { auth } from "@clerk/nextjs/server";

const f = createUploadthing();

/**
 * Our file router. Each key is a named upload endpoint.
 * The "boardImage" endpoint is used for all image uploads from the canvas.
 */
export const ourFileRouter = {
  /**
   * boardImage — handles image uploads for the canvas.
   *
   * Called when a user drags/pastes an image onto the tldraw canvas in auth mode.
   * Returns a CDN URL which is stored as the asset's `src` property in tldraw.
   */
  boardImage: f({
    image: {
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
    video: {
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
  })
    .middleware(async () => {
      const { userId } = await auth();

      if (!userId) {
        throw new Error("Unauthorized: must be signed in to upload images");
      }

      // Pass userId to onUploadComplete so we can record the asset
      return { userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // Return data back to the client (available in clientCallbacks)
      return {
        uploadedBy: metadata.userId,
        url: file.ufsUrl,
        fileName: file.name,
        fileSize: file.size,
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
