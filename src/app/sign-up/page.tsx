import type { Metadata } from "next";
import Link from "next/link";
import SignUpForm from "@/components/auth/SignUpForm";

export const metadata: Metadata = {
  title: "Sign up",
};

export default function SignUpPage() {
  return (
    <main className="mx-auto w-full max-w-sm px-4 py-16 lg:max-w-lg">
      <h1 className="mb-8 text-center text-2xl font-bold tracking-tight">Create your account</h1>
      <SignUpForm />
      <p className="mt-6 text-center text-sm text-foreground/70">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-foreground underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
