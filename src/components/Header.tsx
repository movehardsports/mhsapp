import Link from "next/link";
import ExploreMenu from "@/components/ExploreMenu";
import MobileMenu from "@/components/MobileMenu";
import { navLinks } from "@/components/navigation";

export default function Header() {
  return (
    <header className="relative border-b border-foreground/10">
      <div className="mx-auto grid h-16 max-w-6xl grid-cols-[1fr_auto] items-center gap-6 px-4 md:grid-cols-[1fr_auto_1fr]">
        <Link href="/" className="justify-self-start text-xl font-bold tracking-tight">
          MHS
        </Link>
        <nav className="hidden items-center gap-6 text-sm uppercase tracking-wide md:flex">
          <ExploreMenu />
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-foreground/70 transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center justify-self-end gap-3 text-sm uppercase tracking-wide md:flex">
          <Link
            href="/sign-in"
            className="rounded-button px-4 py-2 transition-colors hover:bg-foreground/5"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="rounded-button bg-foreground px-4 py-2 font-medium text-background transition-opacity hover:opacity-90"
          >
            Sign up
          </Link>
        </div>
        <div className="justify-self-end md:hidden">
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
