import { supabaseServer } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await supabaseServer();

  // get logged in user
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    return <div>Not logged in</div>;
  }

  // get active company id
  const { data: settings } = await supabase
    .from("user_settings")
    .select("active_company_id")
    .eq("user_id", user.id)
    .single();

  let companyName = null;

  if (settings?.active_company_id) {
    const { data: company } = await supabase
      .from("companies")
      .select("name")
      .eq("id", settings.active_company_id)
      .single();

    companyName = company?.name ?? null;
  }

  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold mb-2">Home</h1>
      <p className="mb-4">Logged in. Active company context is set.</p>

      <div className="border rounded p-4">
        <h2 className="font-semibold mb-1">Company</h2>
        <p>{companyName ?? "No company found"}</p>
      </div>
    </main>
  );
}