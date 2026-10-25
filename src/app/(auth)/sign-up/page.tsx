import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import SignUpForm from "@/components/auth/SignUpForm";
import { signInLink } from "@/components/header/navigation";
import PageTitle from "@/components/ui/PageTitle";
import { textLink } from "@/components/ui/styles";
import { isSignedIn } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Sign up",
};

export default async function SignUpPage() {
  // Signed-in users have nothing to do here; the dashboard sends them on to their onboarding
  // if it isn't done.
  if (await isSignedIn()) redirect("/dashboard");

  return (
    <>
      <PageTitle>Create your account</PageTitle>
      <SignUpForm />
      <p className="mt-6 text-center text-sm text-foreground/70">
        Already have an account?{" "}
        <Link href={signInLink.href} className={textLink}>
          {signInLink.label}
        </Link>
      </p>
    </>
  );
}
