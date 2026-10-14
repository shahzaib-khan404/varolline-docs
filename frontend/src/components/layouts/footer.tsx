import Link from "next/link";
import { FileText, Github, Twitter } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const FOOTER_LINKS = {
  Tools: [
    { label: "Merge PDF", href: "/tools/merge-pdf" },
    { label: "Split PDF", href: "/tools/split-pdf" },
    { label: "Compress PDF", href: "/tools/compress-pdf" },
    { label: "PDF to Word", href: "/tools/pdf-to-word" },
    { label: "OCR Text", href: "/tools/ocr" },
  ],
  Convert: [
    { label: "PDF to Image", href: "/tools/pdf-to-image" },
    { label: "Image to PDF", href: "/tools/image-to-pdf" },
    { label: "Word to PDF", href: "/tools/word-to-pdf" },
    { label: "Rotate PDF", href: "/tools/rotate-pdf" },
    { label: "Protect PDF", href: "/tools/protect-pdf" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Sign up free", href: "/auth/register" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Top row */}
        <div className="grid grid-cols-2 gap-8 md:grid-cols-6">
          {/* Brand */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2.5 font-bold tracking-tight group">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500 via-cyan-500 to-blue-600 text-white shadow-md shadow-sky-500/30 group-hover:scale-105 transition-transform">
                <FileText className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-extrabold tracking-tight text-foreground group-hover:text-primary transition-colors">
                uLove<span className="gradient-text font-black">pdf</span>
              </span>
            </Link>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              Free, open-source document processing. No sign-up required for
              basic tools. Always free, forever.
            </p>
            <div className="mt-4 flex gap-3">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="GitHub"
              >
                <Github className="h-4 w-4" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="Twitter"
              >
                <Twitter className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([category, links]) => (
            <div key={category}>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {category}
              </p>
              <ul className="mt-3 space-y-2">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="my-8" />

        {/* Bottom row */}
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} uLovepdf. Open source under MIT
            license.
          </p>
          <p className="text-sm text-muted-foreground">
            Built with{" "}
            <span className="text-foreground">Next.js 15 + FastAPI</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
