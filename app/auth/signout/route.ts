import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const response = NextResponse.redirect(new URL("/auth", request.url));

  const requestUrl = new URL(request.url);
  const isLocalhost =
    requestUrl.hostname === "localhost" || requestUrl.hostname === "127.0.0.1";

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            const safeOptions = isLocalhost
              ? { ...options, secure: false }
              : options;

            response.cookies.set(name, value, safeOptions);
          });
        },
      },
    }
  );

  await supabase.auth.signOut();
  return response;
}