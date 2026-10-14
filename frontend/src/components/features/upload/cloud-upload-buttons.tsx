"use client";

import { useState } from "react";
import { CloudPickerModal, type CloudProvider } from "./cloud-picker-modal";

interface CloudUploadButtonsProps {
  onFilesSelected: (files: File[]) => void;
  className?: string;
  variant?: "dropzone" | "compact" | "toolbar";
}

export function CloudUploadButtons({
  onFilesSelected,
  className = "",
  variant = "dropzone",
}: CloudUploadButtonsProps) {
  const [modalProvider, setModalProvider] = useState<CloudProvider | null>(null);

  const handleOpenProvider = (provider: CloudProvider, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setModalProvider(provider);
  };

  const handleClose = () => {
    setModalProvider(null);
  };

  const handleFiles = (files: File[]) => {
    onFilesSelected(files);
    setModalProvider(null);
  };

  if (variant === "toolbar") {
    return (
      <>
        <div className={`flex items-center gap-1.5 ${className}`}>
          <button
            type="button"
            onClick={(e) => handleOpenProvider("google_drive", e)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border/70 bg-secondary/30 hover:bg-secondary/60 text-xs font-medium text-foreground transition-all"
            title="Import PDF from Google Drive"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 87.3 78" fill="none">
              <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066DA"/>
              <path d="M43.65 25 29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3L1.2 47.45c-.8 1.4-1.2 2.95-1.2 4.5h27.45z" fill="#00AC47"/>
              <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.85l6.4 11.1z" fill="#EA4335"/>
              <path d="M43.65 25 57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.6 0-3.15.4-4.5 1.2z" fill="#00832D"/>
              <path d="M59.85 53H87.3c0-1.55-.4-3.1-1.2-4.5L72.35 25l-13.75 23.8z" fill="#FFBA00"/>
              <path d="M73.55 76.8H27.5l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.9c1.6 0 3.15-.4 4.5-1.2z" fill="#2684FC"/>
            </svg>
            <span className="hidden sm:inline">Drive</span>
          </button>

          <button
            type="button"
            onClick={(e) => handleOpenProvider("dropbox", e)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border/70 bg-secondary/30 hover:bg-secondary/60 text-xs font-medium text-foreground transition-all"
            title="Import PDF from Dropbox"
          >
            <svg className="h-3.5 w-3.5 fill-[#0061FF]" viewBox="0 0 24 24">
              <path d="M6 2.5 0 6.65l6 4.15 6-4.15L6 2.5zm12 0-6 4.15 6 4.15 6-4.15L18 2.5zM0 14.95l6 4.15 6-4.15-6-4.15-6 4.15zm18-4.15-6 4.15 6 4.15 6-4.15-6-4.15zM6 20.35l6 4.15 6-4.15-6-4.15-6 4.15z" />
            </svg>
            <span className="hidden sm:inline">Dropbox</span>
          </button>
        </div>

        {modalProvider && (
          <CloudPickerModal
            isOpen={true}
            onClose={handleClose}
            provider={modalProvider}
            onFilesSelected={handleFiles}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className={`flex items-center justify-center gap-3 ${className}`}>
        <span className="text-[11px] text-muted-foreground font-medium">Or import from:</span>

        {/* Google Drive Button */}
        <button
          type="button"
          onClick={(e) => handleOpenProvider("google_drive", e)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-background/80 hover:bg-muted px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition-all hover:scale-105"
          title="Upload PDF from Google Drive"
        >
          <svg className="h-4 w-4" viewBox="0 0 87.3 78" fill="none">
            <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066DA"/>
            <path d="M43.65 25 29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3L1.2 47.45c-.8 1.4-1.2 2.95-1.2 4.5h27.45z" fill="#00AC47"/>
            <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.85l6.4 11.1z" fill="#EA4335"/>
            <path d="M43.65 25 57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.6 0-3.15.4-4.5 1.2z" fill="#00832D"/>
            <path d="M59.85 53H87.3c0-1.55-.4-3.1-1.2-4.5L72.35 25l-13.75 23.8z" fill="#FFBA00"/>
            <path d="M73.55 76.8H27.5l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.9c1.6 0 3.15-.4 4.5-1.2z" fill="#2684FC"/>
          </svg>
          <span>Google Drive</span>
        </button>

        {/* Dropbox Button */}
        <button
          type="button"
          onClick={(e) => handleOpenProvider("dropbox", e)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-background/80 hover:bg-muted px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition-all hover:scale-105"
          title="Upload PDF from Dropbox"
        >
          <svg className="h-4 w-4 fill-[#0061FF]" viewBox="0 0 24 24">
            <path d="M6 2.5 0 6.65l6 4.15 6-4.15L6 2.5zm12 0-6 4.15 6 4.15 6-4.15L18 2.5zM0 14.95l6 4.15 6-4.15-6-4.15-6 4.15zm18-4.15-6 4.15 6 4.15 6-4.15-6-4.15zM6 20.35l6 4.15 6-4.15-6-4.15-6 4.15z" />
          </svg>
          <span>Dropbox</span>
        </button>
      </div>

      {modalProvider && (
        <CloudPickerModal
          isOpen={true}
          onClose={handleClose}
          provider={modalProvider}
          onFilesSelected={handleFiles}
        />
      )}
    </>
  );
}
