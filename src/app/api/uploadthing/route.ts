/**
 * Uploadthing route handler — wires the file router to the Next.js API.
 *
 * This creates GET and POST handlers at /api/uploadthing.
 * GET is used by the Uploadthing client for presigned URL generation.
 * POST is used for actual file uploads.
 */

import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "./core";

export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
});
