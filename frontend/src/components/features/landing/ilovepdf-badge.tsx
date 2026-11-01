"use client";

import React from "react";
import { cn } from "@/lib/utils/cn";

interface ILovePdfBadgeProps {
  toolId: string;
  className?: string;
}

/**
 * Clean flat line/accent SVG badge icons in iLovePDF styling, sharp borders, zero gradients.
 */
export function ILovePdfBadge({ toolId, className }: ILovePdfBadgeProps) {
  switch (toolId) {
    case "merge_pdf":
      return (
        <div className={cn("relative flex h-10 w-10 items-center justify-center rounded-none bg-rose-600 text-white shadow-xs", className)}>
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 14l6-6m0 0H5m5 0v5" />
            <path d="M20 10l-6 6m0 0h5m-5 0v-5" />
          </svg>
        </div>
      );

    case "split_pdf":
      return (
        <div className={cn("relative flex h-10 w-10 items-center justify-center rounded-none bg-orange-600 text-white shadow-xs", className)}>
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 4l5 5m0 0h-5m5 0v-5" />
            <path d="M9 20l-5-5m0 0h5m-5 0v5" />
          </svg>
        </div>
      );

    case "compress_pdf":
      return (
        <div className={cn("relative flex h-10 w-10 items-center justify-center rounded-none bg-emerald-600 text-white shadow-xs", className)}>
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4l5 5m0 0H5m4 0V5" />
            <path d="M20 4l-5 5m0 0h4m-4 0V5" />
            <path d="M4 20l5-5m0 0H5m4 0v4" />
            <path d="M20 20l-5-5m0 0h4m-4 0v4" />
          </svg>
        </div>
      );

    case "pdf_to_word":
      return (
        <div className={cn("relative flex h-10 w-10 items-center justify-center", className)}>
          <div className="absolute top-0 left-0 flex h-6 w-6 items-center justify-center rounded-none bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 17l10-10M17 7H7m10 0v10" />
            </svg>
          </div>
          <div className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-none bg-blue-600 text-white font-bold text-xs">
            W
          </div>
        </div>
      );

    case "pdf_to_powerpoint":
    case "powerpoint_to_pdf":
      return (
        <div className={cn("relative flex h-10 w-10 items-center justify-center", className)}>
          <div className="absolute top-0 left-0 flex h-6 w-6 items-center justify-center rounded-none bg-orange-100 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 17l10-10M17 7H7m10 0v10" />
            </svg>
          </div>
          <div className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-none bg-orange-600 text-white font-bold text-xs">
            P
          </div>
        </div>
      );

    case "pdf_to_excel":
    case "excel_to_pdf":
      return (
        <div className={cn("relative flex h-10 w-10 items-center justify-center", className)}>
          <div className="absolute top-0 left-0 flex h-6 w-6 items-center justify-center rounded-none bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 17l10-10M17 7H7m10 0v10" />
            </svg>
          </div>
          <div className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-none bg-emerald-600 text-white font-bold text-xs">
            X
          </div>
        </div>
      );

    case "word_to_pdf":
      return (
        <div className={cn("relative flex h-10 w-10 items-center justify-center", className)}>
          <div className="absolute top-0 left-0 flex h-6 w-6 items-center justify-center rounded-none bg-blue-600 text-white font-bold text-xs">
            W
          </div>
          <div className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-none bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 17l10-10M17 7H7m10 0v10" />
            </svg>
          </div>
        </div>
      );

    case "edit_pdf":
      return (
        <div className={cn("relative flex h-10 w-10 items-center justify-center rounded-none bg-sky-600 text-white shadow-xs", className)}>
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
        </div>
      );

    case "pdf_to_image":
      return (
        <div className={cn("relative flex h-10 w-10 items-center justify-center rounded-none bg-amber-600 text-white shadow-xs", className)}>
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="0" ry="0" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </div>
      );

    case "image_to_pdf":
      return (
        <div className={cn("relative flex h-10 w-10 items-center justify-center rounded-none bg-amber-600 text-white shadow-xs", className)}>
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <line x1="9" y1="15" x2="15" y2="15" />
          </svg>
        </div>
      );

    case "page_numbers":
      return (
        <div className={cn("relative flex h-10 w-10 items-center justify-center rounded-none bg-purple-600 text-white font-bold text-xs shadow-xs", className)}>
          #12
        </div>
      );

    case "watermark_pdf":
      return (
        <div className={cn("relative flex h-10 w-10 items-center justify-center rounded-none bg-teal-600 text-white shadow-xs", className)}>
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
          </svg>
        </div>
      );

    case "rotate_pdf":
      return (
        <div className={cn("relative flex h-10 w-10 items-center justify-center rounded-none bg-blue-600 text-white shadow-xs", className)}>
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
        </div>
      );

    case "unlock_pdf":
      return (
        <div className={cn("relative flex h-10 w-10 items-center justify-center rounded-none bg-slate-700 text-white shadow-xs", className)}>
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="0" ry="0" />
            <path d="M7 11V7a5 5 0 0 1 9.9-1" />
          </svg>
        </div>
      );

    case "protect_pdf":
      return (
        <div className={cn("relative flex h-10 w-10 items-center justify-center rounded-none bg-slate-700 text-white shadow-xs", className)}>
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="0" ry="0" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
      );

    default:
      return (
        <div className={cn("relative flex h-10 w-10 items-center justify-center rounded-none bg-sky-600 text-white shadow-xs", className)}>
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        </div>
      );
  }
}
