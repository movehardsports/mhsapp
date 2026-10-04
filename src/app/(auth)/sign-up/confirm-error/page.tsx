import type { Metadata } from "next";
import Link from "next/link";
import { signInLink, signUpLink } from "@/components/header/navigation";
import PageTitle from "@/components/ui/PageTitle";
import { textLink } from "@/components/ui/styles";

export const metadata: Metadata = {
  title: "Confirmation link not valid",
};

export default function ConfirmErrorPage() {
  return (
    <>
      <PageTitle>This link doesn&apos;t work</PageTitle>
      <p className="text-foreground/70">
        The confirmation link is invalid, has expired or was already used. If you already confirmed
        your email,{" "}
        <Link href={signInLink.href} className={textLink}>
          sign in
        </Link>
        . Otherwise{" "}
        <Link href={signUpLink.href} className={textLink}>
          sign up again
        </Link>{" "}
        with the same email to get a new link.
      </p>
      {/* The profile is created once, on the first sign-up (see supabase/migrations). */}
      <p className="mt-3 text-foreground/70">
        Your account keeps the account type you chose the first time.
      </p>
    </>
  );
}
