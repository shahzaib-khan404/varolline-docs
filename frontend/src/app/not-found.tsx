import Link from "next/link";
import { FileX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 text-center">
      <div className="rounded-full bg-muted p-6">
        <FileX className="h-12 w-12 text-muted-foreground" />
      </div>
      <div>
        <h1 className="text-4xl font-bold tracking-tight">404</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Page not found
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
      </div>
      <Link
        href="/"
        className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Go home
      </Link>
    </div>
  );
}
