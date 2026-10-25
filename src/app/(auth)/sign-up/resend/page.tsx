import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ResendConfirmationForm from "@/components/auth/ResendConfirmationForm";
import PageTitle from "@/components/ui/PageTitle";
import { isSignedIn } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Resend confirmation link",
};

export default async function ResendConfirmationPage() {
  // Signed-in users have confirmed their email already.
  if (await isSignedIn()) redirect("/dashboard");

  return (
    <>
      <PageTitle>Get a new confirmation link</PageTitle>
      <p className="mb-6 text-foreground/70">
        Enter the email you signed up with. We&apos;ll send a new link to confirm it. Signing up
        again instead keeps the password and account type you chose the first time.
      </p>
      <ResendConfirmationForm />
    </>
  );
}
