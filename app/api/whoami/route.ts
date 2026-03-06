import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await supabaseServer();

  // IMPORTANT: getUser() is the reliable server-side check
  const { data, error } = await supabase.auth.getUser();

  return NextResponse.json({
    ok: !error,
    error: error?.message ?? null,
    user: data?.user
      ? { id: data.user.id, email: data.user.email }
      : null,
  });
}