"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

// The page the heading was last shown on, kept across client-side renders.
let lastPathname: string | null = null;

// The Apply section's heading. Applying or withdrawing re-renders the page in place and swaps
// the section (the form for "Your application" and back), which drops focus to the page body.
// Then the new heading takes focus, so keyboard users stay in place and screen readers announce
// it. Give it a `key` per title so it remounts when the section swaps. Not on a fresh visit:
// only when the section was already shown on this same page.
export default function SectionHeading({ id, children }: { id: string; children: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const samePage = lastPathname === pathname;
    lastPathname = pathname;
    if (samePage && document.activeElement === document.body) ref.current?.focus();
  }, [pathname]);

  return (
    <h2
      ref={ref}
      id={id}
      tabIndex={-1}
      className="mb-4 text-lg font-bold tracking-tight focus:outline-none"
    >
      {children}
    </h2>
  );
}
