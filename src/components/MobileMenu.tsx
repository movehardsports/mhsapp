"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type NavLink = { href: string; label: string };

export default function MobileMenu({ links }: { links: NavLink[] }) {
  const pathname = usePathname();
  // Menu is tied to the path it was opened on, so any navigation closes it.
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;
  const close = () => setOpenedOn(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenedOn(null);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpenedOn(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <div ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpenedOn(open ? null : pathname)}
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        className="-mr-2 flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-foreground/5"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          {open ? (
            <path d="M6 6l12 12M18 6L6 18" />
          ) : (
            <path d="M4 7h16M4 12h16M4 17h16" />
          )}
        </svg>
      </button>

      {open && (
        <div
          id="mobile-menu"
          className="absolute inset-x-0 top-full z-50 border-b border-foreground/10 bg-background"
        >
          <nav className="flex flex-col px-4 py-2 text-sm uppercase tracking-wide">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={close}
                className="py-3 text-foreground/70 transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex flex-col gap-3 border-t border-foreground/10 px-4 py-4 text-sm uppercase tracking-wide">
            <Link
              href="/sign-in"
              onClick={close}
              className="rounded-full border border-foreground/15 px-4 py-2 text-center transition-colors hover:bg-foreground/5"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              onClick={close}
              className="rounded-md bg-foreground px-4 py-2 text-center font-medium text-background transition-opacity hover:opacity-90"
            >
              Sign up
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
