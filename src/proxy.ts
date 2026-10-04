import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Runs before every page request and keeps the Supabase session fresh. It only refreshes the
// session: pages, Server Actions and RLS still check who the user is themselves.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Skip static files and images: they don't need a session.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
