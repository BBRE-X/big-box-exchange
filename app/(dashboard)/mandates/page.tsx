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

type PageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function MandatesPage({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const pageError = resolvedSearchParams?.error;

  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const activeCompanyId = await getActiveCompanyId(user.id);

  let mandates: MandateRow[] = [];
  let loadError: string | null = null;

  if (activeCompanyId) {
    const { data, error } = await supabase
      .from("mandates")
      .select("id, company_id, title, asset_type, location, description, status, created_at")
      .eq("company_id", activeCompanyId)
      .order("created_at", { ascending: false });

    if (error) {
      loadError = error.message;
    } else {
      mandates = (data ?? []) as MandateRow[];
    }
  } else {
    loadError = "No active company found.";
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Mandates</h1>
          <p className="mt-1 text-sm leading-snug text-gray-600">
            Manage acquisition mandates for your active company.
          </p>
        </div>

        <Link
          href="/mandates/new"
          className="inline-flex shrink-0 rounded-lg bg-black px-3 py-2 text-xs font-medium text-white"
        >
          New Mandate
        </Link>
      </div>

      {pageError ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {pageError === "no-active-company"
            ? "No active company found."
            : decodeURIComponent(pageError)}
        </div>
      ) : null}

      {loadError ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          Failed to load mandates: {loadError}
        </div>
      ) : null}

      {!loadError && mandates.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
          <h2 className="text-base font-semibold text-gray-900">No mandates yet</h2>
          <p className="mt-1.5 text-sm leading-snug text-gray-600">
            Create your first acquisition mandate to start building demand on the platform.
          </p>
          <div className="mt-4">
            <Link
              href="/mandates/new"
              className="inline-flex rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
            >
              Create mandate
            </Link>
          </div>
        </div>
      ) : null}

      {mandates.length > 0 ? (
        <div className="mt-4 flex flex-col gap-3">
          {mandates.map((mandate) => (
            <MandateCard
              key={mandate.id}
              id={mandate.id}
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
