"use client";

import React from "react";
import { cn } from "@/lib/utils/cn";
import { ToolIcon } from "@/components/ui/tool-icon";

interface ILovePdfBadgeProps {
  toolId: string;
  className?: string;
}

/**
 * iLovePDF-style SVG badge icons with split dual-pod or custom accent graphics.
 */
export function ILovePdfBadge({ toolId, className }: ILovePdfBadgeProps) {
  switch (toolId) {
    case "merge_pdf":
      return (
        <div className={cn("relative flex h-12 w-12 items-center justify-center rounded-xl bg-[#e5322d] shadow-sm", className)}>
          {/* 2 arrows pointing into center */}
          <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 14l6-6m0 0H5m5 0v5" />
            <path d="M20 10l-6 6m0 0h5m-5 0v-5" />
          </svg>
        </div>
      );

    case "split_pdf":
      return (
        <div className={cn("relative flex h-12 w-12 items-center justify-center rounded-xl bg-[#e5322d] shadow-sm", className)}>
          {/* 2 arrows pointing apart */}
          <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 4l5 5m0 0h-5m5 0v-5" />
            <path d="M9 20l-5-5m0 0h5m-5 0v5" />
          </svg>
        </div>
      );

    case "compress_pdf":
      return (
        <div className={cn("relative flex h-12 w-12 items-center justify-center rounded-xl bg-[#00a859] shadow-sm", className)}>
          {/* 4 inward compression arrows */}
          <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4l5 5m0 0H5m4 0V5" />
            <path d="M20 4l-5 5m0 0h4m-4 0V5" />
            <path d="M4 20l5-5m0 0H5m4 0v4" />
            <path d="M20 20l-5-5m0 0h4m-4 0v4" />
          </svg>
        </div>
      );

    case "pdf_to_word":
      return (
        <div className={cn("relative flex h-12 w-12 items-center justify-center", className)}>
          {/* Background PDF card (light red/gray) */}
          <div className="absolute top-0 left-0 flex h-7 w-7 items-center justify-center rounded-lg bg-red-100 text-[#e5322d]">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M7 17l10-10M17 7H7m10 0v10" />
            </svg>
          </div>
          {/* Foreground Word card (solid blue 'W') */}
          <div className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-lg bg-[#2b579a] text-white shadow-sm font-bold text-xs">
            W
          </div>
        </div>
      );

    case "pdf_to_powerpoint":
    case "powerpoint_to_pdf":
      return (
        <div className={cn("relative flex h-12 w-12 items-center justify-center", className)}>
          {/* Background card */}
          <div className="absolute top-0 left-0 flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 text-[#d24726]">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M7 17l10-10M17 7H7m10 0v10" />
            </svg>
          </div>
          {/* Foreground PowerPoint card (solid orange 'P') */}
          <div className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-lg bg-[#d24726] text-white shadow-sm font-bold text-xs">
            P
          </div>
        </div>
      );

    case "pdf_to_excel":
    case "excel_to_pdf":
      return (
        <div className={cn("relative flex h-12 w-12 items-center justify-center", className)}>
          {/* Background card */}
          <div className="absolute top-0 left-0 flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-[#217346]">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M7 17l10-10M17 7H7m10 0v10" />
            </svg>
          </div>
          {/* Foreground Excel card (solid green 'X') */}
          <div className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-lg bg-[#217346] text-white shadow-sm font-bold text-xs">
            X
          </div>
        </div>
      );

    case "word_to_pdf":
      return (
        <div className={cn("relative flex h-12 w-12 items-center justify-center", className)}>
          {/* Background Word card */}
          <div className="absolute top-0 left-0 flex h-7 w-7 items-center justify-center rounded-lg bg-[#2b579a] text-white font-bold text-xs shadow-sm">
            W
          </div>
          {/* Foreground PDF card */}
          <div className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-lg bg-[#e5322d] text-white shadow-sm">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M17 7l-10 10m0 0h10m-10 0V7" />
            </svg>
          </div>
        </div>
      );

    case "edit_pdf":
      return (
        <div className={cn("relative flex h-12 w-12 items-center justify-center rounded-xl bg-[#a05282] shadow-sm", className)}>
          <ToolIcon name="PencilSimple" size={24} className="text-white" />
        </div>
      );

    case "pdf_to_image":
    case "image_to_pdf":
      return (
        <div className={cn("relative flex h-12 w-12 items-center justify-center", className)}>
          <div className="absolute top-0 left-0 flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700 font-bold text-[10px]">
            JPG
          </div>
          <div className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-lg bg-[#e5322d] text-white shadow-sm">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M17 7l-10 10m0 0h10m-10 0V7" />
            </svg>
          </div>
        </div>
      );

    case "sign_pdf":
      return (
        <div className={cn("relative flex h-12 w-12 items-center justify-center rounded-xl bg-[#2b579a] shadow-sm", className)}>
          <ToolIcon name="PenNib" size={24} className="text-white" />
        </div>
      );

    case "watermark_pdf":
      return (
        <div className={cn("relative flex h-12 w-12 items-center justify-center rounded-xl bg-[#a05282] shadow-sm", className)}>
          <ToolIcon name="Stamp" size={24} className="text-white" />
        </div>
      );

    case "rotate_pdf":
      return (
        <div className={cn("relative flex h-12 w-12 items-center justify-center rounded-xl bg-[#a05282] shadow-sm", className)}>
          <ToolIcon name="ArrowsClockwise" size={24} className="text-white" />
        </div>
      );

    case "unlock_pdf":
      return (
        <div className={cn("relative flex h-12 w-12 items-center justify-center rounded-xl bg-[#f59e0b] shadow-sm", className)}>
          <ToolIcon name="LockKeyOpen" size={24} className="text-white" />
        </div>
      );

    case "password_protect":
      return (
        <div className={cn("relative flex h-12 w-12 items-center justify-center rounded-xl bg-[#374151] shadow-sm", className)}>
          <ToolIcon name="LockKey" size={24} className="text-white" />
        </div>
      );

    case "organize_pdf":
      return (
        <div className={cn("relative flex h-12 w-12 items-center justify-center rounded-xl bg-[#8b5cf6] shadow-sm", className)}>
          <ToolIcon name="SquaresFour" size={24} className="text-white" />
        </div>
      );

    case "crop_pdf":
      return (
        <div className={cn("relative flex h-12 w-12 items-center justify-center rounded-xl bg-[#ec4899] shadow-sm", className)}>
          <ToolIcon name="Crop" size={24} className="text-white" />
        </div>
      );

    case "page_numbers":
      return (
        <div className={cn("relative flex h-12 w-12 items-center justify-center rounded-xl bg-[#0284c7] shadow-sm", className)}>
          <ToolIcon name="TextT" size={24} className="text-white" />
        </div>
      );

    case "ocr_extraction":
    case "ocr_pdf":
      return (
        <div className={cn("relative flex h-12 w-12 items-center justify-center rounded-xl bg-[#0d9488] shadow-sm", className)}>
          <ToolIcon name="Scan" size={24} className="text-white" />
        </div>
      );

    case "repair_pdf":
      return (
        <div className={cn("relative flex h-12 w-12 items-center justify-center rounded-xl bg-[#ea580c] shadow-sm", className)}>
          <ToolIcon name="Wrench" size={24} className="text-white" />
        </div>
      );

    case "delete_pages":
      return (
        <div className={cn("relative flex h-12 w-12 items-center justify-center rounded-xl bg-[#e11d48] shadow-sm", className)}>
          <ToolIcon name="Trash" size={24} className="text-white" />
        </div>
      );

    case "redact_pdf":
      return (
        <div className={cn("relative flex h-12 w-12 items-center justify-center rounded-xl bg-[#dc2626] shadow-sm", className)}>
          <ToolIcon name="EyeSlash" size={24} className="text-white" />
        </div>
      );

    default:
      return (
        <div className={cn("relative flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white shadow-sm", className)}>
          <ToolIcon name="Files" size={24} />
        </div>
      );
  }
}
