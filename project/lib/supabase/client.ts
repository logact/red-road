import { createBrowserClient, type CookieOptions } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          if (typeof document === "undefined") return [];
          return document.cookie.split("; ").map((cookie) => {
            const [name, ...rest] = cookie.split("=");
            return { name: decodeURIComponent(name), value: decodeURIComponent(rest.join("=")) };
          }).filter((cookie) => cookie.name);
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          if (typeof document === "undefined") return;
          cookiesToSet.forEach(({ name, value, options }) => {
            // Ensure default path is '/' if not specified (critical for cross-route access)
            const path = options?.path || '/';
            let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=${path}`;
            if (options?.maxAge) cookieString += `; max-age=${options.maxAge}`;
            if (options?.domain) cookieString += `; domain=${options.domain}`;
            // Default to 'lax' for sameSite if not specified (allows redirects)
            const sameSite = options?.sameSite || 'lax';
            cookieString += `; samesite=${sameSite}`;
            if (options?.secure) cookieString += `; secure`;
            // Note: httpOnly cannot be set via document.cookie
            document.cookie = cookieString;
          });
        },
      },
    }
  );
}
