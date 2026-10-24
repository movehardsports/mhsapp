"use client";

import Link from "next/link";
import { useEffect } from "react";
import PageTitle from "@/components/ui/PageTitle";
import { primaryButton, textLink } from "@/components/ui/styles";

// Shown when a page or Server Action throws, e.g. when reading from the database fails. Inside
// the root layout, so the header stays. In production the message is generic; `digest` matches
// the server log entry. `retry` renders the page again; it doesn't re-run a failed action.
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto w-full max-w-sm px-4 py-16 lg:max-w-lg">
      {/* Client components can't export metadata; React hoists this into <head>. */}
      <title>Something went wrong | MHS</title>
      <PageTitle>Something went wrong</PageTitle>
      <p className="text-center text-foreground/70">
        Something went wrong on our side. Try again, or come back in a moment.
      </p>
      <div className="mt-8 flex flex-col items-center gap-4">
        <button
          type="button"
          onClick={() => retry()}
          className={`${primaryButton} px-4 py-2.5 text-sm tracking-wide uppercase`}
        >
          Try again
        </button>
        <Link href="/" className={`${textLink} text-sm`}>
          Go to the home page
        </Link>
      </div>
    </main>
  );
}
