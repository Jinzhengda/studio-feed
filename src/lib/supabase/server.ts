import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { fetchWithTimeout } from "./fetch-with-timeout";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        fetch: fetchWithTimeout,
      },
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Ignore in Server Components where cookies are read-only.
          }
        },
        remove(name, options) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // Ignore in Server Components where cookies are read-only.
          }
        },
      },
    }
  );
}
