import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const supabase = await supabaseServer();

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    return NextResponse.redirect(new URL("/auth", _req.url));
  }

  const { companyId } = await params;

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

  await supabase.from("user_settings").upsert(
    { user_id: user.id, active_company_id: companyId },
    { onConflict: "user_id" }
  );

  await supabase
    .from("profiles")
    .update({ active_company_id: companyId })
    .eq("id", user.id);

  revalidatePath("/company");
  revalidatePath("/companies");
  revalidatePath("/home");
  revalidatePath("/assets");
  revalidatePath("/assets/new");
  revalidatePath("/portfolio");
  revalidatePath("/mandates");

  return NextResponse.redirect(new URL("/home", _req.url));
}
