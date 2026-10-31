import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy Policy — uLovepdf" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="mb-10 text-sm text-muted-foreground">Last updated: November 2026</p>

      <div className="space-y-6 text-muted-foreground">
        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">What we collect</h2>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>Email address and name when you create an account.</li>
            <li>Files you upload for processing (deleted within 1 hour).</li>
            <li>Basic usage logs (tool used, file size, timestamp) for system reliability.</li>
            <li>
              Anonymous presence telemetry (an ephemeral browser identifier, browser name, device type, and active page)
              to gauge real-time concurrent system load and traffic capacity. This telemetry is retained exclusively in volatile
              server memory and automatically pruned within 45 seconds.
            </li>
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
          <h2 className="mb-2 text-base font-semibold text-foreground">File storage & retention</h2>
          <p className="text-sm">
            Uploaded files and outputs are stored temporarily in isolated storage with expiring, cryptographically signed
            HMAC access tokens. Stored processing artifacts are automatically and permanently deleted within 1 hour. No backups
            of your files are retained.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">Third-party services</h2>
          <p className="text-sm">
            We use Google OAuth for optional sign-in. If you sign in with Google, we receive only your verified email and name
            from Google. We do not share or distribute this data further.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">Your rights</h2>
          <p className="text-sm">
            You may delete your account at any time from Settings. All associated profile data is removed immediately.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">Contact</h2>
          <p className="text-sm">
            Privacy concerns? Email{" "}
            <a href="mailto:privacy@ulovepdf.com" className="text-primary underline">
              privacy@ulovepdf.com
            </a>
          </p>
        </section>
      </div>

      <div className="mt-10 border-t pt-6">
        <Link href="/terms" className="text-sm text-primary hover:underline">
          Terms of Service →
        </Link>
      </div>
    </main>
  );
}
