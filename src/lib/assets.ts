"use client";

import { useCallback, useRef, useMemo } from "react";
import type { WhiteboardMode } from "@/hooks/use-yjs-sync";
import { uploadFiles } from "@/lib/uploadthing";
import { checkUploadCapacity, recordAsset, deleteAssets } from "@/actions/assets";
import { UPLOAD } from "@/lib/constants";
import { nanoid } from "nanoid";
import { useWhiteboardStore } from "@/store/whiteboard-store";

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

export interface AssetStore {
  uploadMedia: (file: File, id?: string) => Promise<string>;
  deleteMedia: (urls: string[]) => Promise<void>;
}

// ─── Guest: base64 conversion ────────────────────────────────────────────────

/**
 * Convert a File to a base64 data URL.
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
  if (!UPLOAD.ACCEPTED_IMAGE_TYPES.includes(file.type as any)) {
    return `Unsupported file type: ${file.type}. Accepted: PNG, JPEG, WebP, SVG, MP4, WebM, OGG.`;
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
}: UseAssetStoreOptions): AssetStore {
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
   * uploadMedia() — upload a media file, returns the image URL.
   */
  const uploadMedia = useCallback(
    async (file: File, customId?: string): Promise<string> => {
      const uploadId = customId || nanoid();
      const { onUploadStart: start, onUploadProgress: progress, onUploadComplete: complete, onUploadError: error } = callbacksRef.current;

      // ── Validate ──────────────────────────────────────────────────────
      const validationError = validateImageFile(file);
      if (validationError) {
        error?.(uploadId, validationError);
        throw new Error(validationError);
      }

      // ── Guest mode: base64 inline ──────────────────────────────────────
      if (modeRef.current === "guest") {
        const limitBytes = 5 * 1024 * 1024; // 5MB limit for guest users
        const shapes = useWhiteboardStore.getState().shapes;
        const currentMediaSize = Object.values(shapes)
          .filter((s) => s.type === "image")
          .reduce((acc, s) => acc + ((s as any).fileSize || 0), 0);

        if (currentMediaSize + file.size > limitBytes) {
          const msg = `Upload limit exceeded: 5MB maximum limit for guest users. Please delete some existing media to free up space.`;
          error?.(uploadId, msg);
          throw new Error(msg);
        }

        start?.(uploadId, file.name);
        progress?.(uploadId, 30);
        try {
          const dataUrl = await fileToDataUrl(file);
          progress?.(uploadId, 70);

          const localListStr = localStorage.getItem("sketchboard-local-media-list");
          const localList = localListStr ? JSON.parse(localListStr) : [];

          const metadata = {
            id: uploadId,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            createdAt: new Date().toISOString(),
            boardId: boardIdRef.current,
          };

          localList.push(metadata);
          localStorage.setItem("sketchboard-local-media-list", JSON.stringify(localList));
          localStorage.setItem(`sketchboard-local-media-data-${uploadId}`, dataUrl);

          progress?.(uploadId, 100);
          
          const localRefUrl = `local://${uploadId}`;
          complete?.(uploadId, localRefUrl);
          return localRefUrl;
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
        // Fallback to local storage
        try {
          const limitBytes = UPLOAD.MAX_LOCAL_STORAGE_MB * 1024 * 1024;
          const localListStr = localStorage.getItem("sketchboard-local-media-list");
          const localList = localListStr ? JSON.parse(localListStr) : [];
          const currentLocalUsage = localList.reduce((acc: number, item: any) => acc + (item.fileSize || 0), 0);

          if (currentLocalUsage + file.size > limitBytes) {
            const msg = `Storage limit reached: Cloud Vault is full (20MB) and Local Storage (5MB limit) is full. No more media can be saved.`;
            error?.(uploadId, msg);
            throw new Error(msg);
          }

          // Save locally
          start?.(uploadId, file.name);
          progress?.(uploadId, 30);
          const dataUrl = await fileToDataUrl(file);
          progress?.(uploadId, 70);

          const metadata = {
            id: uploadId,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            createdAt: new Date().toISOString(),
            boardId: boardIdRef.current,
          };

          localList.push(metadata);
          localStorage.setItem("sketchboard-local-media-list", JSON.stringify(localList));
          localStorage.setItem(`sketchboard-local-media-data-${uploadId}`, dataUrl);

          progress?.(uploadId, 100);
          complete?.(uploadId, dataUrl);
          return dataUrl;
        } catch (localErr) {
          const msg = localErr instanceof Error ? localErr.message : "Failed to store image locally";
          error?.(uploadId, msg);
          throw localErr;
        }
      }

      // 2. Start upload notification
      start?.(uploadId, file.name);
      progress?.(uploadId, 10);

      try {
        // 3. Upload to Uploadthing
        const uploaded = await uploadFiles("boardImage", {
          files: [file],
          onUploadProgress: ({ progress: pct }) => {
            progress?.(uploadId, Math.round(10 + (pct * 0.8)));
          },
        });

        const uploadedFile = uploaded[0];
        if (!uploadedFile?.ufsUrl) {
          throw new Error("Upload succeeded but no URL was returned");
        }

        const cdnUrl = uploadedFile.ufsUrl;
        progress?.(uploadId, 95);

        // 4. Record asset in DB
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

        return cdnUrl;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        error?.(uploadId, msg);
        throw err;
      }
    },
    []
  );

  /**
   * deleteMedia() — remove media files from DB and/or local storage.
   */
  const deleteMedia = useCallback(async (urls: string[]): Promise<void> => {
    if (urls.length === 0) return;

    // Clean up local storage assets if present
    try {
      const localListStr = localStorage.getItem("sketchboard-local-media-list");
      if (localListStr) {
        let localList = JSON.parse(localListStr) as Array<{ id: string; url?: string }>;
        const initialLen = localList.length;
        localList = localList.filter((item) => {
          // Check if data key or item id matches deleted elements
          const isMatch = urls.includes(item.id) || (item.url && urls.includes(item.url));
          if (isMatch) {
            localStorage.removeItem(`sketchboard-local-media-data-${item.id}`);
          }
          return !isMatch;
        });
        if (localList.length !== initialLen) {
          localStorage.setItem("sketchboard-local-media-list", JSON.stringify(localList));
        }
      }
    } catch (e) {
      console.warn("[useAssetStore] Failed to clean up local storage assets:", e);
    }

    if (modeRef.current !== "auth") return;

    const nonDataUrls = urls.filter((url) => !url.startsWith("data:"));
    if (nonDataUrls.length > 0) {
      console.log("[useAssetStore] Deleting assets from cloud:", nonDataUrls);
      await deleteAssets(nonDataUrls);
    }
  }, []);

  return useMemo(() => ({ uploadMedia, deleteMedia }), [uploadMedia, deleteMedia]);
}
