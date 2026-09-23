import Link from "next/link";
import ExploreMenu from "@/components/header/ExploreMenu";
import MobileMenu from "@/components/header/MobileMenu";
import { navLinks, signInLink, signUpLink } from "@/components/header/navigation";
import { primaryButton } from "@/components/ui/styles";

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
            href={signInLink.href}
            className="rounded-button px-4 py-2 transition-colors hover:bg-foreground/5"
          >
            {signInLink.label}
          </Link>
          <Link
            href={signUpLink.href}
            className={`${primaryButton} px-4 py-2`}
          >
            {signUpLink.label}
          </Link>
        </div>
        <div className="justify-self-end md:hidden">
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
