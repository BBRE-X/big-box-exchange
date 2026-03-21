import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

type SearchArea = {
  label?: string | null;
  suburb?: string | null;
  state?: string | null;
  radius_km?: number | null;
  lat?: number | null;
  lng?: number | null;
};

function toNullableString(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function toNullableNumber(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const number = Number(trimmed);
  return Number.isNaN(number) ? null : number;
}

export default async function NewMandatePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const mandateId = resolvedSearchParams?.id ?? null;

  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { data: activeMembership, error: membershipError } = await supabase
    .from("memberships")
    .select("company_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (membershipError) {
    console.error("Failed to load active membership:", membershipError);
  }

  if (!activeMembership?.company_id) {
    redirect("/companies");
  }

  let mandate: Record<string, any> | null = null;

  if (mandateId) {
    const { data: existingMandate, error: mandateError } = await supabase
      .from("mandates")
      .select("*")
      .eq("id", mandateId)
      .eq("company_id", activeMembership.company_id)
      .maybeSingle();

    if (mandateError) {
      console.error("Failed to load mandate for edit:", mandateError);
    }

    if (!existingMandate) {
      notFound();
    }

    mandate = existingMandate;
  }

  async function saveMandate(formData: FormData) {
    "use server";

    const supabase = await supabaseServer();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/auth");
    }

    const { data: activeMembership } = await supabase
      .from("memberships")
      .select("company_id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!activeMembership?.company_id) {
      redirect("/companies");
    }

    const formMandateId = toNullableString(formData.get("mandate_id"));
    const title = toNullableString(formData.get("title"));
    const assetType = toNullableString(formData.get("asset_type"));
    const dealIntent = toNullableString(formData.get("deal_intent"));
    const status = toNullableString(formData.get("status")) || "active";
    const intendedUse = toNullableString(formData.get("intended_use"));
    const zoningNotes = toNullableString(formData.get("zoning_notes"));
    const description = toNullableString(formData.get("description"));
    const budgetMin = toNullableNumber(formData.get("budget_min"));
    const budgetMax = toNullableNumber(formData.get("budget_max"));
    const buildingAreaMin = toNullableNumber(
      formData.get("building_area_min_sqm")
    );
    const buildingAreaMax = toNullableNumber(
      formData.get("building_area_max_sqm")
    );
    const landAreaMin = toNullableNumber(formData.get("land_area_min_sqm"));
    const landAreaMax = toNullableNumber(formData.get("land_area_max_sqm"));
    const searchAreaLabel = toNullableString(formData.get("search_area_label"));
    const searchAreaState = toNullableString(formData.get("search_area_state"));
    const searchAreaRadiusKm = toNullableNumber(
      formData.get("search_area_radius_km")
    );

    const searchAreas =
      searchAreaLabel || searchAreaState || searchAreaRadiusKm !== null
        ? [
            {
              label: searchAreaLabel,
              state: searchAreaState,
              radius_km: searchAreaRadiusKm,
            },
          ]
        : [];

    const payload = {
      title,
      asset_type: assetType,
      deal_intent: dealIntent,
      status,
      intended_use: intendedUse,
      zoning_notes: zoningNotes,
      description,
      budget_min: budgetMin,
      budget_max: budgetMax,
      building_area_min_sqm: buildingAreaMin,
      building_area_max_sqm: buildingAreaMax,
      land_area_min_sqm: landAreaMin,
      land_area_max_sqm: landAreaMax,
      search_areas: searchAreas,
    };

    if (formMandateId) {
      const { data: existingMandate } = await supabase
        .from("mandates")
        .select("id")
        .eq("id", formMandateId)
        .eq("company_id", activeMembership.company_id)
        .maybeSingle();

      if (!existingMandate) {
        notFound();
      }

      const { data: updatedMandate, error } = await supabase
        .from("mandates")
        .update(payload)
        .eq("id", formMandateId)
        .eq("company_id", activeMembership.company_id)
        .select("id")
        .single();

      if (error) {
        console.error("Failed to update mandate:", error);
        throw new Error(
          `Failed to update mandate: ${error.message || "Unknown Supabase error"}`
        );
      }

      revalidatePath("/mandates");
      revalidatePath(`/mandates/${updatedMandate.id}`);
      revalidatePath(`/mandates/new?id=${updatedMandate.id}`);

      redirect(`/mandates/${updatedMandate.id}`);
    }

    const { data: createdMandate, error } = await supabase
      .from("mandates")
      .insert({
        company_id: activeMembership.company_id,
        ...payload,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to create mandate:", error);
      throw new Error(
        `Failed to create mandate: ${error.message || "Unknown Supabase error"}`
      );
    }

    revalidatePath("/mandates");
    revalidatePath(`/mandates/${createdMandate.id}`);

    redirect(`/mandates/${createdMandate.id}`);
  }

  const pageTitle = mandate ? "Edit Mandate" : "New Mandate";
  const pageDescription = mandate
    ? "Update the acquisition mandate for your active company."
    : "Create an acquisition mandate for your active company.";
  const submitLabel = mandate ? "Save changes" : "Create mandate";

  const firstSearchArea: SearchArea | null =
    Array.isArray(mandate?.search_areas) && mandate?.search_areas.length > 0
      ? mandate.search_areas[0]
      : null;

  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-10 flex items-start justify-between gap-6">
          <div>
            <h1 className="text-5xl font-semibold tracking-tight text-slate-900">
              {pageTitle}
            </h1>
            <p className="mt-4 text-xl text-slate-600">{pageDescription}</p>
          </div>

          <Link
            href={mandate ? `/mandates/${mandate.id}` : "/mandates"}
            className="rounded-2xl border border-neutral-300 bg-white px-8 py-5 text-xl font-medium text-neutral-900 transition hover:bg-neutral-100"
          >
            Back
          </Link>
        </div>

        <form action={saveMandate} className="space-y-10">
          <input
            type="hidden"
            name="mandate_id"
            defaultValue={mandate?.id ?? ""}
          />

          <div className="grid gap-10">
            <div>
              <label
                htmlFor="title"
                className="mb-4 block text-2xl font-medium text-slate-900"
              >
                Title
              </label>
              <input
                id="title"
                name="title"
                type="text"
                defaultValue={mandate?.title ?? ""}
                placeholder="e.g. South East Industrial Acquisition"
                className="w-full rounded-3xl border border-neutral-200 bg-white px-9 py-8 text-2xl text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>

            <div>
              <label
                htmlFor="asset_type"
                className="mb-4 block text-2xl font-medium text-slate-900"
              >
                Asset type
              </label>
              <input
                id="asset_type"
                name="asset_type"
                type="text"
                defaultValue={mandate?.asset_type ?? ""}
                placeholder="e.g. Industrial"
                className="w-full rounded-3xl border border-neutral-200 bg-white px-9 py-8 text-2xl text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>

            <div className="grid gap-8 md:grid-cols-2">
              <div>
                <label
                  htmlFor="deal_intent"
                  className="mb-4 block text-2xl font-medium text-slate-900"
                >
                  Deal intent
                </label>
                <select
                  id="deal_intent"
                  name="deal_intent"
                  defaultValue={mandate?.deal_intent ?? ""}
                  className="w-full rounded-3xl border border-neutral-200 bg-white px-9 py-8 text-2xl text-slate-900 outline-none"
                >
                  <option value="">Select deal intent</option>
                  <option value="buy">Buy</option>
                  <option value="lease">Lease</option>
                  <option value="buy_or_lease">Buy or Lease</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="status"
                  className="mb-4 block text-2xl font-medium text-slate-900"
                >
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  defaultValue={mandate?.status ?? "active"}
                  className="w-full rounded-3xl border border-neutral-200 bg-white px-9 py-8 text-2xl text-slate-900 outline-none"
                >
                  <option value="active">Active</option>
                  <option value="matched">Matched</option>
                  <option value="engaged">Engaged</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="intended_use"
                className="mb-4 block text-2xl font-medium text-slate-900"
              >
                Intended use
              </label>
              <textarea
                id="intended_use"
                name="intended_use"
                defaultValue={mandate?.intended_use ?? ""}
                placeholder="Describe what the buyer or tenant needs the asset for"
                rows={4}
                className="w-full rounded-3xl border border-neutral-200 bg-white px-9 py-8 text-2xl text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>

            <div>
              <label
                htmlFor="zoning_notes"
                className="mb-4 block text-2xl font-medium text-slate-900"
              >
                Zoning / planning notes
              </label>
              <textarea
                id="zoning_notes"
                name="zoning_notes"
                defaultValue={mandate?.zoning_notes ?? ""}
                placeholder="Add zoning, planning, or approval requirements"
                rows={4}
                className="w-full rounded-3xl border border-neutral-200 bg-white px-9 py-8 text-2xl text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>

            <div className="grid gap-8 md:grid-cols-2">
              <div>
                <label
                  htmlFor="budget_min"
                  className="mb-4 block text-2xl font-medium text-slate-900"
                >
                  Budget minimum
                </label>
                <input
                  id="budget_min"
                  name="budget_min"
                  type="number"
                  defaultValue={mandate?.budget_min ?? ""}
                  placeholder="e.g. 2000000"
                  className="w-full rounded-3xl border border-neutral-200 bg-white px-9 py-8 text-2xl text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>

              <div>
                <label
                  htmlFor="budget_max"
                  className="mb-4 block text-2xl font-medium text-slate-900"
                >
                  Budget maximum
                </label>
                <input
                  id="budget_max"
                  name="budget_max"
                  type="number"
                  defaultValue={mandate?.budget_max ?? ""}
                  placeholder="e.g. 5000000"
                  className="w-full rounded-3xl border border-neutral-200 bg-white px-9 py-8 text-2xl text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
              <div>
                <label
                  htmlFor="building_area_min_sqm"
                  className="mb-4 block text-2xl font-medium text-slate-900"
                >
                  Building area minimum (sqm)
                </label>
                <input
                  id="building_area_min_sqm"
                  name="building_area_min_sqm"
                  type="number"
                  defaultValue={mandate?.building_area_min_sqm ?? ""}
                  placeholder="e.g. 1000"
                  className="w-full rounded-3xl border border-neutral-200 bg-white px-9 py-8 text-2xl text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>

              <div>
                <label
                  htmlFor="building_area_max_sqm"
                  className="mb-4 block text-2xl font-medium text-slate-900"
                >
                  Building area maximum (sqm)
                </label>
                <input
                  id="building_area_max_sqm"
                  name="building_area_max_sqm"
                  type="number"
                  defaultValue={mandate?.building_area_max_sqm ?? ""}
                  placeholder="e.g. 5000"
                  className="w-full rounded-3xl border border-neutral-200 bg-white px-9 py-8 text-2xl text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
              <div>
                <label
                  htmlFor="land_area_min_sqm"
                  className="mb-4 block text-2xl font-medium text-slate-900"
                >
                  Land area minimum (sqm)
                </label>
                <input
                  id="land_area_min_sqm"
                  name="land_area_min_sqm"
                  type="number"
                  defaultValue={mandate?.land_area_min_sqm ?? ""}
                  placeholder="e.g. 2000"
                  className="w-full rounded-3xl border border-neutral-200 bg-white px-9 py-8 text-2xl text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>

              <div>
                <label
                  htmlFor="land_area_max_sqm"
                  className="mb-4 block text-2xl font-medium text-slate-900"
                >
                  Land area maximum (sqm)
                </label>
                <input
                  id="land_area_max_sqm"
                  name="land_area_max_sqm"
                  type="number"
                  defaultValue={mandate?.land_area_max_sqm ?? ""}
                  placeholder="e.g. 10000"
                  className="w-full rounded-3xl border border-neutral-200 bg-white px-9 py-8 text-2xl text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              <div className="md:col-span-2">
                <label
                  htmlFor="search_area_label"
                  className="mb-4 block text-2xl font-medium text-slate-900"
                >
                  Search area
                </label>
                <input
                  id="search_area_label"
                  name="search_area_label"
                  type="text"
                  defaultValue={firstSearchArea?.label ?? ""}
                  placeholder="e.g. South East Queensland"
                  className="w-full rounded-3xl border border-neutral-200 bg-white px-9 py-8 text-2xl text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>

              <div>
                <label
                  htmlFor="search_area_state"
                  className="mb-4 block text-2xl font-medium text-slate-900"
                >
                  State
                </label>
                <input
                  id="search_area_state"
                  name="search_area_state"
                  type="text"
                  defaultValue={firstSearchArea?.state ?? ""}
                  placeholder="e.g. QLD"
                  className="w-full rounded-3xl border border-neutral-200 bg-white px-9 py-8 text-2xl text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="search_area_radius_km"
                className="mb-4 block text-2xl font-medium text-slate-900"
              >
                Search radius (km)
              </label>
              <input
                id="search_area_radius_km"
                name="search_area_radius_km"
                type="number"
                defaultValue={firstSearchArea?.radius_km ?? ""}
                placeholder="e.g. 25"
                className="w-full rounded-3xl border border-neutral-200 bg-white px-9 py-8 text-2xl text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>

            <div>
              <label
                htmlFor="description"
                className="mb-4 block text-2xl font-medium text-slate-900"
              >
                Description
              </label>
              <textarea
                id="description"
                name="description"
                defaultValue={mandate?.description ?? ""}
                placeholder="Add a fuller summary of the requirement"
                rows={6}
                className="w-full rounded-3xl border border-neutral-200 bg-white px-9 py-8 text-2xl text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded-3xl bg-black px-10 py-6 text-2xl font-medium text-white transition hover:opacity-90"
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}