import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveCompanyRecord } from "@/lib/app-context";

import { AddDealForm } from "@/app/(dashboard)/deal-rooms/AddDealForm";
import { labelDealSource } from "@/lib/deal-source";
import {
  dealStageBadgeClass,
  labelDealRoomStage,
  normalizeDealRoomStage,
} from "@/lib/deal-room-stage";

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

type DealRow = {
  id: string;
  title: string;
  summary: string | null;
  stage: string;
  source: string | null;
  updated_at: string;
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

const addDealPrimaryButtonClass =
  "inline-flex w-full items-center justify-center rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto";

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

  const dealRoom = room as DealRoomRow;

  const [dealsRes, assetRes, mandateRes] = await Promise.all([
    supabase
      .from("deals")
      .select("id, title, summary, stage, source, updated_at")
      .eq("deal_room_id", dealRoomId)
      .eq("company_id", companyId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("assets")
      .select("id, title, asset_type, listing_type, suburb, state, is_public, company_id")
      .eq("id", dealRoom.asset_id)
      .eq("company_id", companyId)
      .maybeSingle(),
    supabase
      .from("mandates")
      .select("id, title, asset_type, location, status, description, company_id")
      .eq("id", dealRoom.mandate_id)
      .eq("company_id", companyId)
      .maybeSingle(),
  ]);

  const deals: DealRow[] =
    !dealsRes.error && dealsRes.data
      ? (dealsRes.data as DealRow[])
      : [];

  const asset = !assetRes.error && assetRes.data ? (assetRes.data as DealAssetRow) : null;
  const mandate = !mandateRes.error && mandateRes.data ? (mandateRes.data as DealMandateRow) : null;

  const assetLoadFailed = Boolean(assetRes.error);
  const mandateLoadFailed = Boolean(mandateRes.error);
  const assetMissing = !asset;
  const mandateMissing = !mandate;
  const anySideMissing = assetMissing || mandateMissing;

  const assetLocation = asset
    ? [asset.suburb, asset.state].filter(Boolean).join(", ") || "Location not set"
    : null;
  const mandateLocation = mandate ? mandate.location?.trim() || "—" : null;

  return (
    <div className="mx-auto max-w-6xl">
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
            <span className="font-medium text-gray-800">Summary workspace for active deals</span>{" "}
            tying this listing and mandate together under {companyRecord.name}. Room opened{" "}
            {formatRoomDate(dealRoom.created_at)}. Execution — notes, documents, and stage movement —
            happens inside each individual deal record, not at the room level.
            {anySideMissing ? (
              <>
                {" "}
                <span className="text-gray-700">
                  One or both linked records are unavailable — context below.
                </span>
              </>
            ) : null}
          </p>
        </div>
        <AddDealForm
          dealRoomId={dealRoomId}
          buttonClassName={addDealPrimaryButtonClass}
        />
      </div>

      {anySideMissing ? (
        <div
          className="mt-5 rounded-xl border border-amber-200/80 bg-amber-50/50 px-3 py-2.5 sm:px-4"
          role="status"
        >
          <p className="text-[11px] font-semibold text-amber-950">Linked record notice</p>
          <p className="mt-0.5 text-[11px] leading-snug text-amber-900/85">
            {assetLoadFailed || mandateLoadFailed
              ? "We could not load every linked record. If this persists, try again or open the asset or mandate from the main lists."
              : "A listing or mandate may have been removed or is outside your active company. The deal room stays open for your records."}
          </p>
        </div>
      ) : null}

      <section className="mt-8" aria-label="Active deals">
        <div className="border-b border-gray-200 pb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Active deals</h2>
          <p className="mt-0.5 text-xs leading-snug text-gray-500">
            Cards summarise each deal; use Add deal for a new manual opportunity, or view a card for the
            execution record.
          </p>
        </div>

        {deals.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-gray-200 bg-gray-50/80 px-4 py-8 text-center">
            <p className="text-sm font-medium text-gray-800">No deals in this room yet</p>
            <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-gray-600">
              Start with Add deal, or open this room from the portfolio when a listing matches a
              mandate. If you just applied a database migration, refresh after your workspace syncs.
            </p>
            <div className="mt-5 flex justify-center">
              <AddDealForm
                dealRoomId={dealRoomId}
                buttonClassName={addDealPrimaryButtonClass}
              />
            </div>
          </div>
        ) : (
          <ul className="mt-4 grid list-none gap-4 p-0 sm:grid-cols-2">
            {deals.map((deal) => {
              const stage = normalizeDealRoomStage(deal.stage);
              return (
                <li key={deal.id}>
                  <article className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm ring-1 ring-black/[0.02] transition-shadow hover:shadow-md">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-semibold leading-snug text-gray-900">
                          {deal.title}
                        </h3>
                        <p className="mt-2">
                          <span className="inline-flex rounded-md bg-gray-50 px-2 py-0.5 text-[10px] font-medium tracking-wide text-gray-600 ring-1 ring-gray-200/90">
                            {labelDealSource(deal.source)}
                          </span>
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${dealStageBadgeClass(stage)}`}
                      >
                        {labelDealRoomStage(stage)}
                      </span>
                    </div>
                    <p className="mt-3 line-clamp-2 flex-1 text-xs leading-relaxed text-gray-600">
                      {deal.summary?.trim() ? deal.summary.trim() : "No summary yet."}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3">
                      <p className="text-[11px] text-gray-500">
                        <span className="font-medium text-gray-600">Updated</span>{" "}
                        {formatRoomDate(deal.updated_at)}
                      </p>
                      <Link
                        href={`/deal-rooms/${dealRoomId}/deals/${deal.id}`}
                        className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-900 shadow-sm transition hover:border-gray-400 hover:bg-gray-50"
                      >
                        View deal
                      </Link>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="mt-10 grid gap-4 lg:grid-cols-2">
        {asset ? (
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
        ) : (
          <section className="rounded-xl border border-dashed border-gray-200 bg-gray-50/70 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Asset</h2>
            </div>
            <p className="mt-3 text-sm font-medium text-gray-900">Listing unavailable</p>
            <p className="mt-1 text-xs leading-relaxed text-gray-600">
              The asset linked to this deal room is not visible for {companyRecord.name}. It may have
              been deleted, archived, or moved to another company.
            </p>
            <p className="mt-2 break-all font-mono text-[10px] text-gray-400">{dealRoom.asset_id}</p>
            <Link
              href="/assets"
              className="mt-3 inline-flex text-[11px] font-medium text-gray-800 underline-offset-2 hover:underline"
            >
              Browse assets
            </Link>
          </section>
        )}

        {mandate ? (
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
        ) : (
          <section className="rounded-xl border border-dashed border-gray-200 bg-gray-50/70 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Mandate</h2>
            </div>
            <p className="mt-3 text-sm font-medium text-gray-900">Mandate unavailable</p>
            <p className="mt-1 text-xs leading-relaxed text-gray-600">
              The mandate linked to this deal room is not visible for {companyRecord.name}. It may have
              been removed or is no longer under this company.
            </p>
            <p className="mt-2 break-all font-mono text-[10px] text-gray-400">{dealRoom.mandate_id}</p>
            <Link
              href="/mandates"
              className="mt-3 inline-flex text-[11px] font-medium text-gray-800 underline-offset-2 hover:underline"
            >
              Browse mandates
            </Link>
          </section>
        )}
      </div>

      <section className="mt-6 rounded-xl border border-dashed border-gray-200 bg-gray-50/80 px-4 py-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Workspace</h2>
        <p className="mt-1 text-xs leading-relaxed text-gray-600">
          {anySideMissing
            ? "When listing and mandate context is available again, use the links above. This room stays a lightweight overview; deep work belongs on each deal."
            : "Add deals as manual opportunities or capture them from portfolio matches. View deal opens the execution record for that row — pipeline stage, notes, and files will anchor there as the product grows."}
        </p>
      </section>
    </div>
  );
}
