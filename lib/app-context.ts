import { supabaseServer } from "@/lib/supabase/server";

export async function getActiveCompanyId(userId: string): Promise<string | null> {
  const supabase = await supabaseServer();

  // 1) Try explicit active_company_id
  const { data: settings } = await supabase
    .from("user_settings")
    .select("active_company_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (settings?.active_company_id) return settings.active_company_id as string;

  // 2) Fallback to first active membership
  const { data: membership } = await supabase
    .from("memberships")
    .select("company_id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return (membership?.company_id as string) ?? null;
}