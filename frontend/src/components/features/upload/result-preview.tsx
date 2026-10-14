"use client";

import { useEffect, useState } from "react";
import { FileText, Archive, FileType2, AlertCircle, FileSpreadsheet, Table, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";

type OutputKind = "pdf" | "image" | "text" | "zip" | "docx" | "excel" | "other";

function detectKind(filename: string | null | undefined): OutputKind {
  if (!filename) return "other";
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "pdf";
  if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) return "image";
  if (ext === "txt") return "text";
  if (ext === "zip") return "zip";
  if (["docx", "doc"].includes(ext)) return "docx";
  if (["xlsx", "xls", "csv"].includes(ext)) return "excel";
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
  if (kind === "excel") return <ExcelPreview url={url} filename={filename} />;
  if (kind === "zip") return <FileCard icon={Archive} label="ZIP archive" note="Contains multiple files — download to extract." />;
  if (kind === "docx") return <FileCard icon={FileType2} label="Word document (.docx)" note="Open in Microsoft Word or Google Docs after downloading." />;
  return null;
}

// ── PDF ───────────────────────────────────────────────────────────────────────

function PdfPreview({ url }: { url: string }) {
  const viewerUrl = url.includes("#") ? url : `${url}#toolbar=0`;
  return (
    <div className="mt-5 w-full overflow-hidden rounded-xl border bg-muted/30">
      <div className="flex items-center justify-between border-b px-3 py-2 text-xs font-medium text-muted-foreground">
        <span>PDF Document Preview</span>
      </div>
      <iframe
        src={viewerUrl}
        title="PDF preview"
        className="h-[540px] w-full"
        style={{ border: "none" }}
      />
    </div>
  );
}

// ── Excel Spreadsheet Preview ────────────────────────────────────────────────

interface SheetData {
  name: string;
  rows: (string | number)[][];
}

function ExcelPreview({ url, filename }: { url: string; filename?: string | null }) {
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [activeSheetIdx, setActiveSheetIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load spreadsheet preview");
        return res.arrayBuffer();
      })
      .then((buffer) => {
        if (cancelled) return;
        const workbook = XLSX.read(buffer, { type: "array" });
        const parsedSheets: SheetData[] = workbook.SheetNames.map((name) => {
          const ws = workbook.Sheets[name];
          if (!ws) return { name, rows: [] };
          const rawRows = XLSX.utils.sheet_to_json<(string | number)[]>(ws, {
            header: 1,
            defval: "",
          });
          // Filter out completely empty trailing rows
          const rows = rawRows.filter((row) =>
            row.some((cell) => cell !== "" && cell !== null && cell !== undefined)
          );
          return { name, rows };
        });

        setSheets(parsedSheets);
        setActiveSheetIdx(0);
        setLoading(false);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("Excel preview error:", err);
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  if (loading) {
    return (
      <div className="mt-5 flex h-48 w-full flex-col items-center justify-center rounded-xl border bg-muted/30">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="mt-2 text-xs text-muted-foreground">Loading spreadsheet preview…</p>
      </div>
    );
  }

  if (error || sheets.length === 0) {
    return (
      <FileCard
        icon={FileSpreadsheet}
        label="Excel Spreadsheet"
        note="Preview could not be rendered. Click Download to open directly in Excel or WPS."
      />
    );
  }

  const currentSheet = sheets[activeSheetIdx] || sheets[0];
  if (!currentSheet) return null;
  const maxDisplayRows = 50;
  const rowsToDisplay = currentSheet.rows.slice(0, maxDisplayRows);
  const totalRows = currentSheet.rows.length;

  return (
    <div className="mt-5 w-full overflow-hidden rounded-xl border bg-card text-left shadow-sm">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
          <span className="text-xs font-semibold text-foreground">
            Spreadsheet Preview: {filename || "Data"}
          </span>
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
            {totalRows} rows
          </span>
        </div>

        {/* Sheet tab switcher */}
        {sheets.length > 1 && (
          <div className="flex flex-wrap items-center gap-1">
            {sheets.map((s, idx) => (
              <button
                key={s.name}
                onClick={() => setActiveSheetIdx(idx)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  activeSheetIdx === idx
                    ? "bg-background text-foreground shadow-sm border font-semibold"
                    : "text-muted-foreground hover:bg-muted/60"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Spreadsheet Table Grid */}
      <div className="max-h-[460px] w-full overflow-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            {rowsToDisplay.length > 0 && rowsToDisplay[0] && (
              <tr className="border-b bg-muted/60">
                <th className="w-10 border-r px-2 py-2 text-center text-[10px] font-mono text-muted-foreground">
                  #
                </th>
                {rowsToDisplay[0].map((cell, cIdx) => (
                  <th
                    key={cIdx}
                    className="border-r px-3 py-2 text-left font-semibold text-foreground whitespace-nowrap"
                  >
                    {String(cell || "")}
                  </th>
                ))}
              </tr>
            )}
          </thead>
          <tbody>
            {rowsToDisplay.slice(1).map((row, rIdx) => (
              <tr
                key={rIdx}
                className={`border-b transition-colors hover:bg-muted/40 ${
                  rIdx % 2 === 0 ? "bg-background" : "bg-muted/20"
                }`}
              >
                <td className="border-r px-2 py-1.5 text-center text-[10px] font-mono text-muted-foreground">
                  {rIdx + 2}
                </td>
                {rowsToDisplay[0]?.map((_, cIdx) => (
                  <td
                    key={cIdx}
                    className="border-r px-3 py-1.5 text-muted-foreground whitespace-nowrap max-w-[260px] truncate"
                  >
                    {String(row[cIdx] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalRows > maxDisplayRows && (
        <div className="border-t bg-muted/20 px-4 py-2 text-center text-[11px] text-muted-foreground">
          Showing first {maxDisplayRows} of {totalRows} rows. Download the file for complete records.
        </div>
      )}
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
