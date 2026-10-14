declare module "@phosphor-icons/react/dist/ssr" {
  import * as React from "react";

  export type IconWeight = "thin" | "light" | "regular" | "bold" | "fill" | "duotone";

  export interface IconProps extends React.SVGAttributes<SVGSVGElement> {
    alt?: string;
    color?: string;
    size?: string | number;
    weight?: IconWeight;
    mirrored?: boolean;
    className?: string;
  }

  export type Icon = React.ForwardRefExoticComponent<
    IconProps & React.RefAttributes<SVGSVGElement>
  >;

  export const Files: Icon;
  export const Scissors: Icon;
  export const Archive: Icon;
  export const Image: Icon;
  export const Images: Icon;
  export const FileDoc: Icon;
  export const FilePdf: Icon;
  export const FilePlus: Icon;
  export const FileText: Icon;
  export const ArrowsClockwise: Icon;
  export const Trash: Icon;
  export const Drop: Icon;
  export const Stamp: Icon;
  export const LockKey: Icon;
  export const ShieldCheck: Icon;
  export const Scan: Icon;
  export const TextT: Icon;
  export const FileArchive: Icon;
  export const FileImage: Icon;
  export const LockKeyOpen: Icon;
  export const Crop: Icon;
  export const Wrench: Icon;
  export const SquaresFour: Icon;
  export const Presentation: Icon;
  export const Table: Icon;
  export const FileCode: Icon;
  export const Certificate: Icon;
  export const PencilSimple: Icon;
  export const PenNib: Icon;
  export const EyeSlash: Icon;
  export const CheckSquare: Icon;
  export const GitDiff: Icon;
  const FallbackIcon: Icon;
  export default FallbackIcon;
}

declare module "@phosphor-icons/react" {
  import * as React from "react";

  export type IconWeight = "thin" | "light" | "regular" | "bold" | "fill" | "duotone";

  export interface IconProps extends React.SVGAttributes<SVGSVGElement> {
    alt?: string;
    color?: string;
    size?: string | number;
    weight?: IconWeight;
    mirrored?: boolean;
    className?: string;
  }

  export type Icon = React.ForwardRefExoticComponent<
    IconProps & React.RefAttributes<SVGSVGElement>
  >;

  export const Files: Icon;
  export const Scissors: Icon;
  export const Archive: Icon;
  export const Image: Icon;
  export const Images: Icon;
  export const FileDoc: Icon;
  export const FilePdf: Icon;
  export const FilePlus: Icon;
  export const FileText: Icon;
  export const ArrowsClockwise: Icon;
  export const Trash: Icon;
  export const Drop: Icon;
  export const Stamp: Icon;
  export const LockKey: Icon;
  export const ShieldCheck: Icon;
  export const Scan: Icon;
  export const TextT: Icon;
  export const FileArchive: Icon;
  export const FileImage: Icon;
  export const LockKeyOpen: Icon;
  export const Crop: Icon;
  export const Wrench: Icon;
  export const SquaresFour: Icon;
  export const Presentation: Icon;
  export const Table: Icon;
  export const FileCode: Icon;
  export const Certificate: Icon;
  export const PencilSimple: Icon;
  export const PenNib: Icon;
  export const EyeSlash: Icon;
  export const CheckSquare: Icon;
  export const GitDiff: Icon;
  const FallbackIcon: Icon;
  export default FallbackIcon;
}
