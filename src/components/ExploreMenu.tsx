"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { exploreLinks } from "@/components/navigation";

// Native popover handles opening, closing on outside click and Escape, and focus order.
export default function ExploreMenu() {
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);

  const close = () => {
    const panel = panelRef.current;
    if (panel?.matches(":popover-open")) panel.hidePopover();
  };

  // Close on any navigation, including browser back/forward.
  useEffect(() => {
    const panel = panelRef.current;
    if (panel?.matches(":popover-open")) panel.hidePopover();
  }, [pathname]);

  // The menu is desktop-only, so close it when the viewport shrinks to mobile.
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 48rem)");
    const onChange = () => {
      const panel = panelRef.current;
      if (!desktop.matches && panel?.matches(":popover-open")) panel.hidePopover();
    };
    desktop.addEventListener("change", onChange);
    return () => desktop.removeEventListener("change", onChange);
  }, []);

  return (
    <div className="group">
      <button
        type="button"
        popoverTarget="explore-menu"
        className="flex items-center gap-1 uppercase tracking-wide text-foreground/70 transition-colors hover:text-foreground group-has-[:popover-open]:text-foreground"
      >
        Explore
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="transition-transform group-has-[:popover-open]:rotate-180"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {/* In the top layer, `absolute` is relative to the page, so top-[4.25rem] sits just below the header. */}
      <div
        ref={panelRef}
        id="explore-menu"
        popover="auto"
        role="group"
        aria-label="Explore"
        className="absolute inset-auto left-1/2 top-[4.25rem] m-0 w-[32rem] -translate-x-1/2 rounded-2xl border border-foreground/10 bg-background p-6 text-foreground normal-case tracking-normal shadow-xl"
      >
        <ul className="grid grid-cols-2 gap-2">
          {exploreLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                onClick={close}
                className="block rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-foreground/5"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
