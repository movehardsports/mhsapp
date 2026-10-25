import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import SignInForm from "@/components/auth/SignInForm";
import { signUpLink } from "@/components/header/navigation";
import PageTitle from "@/components/ui/PageTitle";
import { textLink } from "@/components/ui/styles";
import { isSignedIn } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function SignInPage() {
  // Signed-in users have nothing to do here; the dashboard sends them on to their onboarding
  // if it isn't done.
  if (await isSignedIn()) redirect("/dashboard");

  return (
    <>
      <PageTitle>Sign in to your account</PageTitle>
      <SignInForm />
      <p className="mt-6 text-center text-sm text-foreground/70">
        Don&apos;t have an account?{" "}
        <Link href={signUpLink.href} className={textLink}>
          {signUpLink.label}
        </Link>
      </p>
      <p className="mt-2 text-center text-sm">
        <Link
          href="/reset-password"
          className="text-foreground/70 underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          Forgot password?
        </Link>
      </p>
    </>
  );
}
