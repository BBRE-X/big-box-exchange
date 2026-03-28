"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveCompanyRecord } from "@/lib/app-context";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CreateDealRoomResult =
  | { ok: true; dealRoomId: string }
  | { ok: false; error: string };

async function fetchDealRoomIdForPair(
  supabase: SupabaseClient,
  companyId: string,
  assetId: string,
  mandateId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("deal_rooms")
    .select("id")
    .eq("company_id", companyId)
    .eq("asset_id", assetId)
    .eq("mandate_id", mandateId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data?.id) {
    return null;
  }
  return data.id;
}

async function insertInitialDealForRoom(
  supabase: SupabaseClient,
  companyId: string,
  dealRoomId: string,
  assetId: string,
  mandateId: string
) {
  const [{ data: assetRow }, { data: mandateRow }] = await Promise.all([
    supabase
      .from("assets")
      .select("title")
      .eq("id", assetId)
      .eq("company_id", companyId)
      .maybeSingle(),
    supabase
      .from("mandates")
      .select("title")
      .eq("id", mandateId)
      .eq("company_id", companyId)
      .maybeSingle(),
  ]);

  const dealTitle =
    assetRow?.title && mandateRow?.title
      ? `${assetRow.title} · ${mandateRow.title}`
      : "Active deal";

  await supabase.from("deals").insert({
    deal_room_id: dealRoomId,
    company_id: companyId,
    title: dealTitle,
    summary: null,
    stage: "lead",
    source: "match",
  });
}

export async function createDealRoomFromPortfolio(
  formData: FormData
): Promise<CreateDealRoomResult> {
  const assetId = String(formData.get("assetId") ?? "").trim();
  const mandateId = String(formData.get("mandateId") ?? "").trim();

  if (!UUID_RE.test(assetId) || !UUID_RE.test(mandateId)) {
    return { ok: false, error: "Invalid selection." };
  }

  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "You must be signed in." };
  }

  const companyRecord = await getActiveCompanyRecord(user.id);

  if (!companyRecord) {
    return { ok: false, error: "Select a company to continue." };
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
    return { ok: false, error: "Could not open deal room for this pair." };
  }

  const existingId = await fetchDealRoomIdForPair(supabase, companyId, assetId, mandateId);
  if (existingId) {
    return { ok: true, dealRoomId: existingId };
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

  if (inserted?.id) {
    await insertInitialDealForRoom(supabase, companyId, inserted.id, assetId, mandateId);
    return { ok: true, dealRoomId: inserted.id };
  }

  if (insertError?.code === "23505") {
    const afterConflictId = await fetchDealRoomIdForPair(supabase, companyId, assetId, mandateId);
    if (afterConflictId) {
      return { ok: true, dealRoomId: afterConflictId };
    }
  }

  if (!insertError && !inserted?.id) {
    const recoveredId = await fetchDealRoomIdForPair(supabase, companyId, assetId, mandateId);
    if (recoveredId) {
      return { ok: true, dealRoomId: recoveredId };
    }
  }

  if (insertError) {
    return { ok: false, error: "Could not create deal room. Try again." };
  }

  return { ok: false, error: "Could not open deal room. Try again." };
}
