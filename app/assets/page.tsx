import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

type CompanyRow = {
  id: string;
  name: string;
};

type AssetRow = {
  id: string;
  title: string;
  description: string | null;
  asset_type: string;
  listing_type: string;
  suburb: string | null;
  state: string | null;
  country: string | null;
  price_min: number | null;
  price_max: number | null;
  price_display: string | null;
  building_area_sqm: number | null;
  land_area_sqm: number | null;
  is_public: boolean;
  open_for_offers: boolean;
  created_at: string;
};

function formatAUD(value: number | null) {
  if (value === null || Number.isNaN(value)) return null;

  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPrice(
  min: number | null,
  max: number | null,
  display: string | null
) {
  if (display && display.trim()) return display;
  if (min !== null && max !== null) return `${formatAUD(min)} - ${formatAUD(max)}`;
  if (min !== null) return `From ${formatAUD(min)}`;
  if (max !== null) return `Up to ${formatAUD(max)}`;
  return "Price on application";
}

function labelAssetType(value: string) {
  const map: Record<string, string> = {
    industrial: "Industrial",
    retail: "Retail",
    office: "Office",
    land: "Land",
    development_site: "Development Site",
    mixed_use: "Mixed Use",
    other: "Other",
  };

  return map[value] ?? value;
}

function labelListingType(value: string) {
  const map: Record<string, string> = {
    sale: "For Sale",
    lease: "For Lease",
    both: "Sale or Lease",
    off_market: "Off Market",
  };

  return map[value] ?? value;
}

export default async function AssetsPage() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { data: memberships, error: membershipsError } = await supabase
    .from("memberships")
    .select("company_id, status, companies(id, name)")
    .eq("user_id", user.id);

  if (membershipsError) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-3xl font-semibold">Assets</h1>
        <p className="mt-4 text-red-600">
          Failed to load memberships: {membershipsError.message}
        </p>
      </main>
    );
  }

  const activeMemberships =
    memberships?.filter((m: any) => !m.status || m.status === "active") ?? [];

  const companies: CompanyRow[] = activeMemberships
    .map((m: any) => m.companies)
    .filter(Boolean)
    .map((c: any) => ({
      id: c.id,
      name: c.name,
    }));

  if (companies.length === 0) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Assets</h1>
            <p className="mt-2 text-sm text-gray-600">
              You need an active company before you can create assets.
            </p>
          </div>

          <Link
            href="/create-company"
            className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
          >
            Create company
          </Link>
        </div>
      </main>
    );
  }

  let activeCompany = companies[0];

  const { data: profile } = await supabase
    .from("profiles")
    .select("active_company_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.active_company_id) {
    const matched = companies.find((c) => c.id === profile.active_company_id);
    if (matched) activeCompany = matched;
  }

  const { data: assets, error: assetsError } = await supabase
    .from("assets")
    .select(
      `
      id,
      title,
      description,
      asset_type,
      listing_type,
      suburb,
      state,
      country,
      price_min,
      price_max,
      price_display,
      building_area_sqm,
      land_area_sqm,
      is_public,
      open_for_offers,
      created_at
      `
    )
    .eq("company_id", activeCompany.id)
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Assets</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage property listings and off-market opportunities for{" "}
            <span className="font-medium text-gray-900">{activeCompany.name}</span>.
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            href="/home"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800"
          >
            Back to home
          </Link>

          <Link
            href="/assets/new"
            className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
          >
            Create asset
          </Link>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Active company</h2>
            <p className="text-sm text-gray-600">{activeCompany.name}</p>
          </div>

          <Link
            href="/companies"
            className="text-sm font-medium text-gray-900 underline"
          >
            Switch company
          </Link>
        </div>
      </div>

      {assetsError ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5">
          <p className="text-sm text-red-700">
            Failed to load assets: {assetsError.message}
          </p>
        </div>
      ) : null}

      {!assetsError && (!assets || assets.length === 0) ? (
        <div className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
          <h3 className="text-lg font-semibold text-gray-900">No assets yet</h3>
          <p className="mt-2 text-sm text-gray-600">
            Start by adding your first property listing, development site, or off-market opportunity.
          </p>

          <Link
            href="/assets/new"
            className="mt-5 inline-flex rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
          >
            Create first asset
          </Link>
        </div>
      ) : null}

      {!assetsError && assets && assets.length > 0 ? (
        <div className="mt-6 grid gap-4">
          {assets.map((asset: AssetRow) => (
            <article
              key={asset.id}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                      {labelAssetType(asset.asset_type)}
                    </span>

                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                      {labelListingType(asset.listing_type)}
                    </span>

                    {asset.is_public ? (
                      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                        Public
                      </span>
                    ) : (
                      <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800">
                        Private
                      </span>
                    )}

                    {asset.open_for_offers ? (
                      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                        Open for offers
                      </span>
                    ) : null}
                  </div>

                  <h3 className="mt-4 text-xl font-semibold text-gray-900">
                    {asset.title}
                  </h3>

                  <p className="mt-2 text-sm text-gray-600">
                    {[asset.suburb, asset.state, asset.country].filter(Boolean).join(", ") ||
                      "Location not set"}
                  </p>

                  <p className="mt-3 text-base font-medium text-gray-900">
                    {formatPrice(asset.price_min, asset.price_max, asset.price_display)}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-700">
                    <span>
                      Building area:{" "}
                      <strong>
                        {asset.building_area_sqm !== null
                          ? `${asset.building_area_sqm} sqm`
                          : "—"}
                      </strong>
                    </span>

                    <span>
                      Land area:{" "}
                      <strong>
                        {asset.land_area_sqm !== null ? `${asset.land_area_sqm} sqm` : "—"}
                      </strong>
                    </span>
                  </div>

                  {asset.description ? (
                    <p className="mt-4 text-sm text-gray-700">{asset.description}</p>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </main>
  );
}