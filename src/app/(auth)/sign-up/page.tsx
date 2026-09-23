import type { Metadata } from "next";
import Link from "next/link";
import SignUpForm from "@/components/auth/SignUpForm";
import { signInLink } from "@/components/header/navigation";
import PageTitle from "@/components/ui/PageTitle";
import { textLink } from "@/components/ui/styles";

export const metadata: Metadata = {
  title: "Sign up",
};

export default function SignUpPage() {
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
