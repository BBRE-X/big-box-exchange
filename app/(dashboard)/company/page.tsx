import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveCompanyRecord } from "@/lib/app-context";

const ENTITY_TYPE_LABELS: Record<string, string> = {
  principal: "Principal",
  agency: "Agency",
  service_provider: "Service Provider",
};

export default async function CompanyPage() {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  const company = await getActiveCompanyRecord(user.id);

  if (!company) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Company</h1>
        <p className="mt-2 text-sm leading-snug text-gray-600">
          You don&apos;t have an active company yet.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/create-company"
            className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
          >
            Create company
          </Link>
          <Link
            href="/companies"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800"
          >
            Browse companies
          </Link>
        </div>
      </main>
    );
  }

  const [detailsRes, membershipRes] = await Promise.all([
    supabase
      .from("companies")
      .select("entity_type")
      .eq("id", company.id)
      .maybeSingle(),
    supabase
      .from("memberships")
      .select("role")
      .eq("user_id", user.id)
      .eq("company_id", company.id)
      .maybeSingle(),
  ]);

  const entityTypeLabel =
    ENTITY_TYPE_LABELS[detailsRes.data?.entity_type ?? ""] ??
    detailsRes.data?.entity_type ??
    "—";

  const role = membershipRes.data?.role ?? "—";

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
            Active company
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-gray-900">
            {company.name}
          </h1>
        </div>
        <Link
          href="/companies"
          className="inline-flex shrink-0 items-center rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
        >
          Switch company
        </Link>
      </div>

      <dl className="mt-6 divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between px-4 py-3">
          <dt className="text-sm text-gray-500">Entity type</dt>
          <dd className="text-sm font-medium text-gray-900">{entityTypeLabel}</dd>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <dt className="text-sm text-gray-500">Your role</dt>
          <dd className="text-sm font-medium capitalize text-gray-900">{role}</dd>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <dt className="text-sm text-gray-500">Company ID</dt>
          <dd className="break-all font-mono text-xs text-gray-500">{company.id}</dd>
        </div>
      </dl>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/home"
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
        >
          ← Dashboard
        </Link>
        <Link
          href="/create-company"
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
        >
          Create another company
        </Link>
      </div>
    </main>
  );
}
