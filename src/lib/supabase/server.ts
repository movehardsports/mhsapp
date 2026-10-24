import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/supabase/database.types";

// The per-request client that the data functions in src/lib/<domain>/ take as their first
// argument.
export type Supabase = Awaited<ReturnType<typeof createClient>>;

// A Supabase client for Server Components, Server Actions and Route Handlers. Create one per
// request: it reads and writes the session cookies of the current request.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Components can't set cookies. That's fine: the proxy (src/proxy.ts) refreshes the
            // session and writes the cookies before the page renders.
          }
        },
      },
    }
  );
}
