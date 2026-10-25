import type { Metadata } from "next";
import Link from "next/link";
import { resendConfirmationLink, signInLink } from "@/components/header/navigation";
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
        . Otherwise,{" "}
        <Link href={resendConfirmationLink.href} className={textLink}>
          get a new link
        </Link>
        .
      </p>
    </>
  );
}
