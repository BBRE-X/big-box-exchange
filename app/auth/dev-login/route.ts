import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Development-only route. Signs in with password credentials stored in env vars
 * so local dev gets a real Supabase session without going through the magic link flow.
 *
 * Never reachable in production: the NODE_ENV guard returns 404 immediately.
 * No user is created or modified; DEV_LOGIN_EMAIL must already exist in auth.users.
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse(null, { status: 404 });
  }

  const email = process.env.DEV_LOGIN_EMAIL;
  const password = process.env.DEV_LOGIN_PASSWORD;

  if (!email || !password) {
    // Credentials not configured — fall back to the normal sign-in page.
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  const cookieStore = await cookies();

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
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error("[dev-login] signInWithPassword failed:", error.message);
    return NextResponse.redirect(new URL("/auth?dev_error=1", request.url));
  }

  return NextResponse.redirect(new URL("/home", request.url));
}
