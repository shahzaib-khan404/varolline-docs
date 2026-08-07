import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Terms of Service — Varolline Docs" };

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">Terms of Service</h1>
      <p className="mb-10 text-sm text-muted-foreground">Last updated: August 2026</p>

      <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-muted-foreground">
        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">1. Acceptance</h2>
          <p>By using Varolline Docs you agree to these Terms. If you do not agree, please do not use the service.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">2. Use of the service</h2>
          <p>You may use Varolline Docs for lawful purposes only. You must not upload files containing malware, illegal content, or content that violates the rights of others.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">3. File retention</h2>
          <p>Uploaded files and processed outputs are automatically deleted within 1 hour of creation. We do not store or inspect your file contents beyond what is necessary to perform the requested operation.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">4. Availability</h2>
          <p>We provide Varolline Docs on an "as is" basis. We make no guarantees about uptime, accuracy of outputs, or fitness for a particular purpose.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">5. Changes</h2>
          <p>We may update these Terms at any time. Continued use after changes constitutes acceptance.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">6. Contact</h2>
          <p>Questions? Email us at <a href="mailto:support@varollinedocs.com" className="text-primary underline">support@varollinedocs.com</a></p>
        </section>
      </div>

      <div className="mt-10 border-t pt-6">
        <Link href="/privacy" className="text-sm text-primary hover:underline">Privacy Policy →</Link>
      </div>
    </main>
  );
}
