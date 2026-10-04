import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SubmitButton from "@/components/forms/SubmitButton";
import PageTitle from "@/components/ui/PageTitle";
import { confirmEmail } from "./actions";

export const metadata: Metadata = {
  title: "Confirm your email",
};

// The link in the sign-up confirmation email (supabase/templates/confirmation.html) lands here.
// Opening the link doesn't use up its one-time token: mail scanners (like Outlook Safe Links)
// open links before the user does. Only the button's POST confirms the email.
export default async function ConfirmEmailPage({ searchParams }: PageProps<"/auth/confirm">) {
  const { token_hash: tokenHash, type } = await searchParams;
  // Only sign-up confirmations come through here for now.
  if (typeof tokenHash !== "string" || type !== "email") redirect("/sign-up/confirm-error");

  return (
    <>
      <PageTitle>Confirm your email</PageTitle>
      <form action={confirmEmail} className="flex flex-col gap-5">
        <input type="hidden" name="token_hash" value={tokenHash} />
        <p className="text-foreground/70">Confirm your email address to finish signing up.</p>
        <SubmitButton>Confirm email</SubmitButton>
      </form>
    </>
  );
}
