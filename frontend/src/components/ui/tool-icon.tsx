"use client";

import React from "react";
import {
  Files,
  Scissors,
  Archive,
  Image,
  Images,
  FileDoc,
  FilePdf,
  FilePlus,
  FileText,
  ArrowsClockwise,
  Trash,
  Drop,
  Stamp,
  LockKey,
  ShieldCheck,
  Scan,
  TextT,
  FileArchive,
  FileImage,
  LockKeyOpen,
  Crop,
  Wrench,
  SquaresFour,
  Presentation,
  Table,
  FileCode,
  Certificate,
  PencilSimple,
  PenNib,
  EyeSlash,
  CheckSquare,
  GitDiff,
  type IconProps,
  type IconWeight,
} from "@phosphor-icons/react";

const ICON_MAP: Record<string, React.ComponentType<IconProps>> = {
  // Phosphor Canonical Names
  Files,
  Scissors,
  Archive,
  FileArchive,
  Image,
  FileImage,
  Images,
  FileText,
  FileDoc,
  FilePdf,
  FilePlus,
  ArrowsClockwise,
  Trash,
  Drop,
  Stamp,
  LockKey,
  ShieldCheck,
  Scan,
  TextT,
  LockKeyOpen,
  Crop,
  Wrench,
  SquaresFour,
  Presentation,
  Table,
  FileCode,
  Certificate,
  PencilSimple,
  PenNib,
  EyeSlash,
  CheckSquare,
  GitDiff,

  // Semantic & Lucide alias compatibility for identical icons
  Combine: Files,
  Cut: Scissors,
  RotateCw: ArrowsClockwise,
  Trash2: Trash,
  Droplets: Drop,
  Watermark: Stamp,
  Lock: LockKey,
  Unlock: LockKeyOpen,
  ScanText: Scan,
  Ocr: Scan,
  Pencil: PencilSimple,
  Pen: PenNib,
  Signature: PenNib,
  Type: TextT,
  Hash: TextT,
  Numbers: TextT,
  PageNumber: TextT,
  Compare: GitDiff,
  GitCompare: GitDiff,
  EyeOff: EyeSlash,
  Award: Certificate,
};

export interface ToolIconProps extends React.SVGAttributes<SVGSVGElement> {
  name: string;
  size?: number | string;
  color?: string;
  weight?: IconWeight;
  mirrored?: boolean;
  className?: string;
}

export function ToolIcon({ name, weight = "bold", ...props }: ToolIconProps) {
  const Icon = ICON_MAP[name] ?? Scan;
  return <Icon weight={weight} {...props} />;
}

