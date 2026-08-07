"use client";

import {
  Combine, Scissors, Archive, Image, FileImage, FileText,
  FilePlus, RotateCw, Trash2, Droplets, Lock, ScanText,
} from "lucide-react";
import type { LucideProps } from "lucide-react";

const ICON_MAP: Record<string, React.ElementType<LucideProps>> = {
  Combine,
  Scissors,
  Archive,
  Image,
  FileImage,
  FileText,
  FilePlus,
  RotateCw,
  Trash2,
  Droplets,
  Lock,
  ScanText,
};

interface ToolIconProps extends LucideProps {
  name: string;
}

export function ToolIcon({ name, ...props }: ToolIconProps) {
  const Icon = ICON_MAP[name] ?? ScanText;
  return <Icon {...props} />;
}
