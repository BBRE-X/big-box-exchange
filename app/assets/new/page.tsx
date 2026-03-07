import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

async function createAsset(formData: FormData) {
  "use server";

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

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const assetType = String(formData.get("asset_type") ?? "").trim();
  const listingType = String(formData.get("listing_type") ?? "").trim();
  const suburb = String(formData.get("suburb") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim();
  const country = String(formData.get("country") ?? "").trim() || "Australia";
  const priceDisplay = String(formData.get("price_display") ?? "").trim();
  const isPublic = formData.get("is_public") === "on";
  const openForOffers = formData.get("open_for_offers") === "on";

  const priceMinRaw = String(formData.get("price_min") ?? "").trim();
  const priceMaxRaw = String(formData.get("price_max") ?? "").trim();
  const buildingAreaRaw = String(formData.get("building_area_sqm") ?? "").trim();
  const landAreaRaw = String(formData.get("land_area_sqm") ?? "").trim();

  if (!title || !assetType || !listingType) {
    redirect("/assets/new?error=missing_required_fields");
  }

  const { data: memberships, error: membershipsError } = await supabase
    .from("memberships")
    .select("company_id, status")
    .eq("user_id", user.id);

  if (membershipsError) {
    redirect(`/assets/new?error=${encodeURIComponent(membershipsError.message)}`);
  }

  const activeMemberships =
    memberships?.filter((m: any) => !m.status || m.status === "active") ?? [];

  if (activeMemberships.length === 0) {
    redirect("/companies");
  }

  let activeCompanyId = activeMemberships[0].company_id as string;

  const { data: profile } = await supabase
    .from("profiles")
    .select("active_company_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.active_company_id) {
    const matched = activeMemberships.find(
      (m: any) => m.company_id === profile.active_company_id
    );
    if (matched) {
      activeCompanyId = profile.active_company_id;
    }
  }

  function toNumberOrNull(value: string) {
    if (!value) return null;
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
  }

  const payload = {
    company_id: activeCompanyId,
    created_by: user.id,
    title,
    description: description || null,
    asset_type: assetType,
    listing_type: listingType,
    suburb: suburb || null,
    state: state || null,
    country: country || "Australia",
    price_min: toNumberOrNull(priceMinRaw),
    price_max: toNumberOrNull(priceMaxRaw),
    price_display: priceDisplay || null,
    building_area_sqm: toNumberOrNull(buildingAreaRaw),
    land_area_sqm: toNumberOrNull(landAreaRaw),
    is_public: isPublic,
    open_for_offers: openForOffers,
  };

  const { error } = await supabase.from("assets").insert(payload);

  if (error) {
    redirect(`/assets/new?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/assets");
}

export default async function NewAssetPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const error = params?.error;

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
      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">
            Failed to load memberships: {membershipsError.message}
          </p>
        </div>
      </main>
    );
  }

  const activeMemberships =
    memberships?.filter((m: any) => !m.status || m.status === "active") ?? [];

  if (activeMemberships.length === 0) {
    redirect("/companies");
  }

  let activeCompany = activeMemberships[0].companies;

  const { data: profile } = await supabase
    .from("profiles")
    .select("active_company_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.active_company_id) {
    const matched = activeMemberships.find(
      (m: any) => m.company_id === profile.active_company_id
    );
    if (matched?.companies) {
      activeCompany = matched.companies;
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold">Create asset</h1>
        <p className="mt-2 text-sm text-gray-600">
          Add a property listing, development site, or off-market opportunity for{" "}
          <span className="font-medium text-gray-900">
            {activeCompany?.name ?? "your active company"}
          </span>
          .
        </p>
      </div>

      {error ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{decodeURIComponent(error)}</p>
        </div>
      ) : null}

      <form action={createAsset} className="space-y-8">
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Core details</h2>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label htmlFor="title" className="mb-2 block text-sm font-medium text-gray-800">
                Title
              </label>
              <input
                id="title"
                name="title"
                type="text"
                required
                placeholder="Freestanding industrial facility in Yatala"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-black"
              />
            </div>

            <div>
              <label
                htmlFor="asset_type"
                className="mb-2 block text-sm font-medium text-gray-800"
              >
                Asset type
              </label>
              <select
                id="asset_type"
                name="asset_type"
                required
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-black"
              >
                <option value="">Select asset type</option>
                <option value="industrial">Industrial</option>
                <option value="retail">Retail</option>
                <option value="office">Office</option>
                <option value="land">Land</option>
                <option value="development_site">Development Site</option>
                <option value="mixed_use">Mixed Use</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="listing_type"
                className="mb-2 block text-sm font-medium text-gray-800"
              >
                Listing type
              </label>
              <select
                id="listing_type"
                name="listing_type"
                required
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-black"
              >
                <option value="">Select listing type</option>
                <option value="sale">For Sale</option>
                <option value="lease">For Lease</option>
                <option value="both">Sale or Lease</option>
                <option value="off_market">Off Market</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="description"
                className="mb-2 block text-sm font-medium text-gray-800"
              >
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={6}
                placeholder="Short overview of the asset, use case, highlights, lease status, or opportunity."
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-black"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Location</h2>

          <div className="mt-5 grid gap-5 md:grid-cols-3">
            <div>
              <label htmlFor="suburb" className="mb-2 block text-sm font-medium text-gray-800">
                Suburb
              </label>
              <input
                id="suburb"
                name="suburb"
                type="text"
                placeholder="Yatala"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-black"
              />
            </div>

            <div>
              <label htmlFor="state" className="mb-2 block text-sm font-medium text-gray-800">
                State
              </label>
              <input
                id="state"
                name="state"
                type="text"
                placeholder="QLD"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-black"
              />
            </div>

            <div>
              <label htmlFor="country" className="mb-2 block text-sm font-medium text-gray-800">
                Country
              </label>
              <input
                id="country"
                name="country"
                type="text"
                defaultValue="Australia"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-black"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Commercial details</h2>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div>
              <label
                htmlFor="price_min"
                className="mb-2 block text-sm font-medium text-gray-800"
              >
                Price min
              </label>
              <input
                id="price_min"
                name="price_min"
                type="number"
                step="0.01"
                placeholder="2500000"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-black"
              />
            </div>

            <div>
              <label
                htmlFor="price_max"
                className="mb-2 block text-sm font-medium text-gray-800"
              >
                Price max
              </label>
              <input
                id="price_max"
                name="price_max"
                type="number"
                step="0.01"
                placeholder="3200000"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-black"
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="price_display"
                className="mb-2 block text-sm font-medium text-gray-800"
              >
                Price display override
              </label>
              <input
                id="price_display"
                name="price_display"
                type="text"
                placeholder="Contact agent / EOI / Offers to purchase"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-black"
              />
            </div>

            <div>
              <label
                htmlFor="building_area_sqm"
                className="mb-2 block text-sm font-medium text-gray-800"
              >
                Building area (sqm)
              </label>
              <input
                id="building_area_sqm"
                name="building_area_sqm"
                type="number"
                step="0.01"
                placeholder="1450"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-black"
              />
            </div>

            <div>
              <label
                htmlFor="land_area_sqm"
                className="mb-2 block text-sm font-medium text-gray-800"
              >
                Land area (sqm)
              </label>
              <input
                id="land_area_sqm"
                name="land_area_sqm"
                type="number"
                step="0.01"
                placeholder="2800"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-black"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Visibility</h2>

          <div className="mt-5 space-y-4">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                name="is_public"
                className="mt-1 h-4 w-4 rounded border-gray-300"
              />
              <span>
                <span className="block text-sm font-medium text-gray-800">
                  Public listing
                </span>
                <span className="block text-sm text-gray-600">
                  Make this asset visible in the public feed.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                name="open_for_offers"
                className="mt-1 h-4 w-4 rounded border-gray-300"
              />
              <span>
                <span className="block text-sm font-medium text-gray-800">
                  Open for offers
                </span>
                <span className="block text-sm text-gray-600">
                  Show that the company is actively receiving approaches.
                </span>
              </span>
            </label>
          </div>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            className="rounded-xl bg-black px-5 py-3 text-sm font-medium text-white"
          >
            Save asset
          </button>

          <Link
            href="/assets"
            className="rounded-xl border border-gray-300 px-5 py-3 text-center text-sm font-medium text-gray-800"
          >
            Cancel
          </Link>
        </div>
      </form>
    </main>
  );
}