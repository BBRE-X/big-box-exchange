import Link from "next/link";
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { createServerClient } from "@supabase/ssr";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type CompanyRow = {
  id: string;
  name: string;
};

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
  company_id: string;
  created_by: string | null;
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default async function AssetDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  const assetId = resolvedParams.id;

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
    throw new Error(`Failed to load memberships: ${membershipsError.message}`);
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
    redirect("/companies");
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

  const { data: asset, error: assetError } = await supabase
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
      company_id,
      created_by,
      asset_images (
        image_url,
        position
      )
      `
    )
    .eq("id", assetId)
    .eq("company_id", activeCompany.id)
    .single();

  if (assetError || !asset) {
    notFound();
  }

  const typedAsset = asset as AssetRow;

  const sortedImages = [...(typedAsset.asset_images ?? [])].sort(
    (a, b) => (a.position ?? 999) - (b.position ?? 999)
  );

  const primaryImage = sortedImages[0]?.image_url ?? null;
  const location =
    [typedAsset.suburb, typedAsset.state, typedAsset.country]
      .filter(Boolean)
      .join(", ") || "Location not set";

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
              {labelAssetType(typedAsset.asset_type)}
            </span>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
              {labelListingType(typedAsset.listing_type)}
            </span>

            {typedAsset.is_public ? (
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                Public
              </span>
            ) : (
              <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800">
                Private
              </span>
            )}

            {typedAsset.open_for_offers ? (
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                Open for offers
              </span>
            ) : null}
          </div>

          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-gray-900">
            {typedAsset.title}
          </h1>

          <p className="mt-2 text-sm text-gray-600">{location}</p>
        </div>

        <div className="flex gap-3">
          <Link
            href="/assets"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800"
          >
            Back to assets
          </Link>

          <Link
            href={`/assets/new?id=${typedAsset.id}`}
            className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
          >
            Edit asset
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="bg-gray-100">
            {primaryImage ? (
              <img
                src={primaryImage}
                alt={typedAsset.title}
                className="h-[380px] w-full object-cover"
              />
            ) : (
              <div className="flex h-[380px] items-center justify-center text-sm text-gray-500">
                No image uploaded
              </div>
            )}
          </div>

          {sortedImages.length > 1 ? (
            <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-4">
              {sortedImages.slice(1, 5).map((image, index) => (
                <img
                  key={`${image.image_url}-${index}`}
                  src={image.image_url}
                  alt={`${typedAsset.title} ${index + 2}`}
                  className="h-28 w-full rounded-xl object-cover"
                />
              ))}
            </div>
          ) : null}
        </section>

        <section className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Pricing</h2>
            <p className="mt-3 text-2xl font-semibold text-gray-900">
              {formatPrice(
                typedAsset.price_min,
                typedAsset.price_max,
                typedAsset.price_display
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Key details</h2>

            <dl className="mt-4 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <dt className="text-sm text-gray-500">Asset type</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {labelAssetType(typedAsset.asset_type)}
                </dd>
              </div>

              <div className="flex items-start justify-between gap-4">
                <dt className="text-sm text-gray-500">Listing status</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {labelListingType(typedAsset.listing_type)}
                </dd>
              </div>

              <div className="flex items-start justify-between gap-4">
                <dt className="text-sm text-gray-500">Building area</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {typedAsset.building_area_sqm !== null
                    ? `${typedAsset.building_area_sqm} sqm`
                    : "—"}
                </dd>
              </div>

              <div className="flex items-start justify-between gap-4">
                <dt className="text-sm text-gray-500">Land area</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {typedAsset.land_area_sqm !== null
                    ? `${typedAsset.land_area_sqm} sqm`
                    : "—"}
                </dd>
              </div>

              <div className="flex items-start justify-between gap-4">
                <dt className="text-sm text-gray-500">Visibility</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {typedAsset.is_public ? "Public" : "Private"}
                </dd>
              </div>

              <div className="flex items-start justify-between gap-4">
                <dt className="text-sm text-gray-500">Created</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {formatDate(typedAsset.created_at)}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Company</h2>
            <p className="mt-3 text-sm text-gray-700">{activeCompany.name}</p>
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Description</h2>
        <div className="mt-4 text-sm leading-6 text-gray-700">
          {typedAsset.description ? (
            <p>{typedAsset.description}</p>
          ) : (
            <p className="text-gray-500">No description added yet.</p>
          )}
        </div>
      </section>
    </main>
  );
}