"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveCompanyRecord } from "@/lib/app-context";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function createDealRoomFromPortfolio(formData: FormData) {
  const assetId = String(formData.get("assetId") ?? "").trim();
  const mandateId = String(formData.get("mandateId") ?? "").trim();

  if (!UUID_RE.test(assetId) || !UUID_RE.test(mandateId)) {
    redirect("/portfolio");
  }

  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const companyRecord = await getActiveCompanyRecord(user.id);

  if (!companyRecord) {
    redirect("/companies");
  }

  const companyId = companyRecord.id;

  const [assetRes, mandateRes] = await Promise.all([
    supabase
      .from("assets")
      .select("id")
      .eq("id", assetId)
      .eq("company_id", companyId)
      .maybeSingle(),
    supabase
      .from("mandates")
      .select("id")
      .eq("id", mandateId)
      .eq("company_id", companyId)
      .maybeSingle(),
  ]);

  if (assetRes.error || mandateRes.error || !assetRes.data || !mandateRes.data) {
    redirect("/portfolio");
  }

  const { data: existing } = await supabase
    .from("deal_rooms")
    .select("id")
    .eq("company_id", companyId)
    .eq("asset_id", assetId)
    .eq("mandate_id", mandateId)
    .maybeSingle();

  if (existing?.id) {
    redirect(`/deal-rooms/${existing.id}`);
  }

  const { data: inserted, error: insertError } = await supabase
    .from("deal_rooms")
    .insert({
      company_id: companyId,
      asset_id: assetId,
      mandate_id: mandateId,
    })
    .select("id")
    .single();

  if (insertError || !inserted?.id) {
    redirect("/portfolio");
  }

  redirect(`/deal-rooms/${inserted.id}`);
}
