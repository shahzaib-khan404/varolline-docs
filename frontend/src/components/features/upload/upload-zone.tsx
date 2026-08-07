"use client";

import { AnimatePresence } from "framer-motion";
import { Trash2 } from "lucide-react";
import { Dropzone } from "./dropzone";
import { FileItem } from "./file-item";
import type { ToolConfig } from "@/config/tools";
import type { UseUploadReturn } from "@/hooks/use-upload";

interface UploadZoneProps extends UseUploadReturn {
  tool: ToolConfig;
}

export function UploadZone({
  tool,
  items,
  addFiles,
  removeItem,
  retryItem,
  clear,
  isUploading,
}: UploadZoneProps) {
  return (
    <div className="space-y-3">
      <Dropzone
        tool={tool}
        hasFiles={items.length > 0}
        onDrop={addFiles}
      />

      <AnimatePresence initial={false}>
        {items.length > 0 && (
          <div className="space-y-2">
            {/* File list header */}
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-medium text-muted-foreground">
                {items.length} file{items.length !== 1 ? "s" : ""} selected
              </span>
              {!isUploading && (
                <button
                  onClick={clear}
                  className="flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                  Clear all
                </button>
              )}
            </div>

            {/* File items */}
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {items.map((item, idx) => (
                  <FileItem
                    key={item.id}
                    item={item}
                    index={idx}
                    onRemove={removeItem}
                    onRetry={retryItem}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
