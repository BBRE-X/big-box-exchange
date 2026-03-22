import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveCompanyRecord } from "@/lib/app-context";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type PageProps = {
  params: Promise<{ id: string }>;
};

type DealRoomRow = {
  id: string;
  company_id: string;
  asset_id: string;
  mandate_id: string;
  created_at: string;
};

type DealAssetRow = {
  id: string;
  title: string;
  asset_type: string;
  listing_type: string;
  suburb: string | null;
  state: string | null;
  is_public: boolean;
  company_id: string;
};

type DealMandateRow = {
  id: string;
  title: string;
  asset_type: string | null;
  location: string | null;
  status: string | null;
  description: string | null;
  company_id: string;
};

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

function niceMandateStatus(value: string | null) {
  if (!value?.trim()) return "—";
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatRoomDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function DealRoomDetailPage({ params }: PageProps) {
  const { id: dealRoomId } = await params;

  if (!UUID_RE.test(dealRoomId)) {
    notFound();
  }

  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const companyRecord = await getActiveCompanyRecord(user.id);

  if (!companyRecord) {
    redirect("/companies");
  }

  const companyId = companyRecord.id;

  const { data: room, error: roomError } = await supabase
    .from("deal_rooms")
    .select("id, company_id, asset_id, mandate_id, created_at")
    .eq("id", dealRoomId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (roomError || !room) {
    notFound();
  }

  const typedRoom = room as DealRoomRow;

  const [assetRes, mandateRes] = await Promise.all([
    supabase
      .from("assets")
      .select("id, title, asset_type, listing_type, suburb, state, is_public, company_id")
      .eq("id", typedRoom.asset_id)
      .eq("company_id", companyId)
      .maybeSingle(),
    supabase
      .from("mandates")
      .select("id, title, asset_type, location, status, description, company_id")
      .eq("id", typedRoom.mandate_id)
      .eq("company_id", companyId)
      .maybeSingle(),
  ]);

  const asset = assetRes.data as DealAssetRow | null;
  const mandate = mandateRes.data as DealMandateRow | null;

  if (!asset || !mandate) {
    notFound();
  }

  const assetLocation =
    [asset.suburb, asset.state].filter(Boolean).join(", ") || "Location not set";
  const mandateLocation = mandate.location?.trim() || "—";

  return (
    <main className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
            <Link href="/portfolio" className="text-gray-500 hover:text-gray-800">
              Portfolio
            </Link>
            <span className="mx-1.5 text-gray-300">/</span>
            Deal room
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-gray-900">Deal room</h1>
          <p className="mt-1 max-w-2xl text-sm leading-snug text-gray-600">
            Internal workspace for this asset and mandate pair under {companyRecord.name}. Opened{" "}
            {formatRoomDate(typedRoom.created_at)}.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Asset</h2>
            <Link
              href={`/assets/${asset.id}`}
              className="shrink-0 text-[11px] font-medium text-gray-700 hover:text-gray-900"
            >
              View listing
            </Link>
          </div>
          <h3 className="mt-3 text-base font-semibold leading-snug text-gray-900">{asset.title}</h3>
          <p className="mt-1 text-xs text-gray-500">{assetLocation}</p>
          <dl className="mt-3 space-y-2 text-xs">
            <div className="flex justify-between gap-3">
              <dt className="text-gray-500">Type</dt>
              <dd className="font-medium text-gray-900">{labelAssetType(asset.asset_type)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-gray-500">Listing</dt>
              <dd className="font-medium text-gray-900">{labelListingType(asset.listing_type)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-gray-500">Visibility</dt>
              <dd className="font-medium text-gray-900">{asset.is_public ? "Public" : "Private"}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Mandate</h2>
            <Link
              href={`/mandates/${mandate.id}`}
              className="shrink-0 text-[11px] font-medium text-gray-700 hover:text-gray-900"
            >
              View mandate
            </Link>
          </div>
          <h3 className="mt-3 text-base font-semibold leading-snug text-gray-900">{mandate.title}</h3>
          <p className="mt-1 text-xs text-gray-500">{mandateLocation}</p>
          <dl className="mt-3 space-y-2 text-xs">
            <div className="flex justify-between gap-3">
              <dt className="text-gray-500">Status</dt>
              <dd className="font-medium text-gray-900">{niceMandateStatus(mandate.status)}</dd>
            </div>
            {mandate.asset_type ? (
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">Target type</dt>
                <dd className="font-medium text-gray-900">{mandate.asset_type}</dd>
              </div>
            ) : null}
          </dl>
          {mandate.description?.trim() ? (
            <p className="mt-3 border-t border-gray-100 pt-3 text-xs leading-relaxed text-gray-600">
              {mandate.description.trim()}
            </p>
          ) : null}
        </section>
      </div>

      <section className="mt-4 rounded-xl border border-dashed border-gray-200 bg-gray-50/80 px-4 py-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Workspace</h2>
        <p className="mt-1 text-xs leading-relaxed text-gray-600">
          Negotiation notes, messaging, tasks, and shared files will plug in here as the deal room
          evolves. For now, use the links above to work from the full asset and mandate records.
        </p>
      </section>
    </main>
  );
}
