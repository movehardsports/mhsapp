import Link from "next/link";
import SignOutButton from "@/components/auth/SignOutButton";
import ExploreMenu from "@/components/header/ExploreMenu";
import MobileMenu from "@/components/header/MobileMenu";
import { navLinks, signInLink, signUpLink } from "@/components/header/navigation";
import { primaryButton } from "@/components/ui/styles";
import { signOut } from "@/lib/auth/actions";
import { getSignedInEmail } from "@/lib/auth/session";

export default async function Header() {
  const email = await getSignedInEmail();

  return (
    <header className="relative border-b border-foreground/10">
      <div className="mx-auto grid h-16 max-w-6xl grid-cols-[1fr_auto] items-center gap-6 px-4 md:grid-cols-[1fr_auto_1fr]">
        <Link href="/" className="justify-self-start text-xl font-bold tracking-tight">
          MHS
        </Link>
        <nav className="hidden items-center gap-6 text-sm tracking-wide uppercase md:flex">
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
        <div className="hidden items-center gap-3 justify-self-end text-sm tracking-wide uppercase md:flex">
          {email ? (
            <>
              <span
                title={email}
                className="max-w-48 truncate tracking-normal text-foreground/70 normal-case"
              >
                {email}
              </span>
              <form action={signOut}>
                <SignOutButton className="rounded-button px-4 py-2 tracking-wide uppercase transition-colors hover:bg-foreground/5" />
              </form>
            </>
          ) : (
            <>
              <Link
                href={signInLink.href}
                className="rounded-button px-4 py-2 transition-colors hover:bg-foreground/5"
              >
                {signInLink.label}
              </Link>
              <Link href={signUpLink.href} className={`${primaryButton} px-4 py-2`}>
                {signUpLink.label}
              </Link>
            </>
          )}
        </div>
        <div className="justify-self-end md:hidden">
          <MobileMenu email={email} />
        </div>
      </div>
    </header>
  );
}
