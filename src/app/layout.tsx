import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Header from "@/components/header/Header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | MHS",
    default: "MHS",
  },
  description: "Move Hard Sports connects athletes and brands.",
};

// The browser UI (e.g. the mobile address bar) matches the page background in globals.css.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        {/* Lets keyboard users jump past the header; hidden until it gets focus. */}
        <a
          href="#content"
          className="sr-only rounded-button bg-foreground text-sm font-medium text-background focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2"
        >
          Skip to content
        </a>
        <Header />
        {/* The skip link's target. Pages render their own <main> inside. tabIndex lets it take
            focus, so the next Tab continues from the page content; it isn't a control, so it
            needs no focus outline. A click on empty page space now focuses this div instead
            of <body>; keep that in mind for any future "click outside" logic. */}
        <div id="content" tabIndex={-1} className="flex flex-1 flex-col outline-none">
          {children}
        </div>
      </body>
    </html>
  );
}
