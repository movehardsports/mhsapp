"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

// Set when the athlete submits Apply or Withdraw: the page they were on, and when.
let focusRequest: { pathname: string; at: number } | null = null;

// Applying or withdrawing re-renders the page in place and swaps the Apply section (the form for
// "Your application" and back), which drops focus to the page body. The forms call this on
// submit, so the new section's heading takes focus once it appears.
export function requestSectionFocus() {
  focusRequest = { pathname: window.location.pathname, at: Date.now() };
}

// Clears a request that won't be met, e.g. when the form shows an error instead.
export function cancelSectionFocus() {
  focusRequest = null;
}

// The Apply section's heading. Give it a `key` per title so it mounts afresh when the section
// swaps. It takes focus only for a recent request from this page, never on a plain visit.
export default function SectionHeading({ id, children }: { id: string; children: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const request = focusRequest;
    if (!request || request.pathname !== pathname || Date.now() - request.at > 10_000) return;
    focusRequest = null;
    ref.current?.focus();
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
