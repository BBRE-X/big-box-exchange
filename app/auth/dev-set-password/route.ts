import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Development-only one-off helper.
 * Sets the password on the existing dev Supabase auth user so that
 * /auth/dev-login (signInWithPassword) works locally.
 *
 * Only changes the password hash on auth.users — no other data is touched.
 * Hit this route once, then the password is set and dev-login works indefinitely.
 *
 * Returns 404 in production.
 */

const DEV_USER_ID = "16fa8a68-1ecf-4fb5-850a-c1ffb6e945c2";

export async function GET(_request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse(null, { status: 404 });
  }

  const password = process.env.DEV_LOGIN_PASSWORD;
  if (!password) {
    return NextResponse.json(
      { error: "DEV_LOGIN_PASSWORD is not set in .env.local" },
      { status: 400 }
    );
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is not set in .env.local" },
      { status: 400 }
    );
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
    DEV_USER_ID,
    { password }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    email: data.user.email,
    id: data.user.id,
    message: "Password updated. You can now use /auth/dev-login.",
  });
}
