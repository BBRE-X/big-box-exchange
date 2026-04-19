"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveCompanyRecord } from "@/lib/app-context";
import {
  DEAL_ROOM_STAGES,
  type DealRoomStage,
  isDealRoomStage,
} from "@/lib/deal-room-stage";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type UpdateDealStageResult =
  | { ok: true; newStage: DealRoomStage }
  | {
      ok: false;
      error: string;
    };

export async function updateDealStage(
  dealId: string,
  newStageRaw: string,
  dealRoomId: string
): Promise<UpdateDealStageResult> {
  // Validate UUIDs
  if (!UUID_RE.test(dealId) || !UUID_RE.test(dealRoomId)) {
    return { ok: false, error: "Invalid deal or room." };
  }

  // Validate stage
  if (!isDealRoomStage(newStageRaw)) {
    return { ok: false, error: "Invalid stage." };
  }

  const newStage = newStageRaw as DealRoomStage;

  const supabase = await supabaseServer();

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Not authenticated." };
  }

  // Get active company
  const companyRecord = await getActiveCompanyRecord(user.id);
  if (!companyRecord) {
    return { ok: false, error: "No active company." };
  }

  const companyId = companyRecord.id;

  // Verify deal exists, belongs to this room and company
  const { data: deal, error: fetchError } = await supabase
    .from("deals")
    .select("id, deal_room_id, company_id")
    .eq("id", dealId)
    .eq("deal_room_id", dealRoomId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (fetchError || !deal) {
    return { ok: false, error: "Deal not found." };
  }

  // Update the deal stage
  const { error: updateError } = await supabase
    .from("deals")
    .update({ stage: newStage })
    .eq("id", dealId)
    .eq("company_id", companyId);

  if (updateError) {
    return { ok: false, error: "Failed to update stage." };
  }

  // Revalidate the deal room page to refresh UI
  revalidatePath(`/deal-rooms/${dealRoomId}`);

  return { ok: true, newStage };
}

export type AddDealNoteResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
    };

export async function addDealNote(
  dealId: string,
  body: string,
  dealRoomId: string
): Promise<AddDealNoteResult> {
  // Validate UUIDs
  if (!UUID_RE.test(dealId) || !UUID_RE.test(dealRoomId)) {
    return { ok: false, error: "Invalid deal or room." };
  }

  // Validate body
  const trimmedBody = body.trim();
  if (!trimmedBody) {
    return { ok: false, error: "Note cannot be empty." };
  }

  const supabase = await supabaseServer();

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Not authenticated." };
  }

  // Get active company
  const companyRecord = await getActiveCompanyRecord(user.id);
  if (!companyRecord) {
    return { ok: false, error: "No active company." };
  }

  const companyId = companyRecord.id;

  // Verify deal exists, belongs to this room and company
  const { data: deal, error: fetchError } = await supabase
    .from("deals")
    .select("id, deal_room_id, company_id")
    .eq("id", dealId)
    .eq("deal_room_id", dealRoomId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (fetchError || !deal) {
    return { ok: false, error: "Deal not found." };
  }

  // Insert the note
  const { error: insertError } = await supabase
    .from("deal_notes")
    .insert({
      deal_id: dealId,
      company_id: companyId,
      created_by: user.id,
      body: trimmedBody,
    });

  if (insertError) {
    console.error("[deal_notes insert] Supabase error:", insertError);
    return {
      ok: false,
      error: `Failed to add note: ${insertError.message || insertError.code || "Unknown error"}`,
    };
  }

  // Revalidate the deal page to refresh UI
  revalidatePath(`/deal-rooms/${dealRoomId}/deals/${dealId}`);

  return { ok: true };
}
