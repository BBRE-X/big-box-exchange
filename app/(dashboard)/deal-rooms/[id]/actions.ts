"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveCompanyRecord } from "@/lib/app-context";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type AddDealToRoomResult =
  | { ok: true }
  | {
      ok: false;
      code:
        | "invalid_room"
        | "unauthenticated"
        | "no_company"
        | "room_not_found"
        | "insert_failed";
    };

export async function addDealToRoom(formData: FormData): Promise<AddDealToRoomResult> {
  const dealRoomId = String(formData.get("dealRoomId") ?? "").trim();

  if (!UUID_RE.test(dealRoomId)) {
    return { ok: false, code: "invalid_room" };
  }

  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, code: "unauthenticated" };
  }

  const companyRecord = await getActiveCompanyRecord(user.id);

  if (!companyRecord) {
    return { ok: false, code: "no_company" };
  }

  const companyId = companyRecord.id;

  const { data: room, error: roomError } = await supabase
    .from("deal_rooms")
    .select("id, company_id")
    .eq("id", dealRoomId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (roomError || !room) {
    return { ok: false, code: "room_not_found" };
  }

  const { error: insertError } = await supabase.from("deals").insert({
    deal_room_id: dealRoomId,
    company_id: companyId,
    title: "New deal",
    summary: null,
    stage: "lead",
    source: "manual",
  });

  if (insertError) {
    return { ok: false, code: "insert_failed" };
  }

  revalidatePath(`/deal-rooms/${dealRoomId}`);
  return { ok: true };
}

export type AddNoteResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
    };

export async function addDealRoomNote(
  dealRoomId: string,
  body: string
): Promise<AddNoteResult> {
  // Validate UUID
  if (!UUID_RE.test(dealRoomId)) {
    return { ok: false, error: "Invalid room." };
  }

  // Validate note body
  const trimmedBody = body.trim();
  if (!trimmedBody) {
    return { ok: false, error: "Note cannot be empty." };
  }

  if (trimmedBody.length > 5000) {
    return { ok: false, error: "Note is too long (max 5000 characters)." };
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

  // Verify deal room exists and belongs to this company
  const { data: room, error: roomError } = await supabase
    .from("deal_rooms")
    .select("id, company_id")
    .eq("id", dealRoomId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (roomError || !room) {
    return { ok: false, error: "Deal room not found." };
  }

  // Insert the note
  const { error: insertError } = await supabase.from("deal_room_notes").insert({
    deal_room_id: dealRoomId,
    company_id: companyId,
    created_by: user.id,
    body: trimmedBody,
  });

  if (insertError) {
    return { ok: false, error: "Failed to save note." };
  }

  // Revalidate the deal room page
  revalidatePath(`/deal-rooms/${dealRoomId}`);

  return { ok: true };
}
