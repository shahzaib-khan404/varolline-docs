"use client";

import { useEffect, useState } from "react";
import { FileText, Archive, FileType2, AlertCircle } from "lucide-react";

type OutputKind = "pdf" | "image" | "text" | "zip" | "docx" | "other";

function detectKind(filename: string | null | undefined): OutputKind {
  if (!filename) return "other";
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "pdf";
  if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) return "image";
  if (ext === "txt") return "text";
  if (ext === "zip") return "zip";
  if (["docx", "doc"].includes(ext)) return "docx";
  return "other";
}

interface ResultPreviewProps {
  url: string;
  filename?: string | null;
}

export function ResultPreview({ url, filename }: ResultPreviewProps) {
  const kind = detectKind(filename);

  if (kind === "pdf") return <PdfPreview url={url} />;
  if (kind === "image") return <ImagePreview url={url} filename={filename} />;
  if (kind === "text") return <TextPreview url={url} />;
  if (kind === "zip") return <FileCard icon={Archive} label="ZIP archive" note="Contains multiple files — download to extract." />;
  if (kind === "docx") return <FileCard icon={FileType2} label="Word document (.docx)" note="Open in Microsoft Word or Google Docs after downloading." />;
  return null;
}

// ── PDF ───────────────────────────────────────────────────────────────────────

function PdfPreview({ url }: { url: string }) {
  return (
    <div className="mt-5 w-full overflow-hidden rounded-xl border bg-muted/30">
      <p className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">Preview</p>
      <iframe
        src={url}
        title="PDF preview"
        className="h-[520px] w-full"
        style={{ border: "none" }}
      />
    </div>
  );
}

// ── Image ─────────────────────────────────────────────────────────────────────

function ImagePreview({ url, filename }: { url: string; filename?: string | null }) {
  return (
    <div className="mt-5 w-full overflow-hidden rounded-xl border bg-muted/30">
      <p className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">Preview</p>
      <div className="flex items-center justify-center p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={filename ?? "Result"}
          className="max-h-[480px] max-w-full rounded-lg object-contain shadow"
        />
      </div>
    </div>
  );
}

// ── Plain text ────────────────────────────────────────────────────────────────

function TextPreview({ url }: { url: string }) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.text();
      })
      .then(setContent)
      .catch(() => setError(true));
  }, [url]);

  return (
    <div className="mt-5 w-full overflow-hidden rounded-xl border bg-muted/30">
      <p className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">Extracted text preview</p>
      <div className="max-h-72 overflow-y-auto p-4">
        {error && (
          <div className="flex items-center gap-2 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5" />
            Could not load text preview.
          </div>
        )}
        {!error && content === null && (
          <p className="text-xs text-muted-foreground">Loading…</p>
        )}
        {content !== null && (
          <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-foreground">
            {content.slice(0, 8000)}
            {content.length > 8000 && "\n\n… (truncated — download for full text)"}
          </pre>
        )}
      </div>
    </div>
  );
}

// ── Generic file card ─────────────────────────────────────────────────────────

function FileCard({
  icon: Icon,
  label,
  note,
}: {
  icon: React.ElementType;
  label: string;
  note: string;
}) {
  return (
    <div className="mt-5 flex items-start gap-3 rounded-xl border bg-muted/30 p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-background">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{note}</p>
      </div>
    </div>
  );
}
