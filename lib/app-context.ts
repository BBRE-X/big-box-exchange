import { cache } from "react";
import { supabaseServer } from "@/lib/supabase/server";

export type ActiveCompanyRecord = {
  id: string;
  name: string;
  logo_url: string | null;
};

/**
 * Resolves active company for dashboard, portfolio, mandates list, and sidebar.
 * Order: `user_settings` (updated by `/companies/switch` and create-company) →
 * `profiles.active_company_id` (used by assets UI) when still a valid membership →
 * else first active membership (same default as assets when no explicit selection).
 */
export const getActiveCompanyId = cache(async (userId: string): Promise<string | null> => {
  const supabase = await supabaseServer();

  const { data: memberships, error: membershipsError } = await supabase
    .from("memberships")
    .select("company_id, status")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (membershipsError || !memberships?.length) {
    return null;
  }

  const activeMemberships = memberships.filter(
    (m) => !m.status || m.status === "active"
  );

  if (activeMemberships.length === 0) {
    return null;
  }

  const allowedIds = activeMemberships.map((m) => m.company_id as string);

  const { data: settings } = await supabase
    .from("user_settings")
    .select("active_company_id")
    .eq("user_id", userId)
    .maybeSingle();

  const settingsCompanyId = settings?.active_company_id as string | undefined;
  if (settingsCompanyId && allowedIds.includes(settingsCompanyId)) {
    return settingsCompanyId;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("active_company_id")
    .eq("id", userId)
    .maybeSingle();

  const profileCompanyId = profile?.active_company_id as string | undefined;
  if (profileCompanyId && allowedIds.includes(profileCompanyId)) {
    return profileCompanyId;
  }

  return allowedIds[0] ?? null;
});

/**
 * Loads display fields for the active company. Uses `select("*")` on `companies` so a missing
 * optional column (e.g. logo_url) does not break the query. If the companies row is not
 * readable, falls back to the name from the membership join (same user + company_id).
 */
export const getActiveCompanyRecord = cache(
  async (userId: string): Promise<ActiveCompanyRecord | null> => {
    const companyId = await getActiveCompanyId(userId);
    if (!companyId) return null;

    const supabase = await supabaseServer();

    const { data: row, error } = await supabase
      .from("companies")
      .select("*")
      .eq("id", companyId)
      .maybeSingle();

    if (!error && row) {
      const wide = row as Record<string, unknown>;
      const logoRaw = wide.logo_url;
      const logo_url =
        typeof logoRaw === "string" && logoRaw.trim().length > 0 ? logoRaw : null;

      return {
        id: row.id as string,
        name: row.name as string,
        logo_url,
      };
    }

    const { data: membershipRow } = await supabase
      .from("memberships")
      .select("companies(name)")
      .eq("user_id", userId)
      .eq("company_id", companyId)
      .limit(1)
      .maybeSingle();

    const nested = membershipRow?.companies as { name?: string } | null | undefined;
    const nameFromMembership =
      typeof nested?.name === "string" && nested.name.trim().length > 0
        ? nested.name.trim()
        : "Company";

    return {
      id: companyId,
      name: nameFromMembership,
      logo_url: null,
    };
  }
);
