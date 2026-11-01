import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="mb-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">Terms of Service</h1>
      <p className="mb-8 text-xs text-muted-foreground">Last updated: August 2026</p>

      <div className="space-y-6 text-muted-foreground">
        <section className="rounded-none border border-border/70 bg-card/50 backdrop-blur-md p-5">
          <h2 className="mb-2 text-sm font-bold text-foreground">1. Acceptance</h2>
          <p className="text-xs leading-relaxed">By using uLovepdf you agree to these Terms. If you do not agree, please do not use the service.</p>
        </section>

        <section className="rounded-none border border-border/70 bg-card/50 backdrop-blur-md p-5">
          <h2 className="mb-2 text-sm font-bold text-foreground">2. Use of the service</h2>
          <p className="text-xs leading-relaxed">You may use uLovepdf for lawful purposes only. You must not upload files containing malware, illegal content, or content that violates the rights of others.</p>
        </section>

        <section className="rounded-none border border-border/70 bg-card/50 backdrop-blur-md p-5">
          <h2 className="mb-2 text-sm font-bold text-foreground">3. File retention</h2>
          <p className="text-xs leading-relaxed">Uploaded files and processed outputs are automatically deleted within 24 hours of creation. We do not store or inspect your file contents beyond what is necessary to perform the requested operation.</p>
        </section>

        <section className="rounded-none border border-border/70 bg-card/50 backdrop-blur-md p-5">
          <h2 className="mb-2 text-sm font-bold text-foreground">4. Availability</h2>
          <p className="text-xs leading-relaxed">We provide uLovepdf on an "as is" basis. We make no guarantees about uptime, accuracy of outputs, or fitness for a particular purpose.</p>
        </section>

        <section className="rounded-none border border-border/70 bg-card/50 backdrop-blur-md p-5">
          <h2 className="mb-2 text-sm font-bold text-foreground">5. Changes</h2>
          <p className="text-xs leading-relaxed">We may update these Terms at any time. Continued use after changes constitutes acceptance.</p>
        </section>

        <section className="rounded-none border border-border/70 bg-card/50 backdrop-blur-md p-5">
          <h2 className="mb-2 text-sm font-bold text-foreground">6. Contact</h2>
          <p className="text-xs leading-relaxed">Questions? Email us at <a href="mailto:support@ulovepdf.com" className="text-primary underline">support@ulovepdf.com</a></p>
        </section>
      </div>

      <div className="mt-8 border-t border-border pt-5">
        <Link href="/privacy" className="text-xs font-semibold text-primary hover:underline">Privacy Policy →</Link>
      </div>
    </main>
  );
}
