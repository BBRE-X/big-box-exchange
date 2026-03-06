import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(
  _req: Request,
  { params }: { params: { companyId: string } }
) {
  const supabase = await supabaseServer();

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    return NextResponse.redirect(new URL("/auth", _req.url));
  }

  const companyId = params.companyId;

  // verify user has active membership in that company
  const { data: membership } = await supabase
    .from("memberships")
    .select("id")
    .eq("user_id", user.id)
    .eq("company_id", companyId)
    .eq("status", "active")
    .single();

  if (!membership) {
    return NextResponse.redirect(new URL("/companies?error=not_allowed", _req.url));
  }

  // set active company
  await supabase
    .from("user_settings")
    .upsert(
      { user_id: user.id, active_company_id: companyId },
      { onConflict: "user_id" }
    );

  return NextResponse.redirect(new URL("/home", _req.url));
}