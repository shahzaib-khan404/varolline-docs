"use client";

import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ResultPreview } from "./result-preview";
import { formatBytes } from "@/lib/utils/format";

interface PreviewDialogProps {
  url: string;
  filename?: string | null;
  outputSizeBytes?: number | null;
  toolName: string;
}

export function PreviewDialog({ url, filename, outputSizeBytes, toolName }: PreviewDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
          <Eye className="mr-1 h-3 w-3" />
          Preview
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm">
            {toolName}
            {filename && (
              <span className="ml-2 font-normal text-muted-foreground">
                — {filename}
              </span>
            )}
          </DialogTitle>
          {outputSizeBytes != null && (
            <p className="text-xs text-muted-foreground">{formatBytes(outputSizeBytes)}</p>
          )}
        </DialogHeader>

        <ResultPreview url={url} filename={filename} />

        <div className="mt-2 flex justify-end">
          <Button asChild size="sm">
            <a href={url} download={filename ?? undefined}>
              Download
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
