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
