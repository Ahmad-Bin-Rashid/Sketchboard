"use client";

import { useState, useEffect, useTransition } from "react";
import { HardDrive, Cloud, Laptop, Trash2, Upload, Eye, ExternalLink, Loader2, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { deleteAssets, recordAsset } from "@/actions/assets";
import { uploadFiles } from "@/lib/uploadthing";
import { UPLOAD } from "@/lib/constants";

interface CloudAsset {
  id: string;
  boardId: string;
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  createdAt: Date;
}

interface LocalAsset {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
  boardId: string;
}

interface StorageUsage {
  usedBytes: number;
  maxBytes: number;
  usedMB: number;
  maxMB: number;
  percentUsed: number;
  hasCapacity: boolean;
}

interface MediaClientProps {
  initialCloudAssets: CloudAsset[];
  initialStorage: StorageUsage;
}

export function MediaClient({ initialCloudAssets, initialStorage }: MediaClientProps) {
  const [cloudAssets, setCloudAssets] = useState<CloudAsset[]>(initialCloudAssets);
  const [localAssets, setLocalAssets] = useState<LocalAsset[]>([]);
  const [cloudStorage, setCloudStorage] = useState<StorageUsage>(initialStorage);
  const [localUsageBytes, setLocalUsageBytes] = useState(0);
  const [selectedAsset, setSelectedAsset] = useState<{ url: string; name: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  // Load local storage assets and compute size
  const loadLocalAssets = () => {
    try {
      const listStr = localStorage.getItem("sketchboard-local-media-list");
      if (listStr) {
        const parsed = JSON.parse(listStr) as LocalAsset[];
        setLocalAssets(parsed);
        const total = parsed.reduce((sum, item) => sum + item.fileSize, 0);
        setLocalUsageBytes(total);
      } else {
        setLocalAssets([]);
        setLocalUsageBytes(0);
      }
    } catch (e) {
      console.error("Failed to load local assets:", e);
    }
  };

  useEffect(() => {
    loadLocalAssets();
  }, []);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleDeleteCloud = async (url: string) => {
    if (!confirm("Are you sure you want to delete this image from the cloud? This will also remove it from any boards using it.")) return;

    startTransition(async () => {
      const res = await deleteAssets([url]);
      if (res.success) {
        setCloudAssets((prev) => prev.filter((a) => a.url !== url));
        // Recalculate cloud storage
        const deletedAsset = cloudAssets.find((a) => a.url === url);
        if (deletedAsset) {
          setCloudStorage((prev) => {
            const newUsedBytes = Math.max(0, prev.usedBytes - deletedAsset.fileSize);
            const newUsedMB = newUsedBytes / (1024 * 1024);
            return {
              ...prev,
              usedBytes: newUsedBytes,
              usedMB: Math.round(newUsedMB * 100) / 100,
              percentUsed: Math.min(100, (newUsedBytes / prev.maxBytes) * 100),
              hasCapacity: newUsedBytes < prev.maxBytes,
            };
          });
        }
      } else {
        alert(res.error ?? "Failed to delete asset");
      }
    });
  };

  const handleDeleteLocal = (id: string) => {
    if (!confirm("Are you sure you want to delete this locally stored image? It will be removed from your canvas.")) return;

    try {
      const listStr = localStorage.getItem("sketchboard-local-media-list");
      if (listStr) {
        const parsed = JSON.parse(listStr) as LocalAsset[];
        const updated = parsed.filter((item) => item.id !== id);
        localStorage.setItem("sketchboard-local-media-list", JSON.stringify(updated));
        localStorage.removeItem(`sketchboard-local-media-data-${id}`);
        loadLocalAssets();
      }
    } catch (e) {
      console.error(e);
      alert("Failed to delete local asset");
    }
  };

  const handleUploadLocalToCloud = async (localAsset: LocalAsset) => {
    // 1. Verify cloud capacity
    if (cloudStorage.usedBytes + localAsset.fileSize > cloudStorage.maxBytes) {
      alert(`Cloud backup limit reached (20 MB). You cannot back up this image. Delete some cloud files first.`);
      return;
    }

    setUploadingId(localAsset.id);

    try {
      // 2. Fetch base64 data from local storage
      const dataUrl = localStorage.getItem(`sketchboard-local-media-data-${localAsset.id}`);
      if (!dataUrl) {
        throw new Error("Local file data not found");
      }

      // Convert data URL back to File
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], localAsset.fileName, { type: localAsset.mimeType });

      // 3. Upload to Uploadthing
      const uploaded = await uploadFiles("boardImage", {
        files: [file],
      });

      const uploadedFile = uploaded[0];
      if (!uploadedFile?.ufsUrl) {
        throw new Error("Upload failed");
      }

      const cloudUrl = uploadedFile.ufsUrl;

      // 4. Save to database
      const dbResult = await recordAsset({
        boardId: localAsset.boardId,
        url: cloudUrl,
        fileName: localAsset.fileName,
        fileSize: localAsset.fileSize,
        mimeType: localAsset.mimeType,
      });

      if (!dbResult.success) {
        throw new Error(dbResult.error ?? "Failed to save record to DB");
      }

      // 5. Update local mappings so the board component can transparently substitute local ID for cloud URL
      const mappingsStr = localStorage.getItem("sketchboard-media-mappings") ?? "{}";
      const mappings = JSON.parse(mappingsStr);
      mappings[localAsset.id] = cloudUrl;
      localStorage.setItem("sketchboard-media-mappings", JSON.stringify(mappings));

      // 6. Delete from local storage
      const listStr = localStorage.getItem("sketchboard-local-media-list");
      if (listStr) {
        const parsed = JSON.parse(listStr) as LocalAsset[];
        const updated = parsed.filter((item) => item.id !== localAsset.id);
        localStorage.setItem("sketchboard-local-media-list", JSON.stringify(updated));
      }
      localStorage.removeItem(`sketchboard-local-media-data-${localAsset.id}`);

      // 7. Refresh lists
      loadLocalAssets();

      // Append to cloudAssets state
      const newCloudAsset: CloudAsset = {
        id: dbResult.data.assetId,
        boardId: localAsset.boardId,
        url: cloudUrl,
        fileName: localAsset.fileName,
        fileSize: localAsset.fileSize,
        mimeType: localAsset.mimeType,
        uploadedBy: "",
        createdAt: new Date(),
      };
      setCloudAssets((prev) => [newCloudAsset, ...prev]);

      // Update storage summary
      setCloudStorage((prev) => {
        const newUsed = prev.usedBytes + localAsset.fileSize;
        return {
          ...prev,
          usedBytes: newUsed,
          usedMB: newUsed / (1024 * 1024),
          percentUsed: Math.min(100, (newUsed / prev.maxBytes) * 100),
          hasCapacity: newUsed < prev.maxBytes,
        };
      });

      alert("Backup completed successfully! Any boards showing this local image will automatically update on reload.");
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to back up asset to cloud.");
    } finally {
      setUploadingId(null);
    }
  };

  const getLocalDataUrl = (id: string): string => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(`sketchboard-local-media-data-${id}`) ?? "";
  };

  // Compute percentages for limits
  const localLimitBytes = UPLOAD.MAX_LOCAL_STORAGE_MB * 1024 * 1024;
  const localPercent = Math.min(100, (localUsageBytes / localLimitBytes) * 100);

  return (
    <div className="space-y-8">
      {/* Storage Meters */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Cloud Backups Limit */}
        <div className="rounded-2xl border border-card-border bg-card p-5">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-light">
              <Cloud className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Cloud Vault Storage</p>
              <p className="text-xs text-muted-foreground">Permanent cloud backups for boards</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-sm font-semibold">{cloudStorage.usedMB.toFixed(2)} MB</p>
              <p className="text-xs text-muted-foreground">of {cloudStorage.maxMB} MB</p>
            </div>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full transition-all duration-500 bg-primary")}
              style={{ width: `${cloudStorage.percentUsed}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {cloudStorage.percentUsed >= 100
              ? "Cloud limit reached! New media will fallback to local storage."
              : `${(cloudStorage.maxMB - cloudStorage.usedMB).toFixed(2)} MB cloud capacity remaining`}
          </p>
        </div>

        {/* Local Storage Limit */}
        <div className="rounded-2xl border border-card-border bg-card p-5">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary-light">
              <Laptop className="h-4.5 w-4.5 text-secondary" />
            </div>
            <div>
              <p className="text-sm font-medium">Local Browser Storage</p>
              <p className="text-xs text-muted-foreground">Temporary browser fallback storage</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-sm font-semibold">{(localUsageBytes / (1024 * 1024)).toFixed(2)} MB</p>
              <p className="text-xs text-muted-foreground">of {UPLOAD.MAX_LOCAL_STORAGE_MB} MB</p>
            </div>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                localPercent > 80 ? "bg-destructive" : "bg-secondary"
              )}
              style={{ width: `${localPercent}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {localPercent >= 100
              ? "Local storage full! Free space to add new canvas images."
              : `${(UPLOAD.MAX_LOCAL_STORAGE_MB - localUsageBytes / (1024 * 1024)).toFixed(2)} MB local storage remaining`}
          </p>
        </div>
      </div>

      {/* Cloud Media Section */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Cloud className="h-4 w-4" /> Cloud Vault Assets ({cloudAssets.length})
        </h2>
        
        {cloudAssets.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
            <ImageIcon className="h-10 w-10 text-muted-foreground/30 mb-2" />
            <p className="text-sm font-medium">No cloud back-ups saved yet</p>
            <p className="text-xs text-muted-foreground mt-0.5">Images uploaded while within quota limits appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {cloudAssets.map((asset) => (
              <div key={asset.url} className="group relative overflow-hidden rounded-xl border border-card-border bg-card p-2 transition-all hover:shadow-md">
                <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-surface flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={asset.url}
                    alt={asset.fileName}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center gap-2">
                    <button
                      onClick={() => setSelectedAsset({ url: asset.url, name: asset.fileName })}
                      className="rounded-lg bg-white/20 p-2 text-white backdrop-blur-sm transition hover:bg-white/30"
                      title="Preview"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <a
                      href={asset.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-white/20 p-2 text-white backdrop-blur-sm transition hover:bg-white/30"
                      title="Open Original"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
                <div className="mt-2 text-left min-w-0 px-1">
                  <p className="truncate text-xs font-semibold" title={asset.fileName}>{asset.fileName}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{formatSize(asset.fileSize)}</p>
                </div>
                <button
                  disabled={isPending}
                  onClick={() => handleDeleteCloud(asset.url)}
                  className="absolute bottom-2 right-2 rounded-lg bg-transparent p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                  title="Delete from Cloud"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Local Storage Section */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Laptop className="h-4 w-4" /> Local Browser Fallbacks ({localAssets.length})
        </h2>

        {localAssets.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
            <Laptop className="h-10 w-10 text-muted-foreground/30 mb-2" />
            <p className="text-sm font-medium">No locally stored images found</p>
            <p className="text-xs text-muted-foreground mt-0.5">Images added to the canvas after crossing cloud limits will fallback here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {localAssets.map((asset) => {
              const dataUrl = getLocalDataUrl(asset.id);
              const isUploading = uploadingId === asset.id;
              return (
                <div key={asset.id} className="group relative overflow-hidden rounded-xl border border-card-border bg-card p-2 transition-all hover:shadow-md">
                  <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-surface flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={dataUrl}
                      alt={asset.fileName}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/45 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center gap-2">
                      <button
                        onClick={() => setSelectedAsset({ url: dataUrl, name: asset.fileName })}
                        className="rounded-lg bg-white/20 p-2 text-white backdrop-blur-sm transition hover:bg-white/30"
                        title="Preview"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleUploadLocalToCloud(asset)}
                        disabled={isUploading}
                        className="rounded-lg bg-white/20 p-2 text-white backdrop-blur-sm transition hover:bg-white/30"
                        title="Backup to Cloud"
                      >
                        {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 text-left min-w-0 px-1">
                    <p className="truncate text-xs font-semibold" title={asset.fileName}>{asset.fileName}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{formatSize(asset.fileSize)}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteLocal(asset.id)}
                    className="absolute bottom-2 right-2 rounded-lg bg-transparent p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                    title="Delete permanently"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Preview Dialog */}
      {selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 transition-all" onClick={() => setSelectedAsset(null)}>
          <div className="relative max-h-[85vh] max-w-[90vw] overflow-hidden rounded-2xl bg-card p-3 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between border-b border-border pb-2 px-1">
              <span className="text-xs font-semibold truncate max-w-[70vw]">{selectedAsset.name}</span>
              <button
                onClick={() => setSelectedAsset(null)}
                className="rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-surface hover:text-foreground"
              >
                Close
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedAsset.url}
              alt={selectedAsset.name}
              className="max-h-[75vh] w-auto max-w-full rounded-lg object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
