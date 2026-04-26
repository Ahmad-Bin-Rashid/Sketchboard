import type { Metadata } from "next";
import { currentUser } from "@clerk/nextjs/server";
import { getUserAssets, getStorageUsage } from "@/actions/assets";
import { MediaClient } from "./media-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Media Vault — SketchBoard",
  description: "Manage your uploaded board media and local backups",
};

export default async function MediaPage() {
  const user = await currentUser();
  const isGuest = !user;

  let initialAssets: any[] = [];
  let storage = { usedBytes: 0, maxBytes: 20 * 1024 * 1024, usedMB: 0, maxMB: 20, percentUsed: 0, hasCapacity: true };

  if (!isGuest) {
    const [assetsResult, storageResult] = await Promise.all([
      getUserAssets(),
      getStorageUsage(),
    ]);

    initialAssets = assetsResult.success ? assetsResult.data : [];
    if (storageResult.success) {
      storage = storageResult.data;
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <div className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight">Media Vault</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          View, upload, and manage images used on your whiteboards
        </p>
      </div>

      <MediaClient initialCloudAssets={initialAssets} initialStorage={storage} isGuest={isGuest} />
    </div>
  );
}
