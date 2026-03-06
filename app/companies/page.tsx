import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";

export default async function CompaniesPage() {
  const supabase = await supabaseServer();

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-semibold mb-2">Companies</h1>
        <p>You are not logged in.</p>
        <Link className="underline" href="/auth">
          Go to login
        </Link>
      </main>
    );
  }

  // 1) load all memberships for this user
  const { data: memberships, error: mErr } = await supabase
    .from("memberships")
    .select("company_id, role, status")
    .eq("user_id", user.id)
    .eq("status", "active");

  if (mErr) {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-semibold mb-2">Companies</h1>
        <p className="text-red-600">Error loading memberships: {mErr.message}</p>
      </main>
    );
  }

  const companyIds = (memberships ?? []).map((m) => m.company_id);

  // 2) load companies
  const { data: companies, error: cErr } = await supabase
    .from("companies")
    .select("id, name")
    .in("id", companyIds);

  if (cErr) {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-semibold mb-2">Companies</h1>
        <p className="text-red-600">Error loading companies: {cErr.message}</p>
      </main>
    );
  }

  // 3) get active company id
  const { data: settings } = await supabase
    .from("user_settings")
    .select("active_company_id")
    .eq("user_id", user.id)
    .single();

  const activeId = settings?.active_company_id ?? null;

  return (
    <main className="p-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Companies</h1>
        <Link className="underline" href="/create-company">
          + Create company
        </Link>
      </div>

      <p className="mb-6 text-sm text-gray-600">
        Active company:{" "}
        <span className="font-semibold">
          {companies?.find((c) => c.id === activeId)?.name ?? "None"}
        </span>
      </p>

      <div className="space-y-3">
        {(companies ?? []).map((c) => {
          const isActive = c.id === activeId;
          return (
            <div
              key={c.id}
              className={`border rounded p-4 flex items-center justify-between ${
                isActive ? "bg-gray-50" : ""
              }`}
            >
              <div>
                <div className="font-semibold">{c.name}</div>
                <div className="text-xs text-gray-600">{c.id}</div>
              </div>

              {isActive ? (
                <span className="text-sm font-semibold">Active</span>
              ) : (
                <Link className="underline" href={`/companies/switch/${c.id}`}>
                  Switch
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}