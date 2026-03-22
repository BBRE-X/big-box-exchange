import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { getActiveCompanyRecord } from "@/lib/app-context";

type AssetImageRow = {
  image_url: string;
  position: number | null;
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
  asset_images?: AssetImageRow[] | null;
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
    for_sale: "For Sale",
    for_lease: "For Lease",
    open_for_offers: "Open for Offers",
    none: "Not Active",
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
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const companyRecord = await getActiveCompanyRecord(user.id);

  if (!companyRecord) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Assets</h1>
            <p className="mt-1.5 text-sm text-gray-600">
              You need an active company before you can add assets.
            </p>
          </div>

          <Link
            href="/create-company"
            className="inline-flex shrink-0 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
          >
            Create company
          </Link>
        </div>
      </main>
    );
  }

  const activeCompany = { id: companyRecord.id, name: companyRecord.name };

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
      created_at,
      asset_images (
        image_url,
        position
      )
      `
    )
    .eq("company_id", activeCompany.id)
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-6xl px-6 py-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Assets</h1>
          <p className="mt-1 text-sm leading-snug text-gray-600">
            Add and manage company assets for{" "}
            <span className="font-medium text-gray-900">{activeCompany.name}</span>.
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          <Link
            href="/home"
            className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-800"
          >
            Back to home
          </Link>

          <Link
            href="/assets/new"
            className="rounded-lg bg-black px-3 py-2 text-xs font-medium text-white"
          >
            Add asset
          </Link>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-3">
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Active company</h2>
            <p className="text-xs text-gray-600">{activeCompany.name}</p>
          </div>

          <Link
            href="/companies"
            className="text-xs font-medium text-gray-900 underline"
          >
            Switch company
          </Link>
        </div>
      </div>

      {assetsError ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3">
          <p className="text-xs text-red-700">
            Failed to load assets: {assetsError.message}
          </p>
        </div>
      ) : null}

      {!assetsError && (!assets || assets.length === 0) ? (
        <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
          <h3 className="text-base font-semibold text-gray-900">No assets yet</h3>
          <p className="mt-1.5 text-sm leading-snug text-gray-600">
            Start by adding your first company asset, development site, or off-market opportunity.
          </p>

          <Link
            href="/assets/new"
            className="mt-4 inline-flex rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
          >
            Add first asset
          </Link>
        </div>
      ) : null}

      {!assetsError && assets && assets.length > 0 ? (
        <div className="mt-4 flex flex-col gap-3">
          {(assets as AssetRow[]).map((asset) => {
            const sortedImages = [...(asset.asset_images ?? [])].sort(
              (a, b) => (a.position ?? 999) - (b.position ?? 999)
            );
            const primaryImage = sortedImages[0]?.image_url ?? null;

            const building =
              asset.building_area_sqm !== null ? `${asset.building_area_sqm} sqm` : "—";
            const land = asset.land_area_sqm !== null ? `${asset.land_area_sqm} sqm` : "—";

            return (
              <Link
                key={asset.id}
                href={`/assets/${asset.id}`}
                className="block rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
                prefetch={false}
                aria-label={`Open asset ${asset.title}`}
                style={{ textDecoration: "none" }}
              >
                <article className="flex cursor-pointer flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md md:flex-row md:items-start">
                  <div className="h-40 w-full shrink-0 bg-gray-100 md:w-44 lg:w-48">
                    {primaryImage ? (
                      <img
                        src={primaryImage}
                        alt={asset.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-gray-500">
                        No image uploaded
                      </div>
                    )}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col justify-center p-3 md:p-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-700">
                        {labelAssetType(asset.asset_type)}
                      </span>
                      <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-700">
                        {labelListingType(asset.listing_type)}
                      </span>

                      {asset.is_public ? (
                        <span className="rounded-md bg-green-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-800">
                          Public
                        </span>
                      ) : (
                        <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
                          Private
                        </span>
                      )}

                      {asset.open_for_offers ? (
                        <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-800">
                          Open for offers
                        </span>
                      ) : null}
                    </div>

                    <h3 className="mt-2 text-base font-semibold leading-tight tracking-tight text-gray-900 md:text-lg">
                      {asset.title}
                    </h3>

                    <p className="mt-1 text-xs leading-snug text-gray-600">
                      {[asset.suburb, asset.state, asset.country].filter(Boolean).join(", ") ||
                        "Location not set"}
                    </p>

                    <p className="mt-1.5 text-sm font-semibold leading-snug text-gray-900">
                      {formatPrice(
                        asset.price_min,
                        asset.price_max,
                        asset.price_display
                      )}
                    </p>

                    <p className="mt-1.5 text-[11px] leading-snug text-gray-600">
                      <span className="font-medium text-gray-800">Building</span> {building}
                      <span className="mx-2 text-gray-300" aria-hidden>
                        ·
                      </span>
                      <span className="font-medium text-gray-800">Land</span> {land}
                    </p>

                    {asset.description ? (
                      <p className="mt-2 text-xs leading-snug text-gray-700">{asset.description}</p>
                    ) : null}
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      ) : null}
    </main>
  );
}
