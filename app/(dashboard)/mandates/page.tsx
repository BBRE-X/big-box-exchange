import Link from "next/link";
import { redirect } from "next/navigation";
import MandateCard from "./MandateCard";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveCompanyId } from "@/lib/app-context";

type MandateRow = {
  id: string;
  company_id: string;
  title: string;
  asset_type: string | null;
  location: string | null;
  description: string | null;
  status: string | null;
  created_at: string;
};

export default async function MandatesPage() {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const activeCompanyId = await getActiveCompanyId(user.id);

  let mandatesQuery = supabase
    .from("mandates")
    .select("id, company_id, title, asset_type, location, description, status, created_at")
    .order("created_at", { ascending: false });

  if (activeCompanyId) {
    mandatesQuery = mandatesQuery.eq("company_id", activeCompanyId);
  }

  const { data: mandates, error } = await mandatesQuery;

  return (
    <main className="mx-auto max-w-7xl">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-gray-900">
            Mandates
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            Manage acquisition mandates for your active company.
          </p>
        </div>

        <Link
          href="/mandates/new"
          className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
        >
          New Mandate
        </Link>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
          <p className="text-sm text-red-700">Failed to load mandates: {error.message}</p>
        </div>
      ) : null}

      {!error && (!mandates || mandates.length === 0) ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
          <h3 className="text-lg font-semibold text-gray-900">No mandates yet</h3>
          <p className="mt-2 text-sm text-gray-600">
            Create your first mandate to start tracking acquisition requirements.
          </p>

          <Link
            href="/mandates/new"
            className="mt-5 inline-flex rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
          >
            Create mandate
          </Link>
        </div>
      ) : null}

      {!error && mandates && mandates.length > 0 ? (
        <div className="grid gap-6">
          {(mandates as MandateRow[]).map((mandate) => (
            <MandateCard
              key={mandate.id}
              title={mandate.title}
              asset_type={mandate.asset_type}
              location={mandate.location}
              status={mandate.status}
              description={mandate.description}
            />
          ))}
        </div>
      ) : null}
    </main>
  );
}