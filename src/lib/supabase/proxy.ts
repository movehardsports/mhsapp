import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import type { Database } from "@/lib/supabase/database.types";

// Refreshes the Supabase session before the request reaches the app. Server Components can't
// write cookies, so without this a refreshed token is lost, the old refresh token gets reused,
// and refresh token rotation revokes the session.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          // Pass the new tokens on to Server Components in this request…
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          // …and to the browser. Rebuild the response so it carries the updated request.
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
          // No-cache headers, so a CDN never serves one user's session cookie to another.
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    }
  );

  // Don't put code between createServerClient and getClaims: getClaims is what refreshes an
  // expiring session, and anything before it would run with the stale one.
  await supabase.auth.getClaims();

  // Return this exact response: a new one wouldn't carry the refreshed cookies.
  return response;
}
