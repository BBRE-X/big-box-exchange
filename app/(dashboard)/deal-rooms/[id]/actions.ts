"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveCompanyRecord } from "@/lib/app-context";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_BODY_LEN = 10_000;

export async function addDealRoomNote(formData: FormData) {
  const dealRoomId = String(formData.get("dealRoomId") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!UUID_RE.test(dealRoomId)) {
    redirect("/portfolio");
  }

  if (!body) {
    redirect(`/deal-rooms/${dealRoomId}?note=empty`);
  }

  if (body.length > MAX_BODY_LEN) {
    redirect(`/deal-rooms/${dealRoomId}?note=long`);
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

  const { data: room, error: roomError } = await supabase
    .from("deal_rooms")
    .select("id, company_id")
    .eq("id", dealRoomId)
    .eq("company_id", companyRecord.id)
    .maybeSingle();

  if (roomError || !room) {
    redirect("/portfolio");
  }

  const { error: insertError } = await supabase.from("deal_room_notes").insert({
    deal_room_id: dealRoomId,
    company_id: companyRecord.id,
    created_by: user.id,
    body,
  });

  if (insertError) {
    redirect(`/deal-rooms/${dealRoomId}?note=error`);
  }

  revalidatePath(`/deal-rooms/${dealRoomId}`);
  redirect(`/deal-rooms/${dealRoomId}`);
}
