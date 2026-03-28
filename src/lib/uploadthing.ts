/**
 * Uploadthing client helpers — typed wrappers generated from the file router.
 *
 * Import `useUploadThing` from this file (NOT from "@uploadthing/react" directly)
 * to get fully typed hooks bound to our specific endpoints.
 *
 * Usage:
 * ```ts
 * const { startUpload, isUploading } = useUploadThing("boardImage", {
 *   onClientUploadComplete: (files) => console.log(files),
 *   onUploadError: (error) => console.error(error),
 * });
 * ```
 */

import { generateReactHelpers } from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/core";

export const { useUploadThing, uploadFiles } = generateReactHelpers<OurFileRouter>();
