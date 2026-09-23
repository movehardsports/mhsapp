import type { Metadata } from "next";
import Link from "next/link";
import SignInForm from "@/components/auth/SignInForm";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function SignInPage() {
  return (
    <main className="mx-auto w-full max-w-sm px-4 py-16 lg:max-w-lg">
      <h1 className="mb-8 text-center text-2xl font-bold tracking-tight">Sign in to your account</h1>
      <SignInForm />
      <p className="mt-6 text-center text-sm text-foreground/70">
        Don&apos;t have an account?{" "}
        <Link href="/sign-up" className="font-medium text-foreground underline-offset-4 hover:underline">
          Sign up
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
    </main>
  );
}
