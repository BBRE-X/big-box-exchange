import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveCompanyRecord } from "@/lib/app-context";
import { addDealRoomNote } from "./actions";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ note?: string | string[] }>;
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

type DealRoomNoteRow = {
  id: string;
  body: string;
  created_at: string;
  created_by: string;
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

function formatNoteTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function firstSearchParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function DealRoomDetailPage({ params, searchParams }: PageProps) {
  const { id: dealRoomId } = await params;
  const sp = searchParams ? await searchParams : {};
  const noteParam = firstSearchParam(sp.note);

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

  const [assetRes, mandateRes, notesRes] = await Promise.all([
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
    supabase
      .from("deal_room_notes")
      .select("id, body, created_at, created_by")
      .eq("deal_room_id", dealRoomId)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
  ]);

  const asset = !assetRes.error && assetRes.data ? (assetRes.data as DealAssetRow) : null;
  const mandate = !mandateRes.error && mandateRes.data ? (mandateRes.data as DealMandateRow) : null;

  const assetLoadFailed = Boolean(assetRes.error);
  const mandateLoadFailed = Boolean(mandateRes.error);
  const assetMissing = !asset;
  const mandateMissing = !mandate;
  const anySideMissing = assetMissing || mandateMissing;

  const notes =
    !notesRes.error && notesRes.data
      ? (notesRes.data as DealRoomNoteRow[])
      : [];

  const assetLocation = asset
    ? [asset.suburb, asset.state].filter(Boolean).join(", ") || "Location not set"
    : null;
  const mandateLocation = mandate ? mandate.location?.trim() || "—" : null;

  const showEmptyNoteError = noteParam === "empty";
  const showLongNoteError = noteParam === "long";
  const showGenericNoteError = noteParam === "error";

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
            {formatRoomDate(dealRoom.created_at)}.
            {anySideMissing ? (
              <>
                {" "}
                <span className="text-gray-700">
                  One or both linked records are unavailable — details below.
                </span>
              </>
            ) : null}
          </p>
        </div>
      </div>

      {anySideMissing ? (
        <div
          className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50/50 px-3 py-2.5 sm:px-4"
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

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
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

      <section className="mt-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="border-b border-gray-100 pb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Internal notes</h2>
          <p className="mt-1 text-[11px] leading-relaxed text-gray-500">
            Visible only to members of {companyRecord.name}. Newest first.
          </p>
        </div>

        {showEmptyNoteError ? (
          <div
            className="mt-3 rounded-lg border border-amber-200/90 bg-amber-50/60 px-3 py-2 text-[11px] text-amber-950"
            role="status"
          >
            Add some text before saving your note.
          </div>
        ) : null}
        {showLongNoteError ? (
          <div
            className="mt-3 rounded-lg border border-amber-200/90 bg-amber-50/60 px-3 py-2 text-[11px] text-amber-950"
            role="status"
          >
            That note is too long. Shorten it and try again.
          </div>
        ) : null}
        {showGenericNoteError ? (
          <div
            className="mt-3 rounded-lg border border-red-200/90 bg-red-50/60 px-3 py-2 text-[11px] text-red-950"
            role="status"
          >
            We couldn&apos;t save that note. Please try again.
          </div>
        ) : null}

        <form action={addDealRoomNote} className="mt-4 space-y-3">
          <input type="hidden" name="dealRoomId" value={dealRoomId} />
          <label className="block">
            <span className="sr-only">New note</span>
            <textarea
              name="body"
              rows={4}
              placeholder="Capture context, next steps, or decisions for your team…"
              className="w-full resize-y rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10"
            />
          </label>
          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center rounded-lg bg-gray-900 px-3.5 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-gray-800"
            >
              Add note
            </button>
          </div>
        </form>

        <div className="mt-6 border-t border-gray-100 pt-4">
          {notes.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/50 px-4 py-8 text-center">
              <p className="text-sm font-medium text-gray-800">No notes yet</p>
              <p className="mt-1 text-xs leading-relaxed text-gray-500">
                When your team adds updates here, they&apos;ll show up in order with the latest on top.
              </p>
            </div>
          ) : (
            <ul className="space-y-4">
              {notes.map((note) => (
                <li
                  key={note.id}
                  className="rounded-lg border border-gray-100 bg-gray-50/40 px-3 py-3 sm:px-4"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <p className="text-[11px] font-medium text-gray-700">
                      {note.created_by === user.id ? "You" : "Team member"}
                    </p>
                    <time
                      dateTime={note.created_at}
                      className="text-[11px] tabular-nums text-gray-400"
                    >
                      {formatNoteTimestamp(note.created_at)}
                    </time>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
                    {note.body}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="mt-4 rounded-xl border border-dashed border-gray-200 bg-gray-50/80 px-4 py-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Workspace</h2>
        <p className="mt-1 text-xs leading-relaxed text-gray-600">
          {anySideMissing
            ? "When both sides are available again, use the links above to jump into the full records. Messaging and shared files will land here in a later release."
            : "Messaging, tasks, and shared files will plug in here as the deal room evolves. Use internal notes above for team context; use the links above for full asset and mandate records."}
        </p>
      </section>
    </main>
  );
}
