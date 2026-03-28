"use client";

/**
 * useAssetStore — returns a TLAssetStore for the tldraw canvas.
 *
 * tldraw's TLAssetStore interface has three methods:
 *   - upload(asset, file)  → store the file, return a URL
 *   - resolve(asset, ctx)  → return the URL to display the asset
 *   - remove(assetIds)     → clean up when user deletes an image
 *
 * This hook adapts those calls to our two storage backends:
 *
 * GUEST MODE:
 *   - upload()  → convert File to base64 data URL (stays in memory / localStorage)
 *   - resolve() → return asset.props.src as-is (already a data URL)
 *   - remove()  → no-op (in-memory, nothing to clean up)
 *
 * AUTH MODE:
 *   - upload()  → check quota → upload to Uploadthing CDN → record in DB
 *   - resolve() → return CDN URL (already in asset.props.src)
 *   - remove()  → remove asset record from DB
 *
 * Usage:
 * ```tsx
 * const assetStore = useAssetStore({ mode, boardId, onUploadStart, onUploadComplete, onUploadError });
 * <Tldraw assets={assetStore} ... />
 * ```
 */

import { useCallback, useRef } from "react";
import type { TLAsset, TLAssetStore } from "tldraw";
import type { WhiteboardMode } from "@/hooks/use-yjs-sync";
import { uploadFiles } from "@/lib/uploadthing";
import { checkUploadCapacity, recordAsset, deleteAssets } from "@/actions/assets";
import { UPLOAD } from "@/lib/constants";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UploadCallbacks {
  /** Called when an upload begins. Passes fileName for toast display. */
  onUploadStart?: (id: string, fileName: string) => void;
  /** Called with progress updates (0–100). */
  onUploadProgress?: (id: string, progress: number) => void;
  /** Called when the upload succeeds. Passes the CDN URL. */
  onUploadComplete?: (id: string, url: string) => void;
  /** Called when the upload fails. Passes the error message. */
  onUploadError?: (id: string, error: string) => void;
}

interface UseAssetStoreOptions extends UploadCallbacks {
  mode: WhiteboardMode;
  boardId: string;
}

// ─── Guest: base64 conversion ────────────────────────────────────────────────

/**
 * Convert a File to a base64 data URL.
 * Used in guest mode so images are self-contained in the tldraw store.
 */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

// ─── Validate file ───────────────────────────────────────────────────────────

function validateImageFile(file: File): string | null {
  if (!UPLOAD.ACCEPTED_IMAGE_TYPES.includes(file.type as typeof UPLOAD.ACCEPTED_IMAGE_TYPES[number])) {
    return `Unsupported file type: ${file.type}. Accepted: PNG, JPEG, WebP, SVG.`;
  }
  if (file.size > UPLOAD.MAX_FILE_SIZE_MB * 1024 * 1024) {
    return `File too large: ${(file.size / (1024 * 1024)).toFixed(1)}MB. Max: ${UPLOAD.MAX_FILE_SIZE_MB}MB.`;
  }
  return null;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAssetStore({
  mode,
  boardId,
  onUploadStart,
  onUploadProgress,
  onUploadComplete,
  onUploadError,
}: UseAssetStoreOptions): TLAssetStore {
  // Use a stable ref for the callbacks to avoid recreating the store object
  // every time the parent re-renders with new callback references
  const callbacksRef = useRef<UploadCallbacks>({
    onUploadStart,
    onUploadProgress,
    onUploadComplete,
    onUploadError,
  });
  callbacksRef.current = { onUploadStart, onUploadProgress, onUploadComplete, onUploadError };

  const modeRef = useRef(mode);
  modeRef.current = mode;

  const boardIdRef = useRef(boardId);
  boardIdRef.current = boardId;

  /**
   * upload() — called by tldraw when the user drops/pastes an image.
   *
   * Returns { src: string } where src is either:
   * - A base64 data URL (guest mode)
   * - A Uploadthing CDN URL (auth mode)
   */
  const upload = useCallback(
    async (asset: TLAsset, file: File): Promise<{ src: string }> => {
      const uploadId = asset.id;
      const { onUploadStart: start, onUploadProgress: progress, onUploadComplete: complete, onUploadError: error } = callbacksRef.current;

      // ── Validate ──────────────────────────────────────────────────────
      const validationError = validateImageFile(file);
      if (validationError) {
        error?.(uploadId, validationError);
        throw new Error(validationError);
      }

      // ── Guest mode: base64 inline ──────────────────────────────────────
      if (modeRef.current === "guest") {
        start?.(uploadId, file.name);
        progress?.(uploadId, 50);
        try {
          const dataUrl = await fileToDataUrl(file);
          progress?.(uploadId, 100);
          complete?.(uploadId, dataUrl);
          return { src: dataUrl };
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Failed to process image";
          error?.(uploadId, msg);
          throw err;
        }
      }

      // ── Auth mode: Uploadthing CDN ─────────────────────────────────────

      // 1. Pre-flight: check storage quota
      const capacityCheck = await checkUploadCapacity(file.size);
      if (!capacityCheck.success || !capacityCheck.data?.hasCapacity) {
        const msg = capacityCheck.success
          ? "Storage limit reached (100MB). Delete some images to free up space."
          : (capacityCheck.error ?? "Could not check storage quota.");
        error?.(uploadId, msg);
        throw new Error(msg);
      }

      // 2. Start upload notification
      start?.(uploadId, file.name);
      progress?.(uploadId, 10);

      try {
        // 3. Upload to Uploadthing
        const uploaded = await uploadFiles("boardImage", {
          files: [file],
          onUploadProgress: ({ progress: pct }) => {
            // Uploadthing progress is 0-100 for the whole batch;
            // map it to 10-90% range to leave room for DB write
            progress?.(uploadId, Math.round(10 + (pct * 0.8)));
          },
        });

        const uploadedFile = uploaded[0];
        if (!uploadedFile?.ufsUrl) {
          throw new Error("Upload succeeded but no URL was returned");
        }

        const cdnUrl = uploadedFile.ufsUrl;
        progress?.(uploadId, 95);

        // 4. Record asset in DB (fire-and-forget, don't block tldraw)
        recordAsset({
          boardId: boardIdRef.current,
          url: cdnUrl,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
        }).catch((err) => {
          console.warn("[useAssetStore] Failed to record asset in DB:", err);
        });

        progress?.(uploadId, 100);
        complete?.(uploadId, cdnUrl);

        return { src: cdnUrl };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        error?.(uploadId, msg);
        throw err;
      }
    },
    [] // no deps — everything accessed via refs
  );

  /**
   * resolve() — called by tldraw when rendering an image on the canvas.
   *
   * For both modes, the src is already correct (data URL or CDN URL).
   * We return it as-is; tldraw will use it as the <img> src.
   */
  const resolve = useCallback((asset: TLAsset): string | null => {
    if (!asset.props || !("src" in asset.props)) return null;
    return (asset.props.src as string) ?? null;
  }, []);

  /**
   * remove() — called by tldraw when the user deletes an image from the canvas.
   *
   * Guest mode: no-op (in-memory data URL, GC handles it)
   * Auth mode: remove the DB record (CDN file has its own TTL)
   */
  const remove = useCallback(async (assetIds: readonly string[]): Promise<void> => {
    if (modeRef.current !== "auth" || assetIds.length === 0) return;

    // We don't have the URLs at this point, only tldraw asset IDs.
    // In Phase 8 we can look these up; for now, log for observability.
    console.log("[useAssetStore] Assets removed from canvas:", assetIds);
    // deleteAssets() takes URLs; this will be wired in Phase 8
    // when we have the URL-to-assetId mapping available.
  }, []);

  return { upload, resolve, remove };
}
