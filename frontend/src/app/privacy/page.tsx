import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="mb-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">Privacy Policy</h1>
      <p className="mb-8 text-xs text-muted-foreground">Last updated: November 2026</p>

      <div className="space-y-6 text-muted-foreground">
        <section className="rounded-none border border-border/70 bg-card/50 backdrop-blur-md p-5">
          <h2 className="mb-2 text-sm font-bold text-foreground">What we collect</h2>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li>Email address and name when you create an account.</li>
            <li>Files you upload for processing (deleted within 24 hours).</li>
            <li>Basic usage logs (tool used, file size, timestamp) for system reliability.</li>
            <li>
              Anonymous presence telemetry (an ephemeral browser identifier, browser name, device type, and active page)
              to gauge real-time concurrent system load and traffic capacity. Retained exclusively in volatile memory.
            </li>
          </ul>
        </section>

        <section className="rounded-none border border-border/70 bg-card/50 backdrop-blur-md p-5">
          <h2 className="mb-2 text-sm font-bold text-foreground">What we do not collect</h2>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li>We do not read or analyze the contents of your files.</li>
            <li>We do not sell your data to third parties.</li>
            <li>We do not track you across other websites.</li>
          </ul>
        </section>

        <section className="rounded-none border border-border/70 bg-card/50 backdrop-blur-md p-5">
          <h2 className="mb-2 text-sm font-bold text-foreground">File storage & retention</h2>
          <p className="text-xs leading-relaxed">
            Uploaded files and outputs are stored temporarily in isolated storage with expiring, cryptographically signed
            HMAC access tokens. Stored processing artifacts are automatically and permanently deleted within 24 hours. No backups
            of your files are retained.
          </p>
        </section>

        <section className="rounded-none border border-border/70 bg-card/50 backdrop-blur-md p-5">
          <h2 className="mb-2 text-sm font-bold text-foreground">Third-party services</h2>
          <p className="text-xs leading-relaxed">
            We use Google OAuth for optional sign-in. If you sign in with Google, we receive only your verified email and name
            from Google. We do not share or distribute this data further.
          </p>
        </section>

        <section className="rounded-none border border-border/70 bg-card/50 backdrop-blur-md p-5">
          <h2 className="mb-2 text-sm font-bold text-foreground">Your rights</h2>
          <p className="text-xs leading-relaxed">
            You may delete your account at any time from Settings. All associated profile data is removed immediately.
          </p>
        </section>

        <section className="rounded-none border border-border/70 bg-card/50 backdrop-blur-md p-5">
          <h2 className="mb-2 text-sm font-bold text-foreground">Contact</h2>
          <p className="text-xs">
            Privacy concerns? Email{" "}
            <a href="mailto:privacy@ulovepdf.com" className="text-primary underline">
              privacy@ulovepdf.com
            </a>
          </p>
        </section>
      </div>

      <div className="mt-8 border-t border-border pt-5">
        <Link href="/terms" className="text-xs font-semibold text-primary hover:underline">
          Terms of Service →
        </Link>
      </div>
    </main>
  );
}
