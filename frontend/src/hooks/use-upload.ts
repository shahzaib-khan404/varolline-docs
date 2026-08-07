"use client";

import { useState, useCallback } from "react";
import { filesApi } from "@/lib/api/files";
import type { FileRead } from "@/types/api";

export type UploadStatus = "idle" | "uploading" | "done" | "error";

export interface UploadItem {
  id: string;
  file: File;
  status: UploadStatus;
  progress: number;
  fileRead?: FileRead;
  error?: string;
}

let _counter = 0;
const nextId = () => `u_${++_counter}_${Math.floor(Math.random() * 1e6)}`;

function setItemField(
  items: UploadItem[],
  id: string,
  patch: Partial<UploadItem>
): UploadItem[] {
  return items.map((it) => (it.id === id ? { ...it, ...patch } : it));
}

export function useUpload() {
  const [items, setItems] = useState<UploadItem[]>([]);

  const addFiles = useCallback((files: File[]) => {
    const next: UploadItem[] = files.map((file) => ({
      id: nextId(),
      file,
      status: "idle" as const,
      progress: 0,
    }));
    setItems((prev) => [...prev, ...next]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  // Retry a failed item by resetting it to idle
  const retryItem = useCallback((id: string) => {
    setItems((prev) => setItemField(prev, id, { status: "idle", progress: 0, error: undefined }));
  }, []);

  // Upload all idle (and optionally errored) items sequentially.
  // Returns an array of successfully uploaded FileRead objects.
  const uploadAll = useCallback(async (): Promise<FileRead[]> => {
    // Snapshot current items — state closes over stale values in async loops
    const snapshot = await new Promise<UploadItem[]>((resolve) =>
      setItems((prev) => { resolve(prev); return prev; })
    );

    const toUpload = snapshot.filter(
      (it) => it.status === "idle" || it.status === "error"
    );

    const results: FileRead[] = [];

    for (const item of toUpload) {
      setItems((prev) => setItemField(prev, item.id, { status: "uploading", progress: 0, error: undefined }));
      try {
        const fileRead = await filesApi.upload(item.file, (progress) => {
          setItems((prev) => setItemField(prev, item.id, { progress }));
        });
        setItems((prev) =>
          setItemField(prev, item.id, { status: "done", progress: 100, fileRead })
        );
        results.push(fileRead);
      } catch (err: unknown) {
        const message =
          (err as any)?.response?.data?.message ??
          (err instanceof Error ? err.message : "Upload failed");
        setItems((prev) => setItemField(prev, item.id, { status: "error", error: message }));
      }
    }

    // Include items already successfully uploaded before this call
    const alreadyDone = snapshot
      .filter((it) => it.status === "done" && it.fileRead)
      .map((it) => it.fileRead!);

    return [...alreadyDone, ...results];
  }, []);

  const isUploading = items.some((it) => it.status === "uploading");
  const allDone = items.length > 0 && items.every((it) => it.status === "done");
  const hasError = items.some((it) => it.status === "error");
  const readyCount = items.filter((it) => it.status === "idle").length;

  return {
    items,
    addFiles,
    removeItem,
    retryItem,
    clear,
    uploadAll,
    isUploading,
    allDone,
    hasError,
    readyCount,
  };
}

export type UseUploadReturn = ReturnType<typeof useUpload>;
