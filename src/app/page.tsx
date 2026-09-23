import Link from "next/link";
import { signUpLink } from "@/components/header/navigation";
import { primaryButton } from "@/components/ui/styles";

// Placeholder until the real landing page is designed.
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-6 px-4 py-24 text-center">
      <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Move Hard Sports</h1>
      <p className="max-w-md text-lg text-foreground/70">Where athletes and brands meet.</p>
      <Link href={signUpLink.href} className={`${primaryButton} px-6 py-3 text-sm uppercase tracking-wide`}>
        Get started
      </Link>
    </main>
  );
}
