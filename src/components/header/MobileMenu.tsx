"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { exploreLinks, navLinks, signInLink, signUpLink } from "@/components/header/navigation";
import { primaryButton } from "@/components/ui/styles";

// Native modal <dialog> handles Escape, focus trapping and inerting the page.
export default function MobileMenu() {
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const openButtonRef = useRef<HTMLButtonElement>(null);

  const open = () => {
    dialogRef.current?.showModal();
    closeButtonRef.current?.focus();
  };
  const close = () => dialogRef.current?.close();

  // Close on any navigation, including browser back/forward.
  useEffect(() => {
    dialogRef.current?.close();
  }, [pathname]);

  // The menu is mobile-only, so close it when the viewport grows to desktop.
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 48rem)");
    const onChange = () => {
      if (desktop.matches) dialogRef.current?.close();
    };
    desktop.addEventListener("change", onChange);
    return () => desktop.removeEventListener("change", onChange);
  }, []);

  // Return focus explicitly: Safari doesn't focus buttons on click, so the dialog's
  // own restore can't be relied on. On desktop the hamburger is hidden; use the logo.
  const onDialogClose = () => {
    const openButton = openButtonRef.current;
    if (openButton?.checkVisibility()) {
      openButton.focus();
    } else {
      dialogRef.current?.closest("header")?.querySelector("a")?.focus();
    }
  };

  return (
    <>
      <button
        ref={openButtonRef}
        type="button"
        onClick={open}
        aria-haspopup="dialog"
        aria-controls="mobile-menu"
        aria-label="Open menu"
        className="-mr-2 flex h-10 w-10 items-center justify-center rounded-button transition-colors hover:bg-foreground/5"
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
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      <dialog
        ref={dialogRef}
        id="mobile-menu"
        aria-label="Menu"
        onClose={onDialogClose}
        className="m-0 h-dvh max-h-none w-full max-w-none flex-col overflow-y-auto border-0 bg-background p-0 text-foreground open:flex"
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-foreground/10 px-4">
          <Link href="/" onClick={close} className="text-xl font-bold tracking-tight">
            MHS
          </Link>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={close}
            aria-label="Close menu"
            className="-mr-2 flex h-10 w-10 items-center justify-center rounded-button transition-colors hover:bg-foreground/5"
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
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <nav className="flex flex-1 flex-col px-4 py-4 text-2xl font-semibold uppercase tracking-wide">
          <details className="group border-b border-foreground/10 py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between transition-opacity hover:opacity-70 [&::-webkit-details-marker]:hidden">
              Explore
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="transition-transform group-open:rotate-180"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </summary>
            <ul className="mt-3 flex flex-col gap-1 text-base uppercase tracking-wide">
              {exploreLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={close}
                    className="block py-2 transition-opacity hover:opacity-70"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={close}
              className="border-b border-foreground/10 py-5 transition-opacity hover:opacity-70"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="grid shrink-0 grid-cols-2 gap-3 px-4 pb-8 pt-4 text-sm uppercase tracking-wide">
          <Link
            href={signInLink.href}
            onClick={close}
            className="rounded-button border border-foreground/15 px-4 py-3 text-center transition-colors hover:bg-foreground/5"
          >
            {signInLink.label}
          </Link>
          <Link
            href={signUpLink.href}
            onClick={close}
            className={`${primaryButton} border border-transparent px-4 py-3 text-center`}
          >
            {signUpLink.label}
          </Link>
        </div>
      </dialog>
    </>
  );
}
