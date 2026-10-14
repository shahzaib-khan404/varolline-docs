import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/common/theme-provider";
import { QueryProvider } from "@/components/common/query-provider";
import { PresenceTracker } from "@/components/common/presence-tracker";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "uLovepdf — Free Online Document Processing",
    template: "%s | uLovepdf",
  },
  description:
    "Free, fast, and secure document processing. Merge, split, compress, convert PDFs and more — no account required.",
  keywords: [
    "PDF tools",
    "merge PDF",
    "split PDF",
    "compress PDF",
    "PDF to Word",
    "OCR",
    "free PDF editor",
  ],
  authors: [{ name: "uLovepdf" }],
  creator: "uLovepdf",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "uLovepdf",
    title: "uLovepdf — Free Online Document Processing",
    description:
      "Free, fast, and secure document processing. Merge, split, compress, convert PDFs and more.",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "uLovepdf — Free Online Document Processing",
    description:
      "Free, fast, and secure document processing. Merge, split, compress, convert PDFs and more.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0f11" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <PresenceTracker />
            {children}
          </QueryProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
