import type { Metadata } from "next";
import Link from "next/link";
import { campaignsLink } from "@/components/header/navigation";
import PageTitle from "@/components/ui/PageTitle";
import { textLink } from "@/components/ui/styles";

export const metadata: Metadata = {
  title: "Page not found",
};

// For URLs that match no route and for `notFound()` calls (e.g. an unknown campaign). Also
// where header links to pages that don't exist yet land.
export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-sm px-4 py-16 lg:max-w-lg">
      <PageTitle>Page not found</PageTitle>
      <p className="text-center text-foreground/70">
        This page doesn&apos;t exist, or isn&apos;t ready yet.{" "}
        <Link href={campaignsLink.href} className={textLink}>
          Browse campaigns
        </Link>{" "}
        instead.
      </p>
    </main>
  );
}
