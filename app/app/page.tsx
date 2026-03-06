import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveCompanyId } from "@/lib/app-context";

export default async function AppGate() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) redirect("/auth");

  const activeCompanyId = await getActiveCompanyId(user.id);

  if (!activeCompanyId) redirect("/create-company");

  redirect("/home");
}