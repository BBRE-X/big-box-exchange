import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveCompanyId } from "@/lib/app-context";

type PageProps = {
  searchParams?: Promise<{ error?: string }>;
};

export default async function CompaniesPage({ searchParams }: PageProps) {
  const resolvedParams = searchParams ? await searchParams : undefined;
  const pageError = resolvedParams?.error;

  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  const [membershipsRes, activeCompanyId] = await Promise.all([
    supabase
      .from("memberships")
      .select("company_id, role")
      .eq("user_id", user.id)
      .or("status.is.null,status.eq.active"),
    getActiveCompanyId(user.id),
  ]);

  if (membershipsRes.error) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Companies</h1>
        <p className="mt-3 text-sm text-red-600">
          Failed to load memberships: {membershipsRes.error.message}
        </p>
      </main>
    );
  }

  const memberships = membershipsRes.data ?? [];
  const companyIds = memberships.map((m) => m.company_id as string);

  let companies: { id: string; name: string }[] = [];

  if (companyIds.length > 0) {
    const { data, error } = await supabase
      .from("companies")
      .select("id, name")
      .in("id", companyIds);

    if (error) {
      return (
        <main className="mx-auto max-w-2xl px-6 py-10">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Companies</h1>
          <p className="mt-3 text-sm text-red-600">
            Failed to load companies: {error.message}
          </p>
        </main>
      );
    }

    companies = data ?? [];
  }

  const roleByCompanyId = Object.fromEntries(
    memberships.map((m) => [m.company_id as string, m.role as string])
  );

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Companies</h1>
          <p className="mt-1 text-sm leading-snug text-gray-600">
            Select a company to make it active across the platform.
          </p>
        </div>
        <Link
          href="/create-company"
          className="inline-flex shrink-0 rounded-lg bg-black px-3 py-2 text-xs font-medium text-white"
        >
          Create company
        </Link>
      </div>

      {pageError ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
          {pageError === "not_allowed"
            ? "You don't have access to that company."
            : decodeURIComponent(pageError)}
        </div>
      ) : null}

      {companies.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
          <p className="text-sm font-medium text-gray-800">No companies yet</p>
          <p className="mt-1 text-xs text-gray-600">Create your first company to get started.</p>
          <Link
            href="/create-company"
            className="mt-4 inline-flex rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
          >
            Create company
          </Link>
        </div>
      ) : (
        <ul className="mt-5 flex flex-col gap-2">
          {companies.map((c) => {
            const isActive = c.id === activeCompanyId;
            const role = roleByCompanyId[c.id];
            return (
              <li
                key={c.id}
                className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3 ${
                  isActive
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-200 bg-white text-gray-900"
                }`}
              >
                <div className="min-w-0">
                  <p className={`truncate text-sm font-semibold ${isActive ? "text-white" : "text-gray-900"}`}>
                    {c.name}
                  </p>
                  {role ? (
                    <p className={`mt-0.5 text-[11px] capitalize ${isActive ? "text-white/60" : "text-gray-500"}`}>
                      {role}
                    </p>
                  ) : null}
                </div>

                {isActive ? (
                  <span className="shrink-0 rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                    Active
                  </span>
                ) : (
                  <Link
                    href={`/companies/switch/${c.id}`}
                    className="shrink-0 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-50"
                  >
                    Switch
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-6">
        <Link
          href="/home"
          className="text-sm font-medium text-gray-600 underline-offset-4 hover:underline"
        >
          ← Back to dashboard
        </Link>
      </div>
    </main>
  );
}
