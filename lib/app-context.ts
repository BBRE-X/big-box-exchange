import { supabaseServer } from "@/lib/supabase/server";

export type ActiveCompanyRecord = {
  id: string;
  name: string;
  logo_url: string | null;
};

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

export async function getActiveCompanyRecord(
  userId: string
): Promise<ActiveCompanyRecord | null> {
  const companyId = await getActiveCompanyId(userId);
  if (!companyId) return null;

  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from("companies")
    .select("id, name, logo_url")
    .eq("id", companyId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id as string,
    name: data.name as string,
    logo_url: (data.logo_url as string | null) ?? null,
  };
}