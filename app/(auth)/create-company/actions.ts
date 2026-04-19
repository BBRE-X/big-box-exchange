"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";

const ENTITY_TYPES = [
  "principal",
  "investor",
  "developer",
  "agency",
  "capital_partner",
  "government_authority",
  "advisory_service_provider",
] as const;

type EntityType = (typeof ENTITY_TYPES)[number];

export async function createCompanyAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const entity_type = String(formData.get("entity_type") ?? "").trim() as EntityType;

  if (!name) throw new Error("Company name is required.");
  if (!ENTITY_TYPES.includes(entity_type)) throw new Error("Invalid entity type.");

  const supabase = await supabaseServer();

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw new Error(userErr.message);

  console.log("AUTH USER:", userData?.user);

  const user = userData.user;
  if (!user) redirect("/auth");

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .insert({
      name,
      entity_type,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (companyError) throw new Error(companyError.message);
  if (!company?.id) throw new Error("Company creation failed.");

  const { error: membershipError } = await supabase.from("memberships").insert({
    user_id: user.id,
    company_id: company.id,
    role: "owner",
    status: "active",
  });

  if (membershipError) throw new Error(membershipError.message);

  const { error: settingsError } = await supabase.from("user_settings").upsert(
    {
      user_id: user.id,
      active_company_id: company.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (settingsError) throw new Error(settingsError.message);

  await supabase
    .from("profiles")
    .update({ active_company_id: company.id })
    .eq("id", user.id);

  revalidatePath("/home");
  revalidatePath("/assets");
  revalidatePath("/portfolio");
  revalidatePath("/mandates");

  redirect("/home");
}