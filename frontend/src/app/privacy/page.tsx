import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy Policy — Varolline Docs" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="mb-10 text-sm text-muted-foreground">Last updated: August 2026</p>

      <div className="space-y-6 text-muted-foreground">
        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">What we collect</h2>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>Email address and name when you create an account.</li>
            <li>Files you upload for processing (deleted within 1 hour).</li>
            <li>Basic usage logs (tool used, file size, timestamp) for reliability.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">What we do not collect</h2>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>We do not read or analyze the contents of your files.</li>
            <li>We do not sell your data to third parties.</li>
            <li>We do not track you across other websites.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">File storage</h2>
          <p className="text-sm">Uploaded files and outputs are stored temporarily in encrypted object storage and permanently deleted within 1 hour. No backups of your files are retained.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">Third-party services</h2>
          <p className="text-sm">We use Google OAuth for sign-in (optional). If you sign in with Google, we receive your email and name from Google. We do not share this data further.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">Your rights</h2>
          <p className="text-sm">You may delete your account at any time from Settings. All associated data is removed within 24 hours.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">Contact</h2>
          <p className="text-sm">Privacy concerns? Email <a href="mailto:privacy@varollinedocs.com" className="text-primary underline">privacy@varollinedocs.com</a></p>
        </section>
      </div>

      <div className="mt-10 border-t pt-6">
        <Link href="/terms" className="text-sm text-primary hover:underline">Terms of Service →</Link>
      </div>
    </main>
  );
}
