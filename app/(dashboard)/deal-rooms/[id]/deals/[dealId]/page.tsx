import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveCompanyRecord } from "@/lib/app-context";
import { DealStageSelector } from "./DealStageSelector";
import { DealNotes } from "./DealNotes";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type PageProps = {
  params: Promise<{ id: string; dealId: string }>;
};

type DealRow = {
  id: string;
  deal_room_id: string;
  company_id: string;
  title: string;
  summary: string | null;
  stage: string;
  updated_at: string;
};

type AssetContext = {
  id: string;
  title: string;
  asset_type: string;
  suburb: string | null;
  state: string | null;
  building_area_sqm: number | null;
  price_min: number | null;
  price_max: number | null;
  price_display: string | null;
};

type MandateContext = {
  id: string;
  title: string | null;
  asset_type: string | null;
  location: string | null;
  description: string | null;
  budget_min: number | null;
  budget_max: number | null;
};

type MembershipRow = {
  user_id: string;
  role: string | null;
};

type NoteRow = {
  id: string;
  body: string;
  created_at: string;
  created_by: string | null;
};

type NormalizedNote = {
  id: string;
  body: string;
  created_at: string;
  created_by: string | null;
  authorEmail: string | null;
  authorRole: string | null;
  isCurrentUser: boolean;
};

function labelAssetType(value: string | null): string {
  if (!value) return "—";
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

function formatAUD(value: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatBudget(min: number | null, max: number | null): string | null {
  if (min !== null && max !== null) return `${formatAUD(min)} – ${formatAUD(max)}`;
  if (min !== null) return `From ${formatAUD(min)}`;
  if (max !== null) return `Up to ${formatAUD(max)}`;
  return null;
}

function cleanDescription(raw: string | null | undefined): string {
  const text = raw?.trim();
  if (!text) return "";
  const len = text.length;
  for (let n = 1; n <= Math.floor(len / 2); n++) {
    const chunk = text.slice(0, n);
    const escaped = chunk.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`^(${escaped}\\s*)+$`).test(text)) {
      return chunk.trim();
    }
  }
  return text;
}

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Australia/Brisbane",
  }).format(new Date(value));
}

export default async function DealRecordPage({ params }: PageProps) {
  const { id: dealRoomId, dealId } = await params;

  if (!UUID_RE.test(dealRoomId) || !UUID_RE.test(dealId)) {
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

  const { data: deal, error: dealError } = await supabase
    .from("deals")
    .select("id, deal_room_id, company_id, title, summary, stage, updated_at")
    .eq("id", dealId)
    .eq("deal_room_id", dealRoomId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (dealError || !deal) {
    notFound();
  }

  const row = deal as DealRow;

  // Fetch deal room to get asset_id and mandate_id
  const { data: dealRoom } = await supabase
    .from("deal_rooms")
    .select("asset_id, mandate_id")
    .eq("id", dealRoomId)
    .eq("company_id", companyId)
    .maybeSingle();

  // Fetch asset and mandate context in parallel (both optional — rooms may have nulls)
  const [assetRes, mandateRes] = await Promise.all([
    dealRoom?.asset_id
      ? supabase
          .from("assets")
          .select("id, title, asset_type, suburb, state, building_area_sqm, price_min, price_max, price_display")
          .eq("id", dealRoom.asset_id)
          .eq("company_id", companyId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    dealRoom?.mandate_id
      ? supabase
          .from("mandates")
          .select("id, title, asset_type, location, description, budget_min, budget_max")
          .eq("id", dealRoom.mandate_id)
          .eq("company_id", companyId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const asset = assetRes.data as AssetContext | null;
  const mandate = mandateRes.data as MandateContext | null;

  const { data: notesRaw, error: notesError } = await supabase
    .from("deal_notes")
    .select("id, body, created_at, created_by")
    .eq("deal_id", dealId)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (notesError) {
    console.error("[DealRecordPage] Failed to load notes:", notesError);
  }

  const { data: membershipsRaw, error: membershipsError } = await supabase
    .from("memberships")
    .select("user_id, role")
    .eq("company_id", companyId);

  if (membershipsError) {
    console.error("[DealRecordPage] Failed to load memberships:", membershipsError);
  }

  const memberships = (membershipsRaw ?? []) as MembershipRow[];

  const notes = ((notesRaw ?? []) as NoteRow[]).map((note): NormalizedNote => {
    const membership = memberships.find((m) => m.user_id === note.created_by);

    return {
      id: note.id,
      body: note.body,
      created_at: note.created_at,
      created_by: note.created_by,
      authorEmail: note.created_by === user.id ? user.email ?? null : null,
      authorRole: membership?.role ?? "Member",
      isCurrentUser: note.created_by === user.id,
    };
  });

  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
        <Link href="/portfolio" className="text-gray-500 hover:text-gray-800">
          Portfolio
        </Link>
        <span className="mx-1.5 text-gray-300">/</span>
        <Link
          href={`/deal-rooms/${dealRoomId}`}
          className="text-gray-500 hover:text-gray-800"
        >
          Deal room
        </Link>
        <span className="mx-1.5 text-gray-300">/</span>
        Deal
      </p>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            {row.title}
          </h1>
          <p className="mt-1 text-sm leading-snug text-gray-600">
            Execution record for this deal under {companyRecord.name}.
          </p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Asset context — primary card */}
        <div className="rounded-xl border border-gray-300 bg-white p-5 shadow-md">
          <p className="text-xs font-medium text-gray-500">Asset</p>
          {asset ? (
            <>
              <Link
                href={`/assets/${asset.id}`}
                className="mt-1.5 block text-lg font-semibold leading-snug text-gray-900 underline-offset-2 hover:underline"
              >
                {asset.title}
              </Link>
              <p className="mt-1 text-xs text-gray-500">
                {[asset.suburb, asset.state].filter(Boolean).join(", ") || "—"}
              </p>
              <dl className="mt-4 space-y-2.5 border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-xs text-gray-400">Type</dt>
                  <dd className="text-xs font-medium text-gray-800">{labelAssetType(asset.asset_type)}</dd>
                </div>
                {asset.building_area_sqm !== null && (
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-xs text-gray-400">Building area</dt>
                    <dd className="text-xs font-medium text-gray-800">{asset.building_area_sqm} sqm</dd>
                  </div>
                )}
                {formatBudget(asset.price_min, asset.price_max) !== null && (
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-xs text-gray-400">Price</dt>
                    <dd className="text-xs font-medium text-gray-800">
                      {asset.price_display?.trim() || formatBudget(asset.price_min, asset.price_max)}
                    </dd>
                  </div>
                )}
              </dl>
            </>
          ) : (
            <p className="mt-2 text-xs text-gray-400">Asset not available.</p>
          )}
        </div>

        {/* Mandate context — secondary card */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-gray-500">Mandate</p>
          {mandate ? (
            <>
              <Link
                href={`/mandates/${mandate.id}`}
                className="mt-1.5 block text-base font-semibold leading-snug text-gray-800 underline-offset-2 hover:underline"
              >
                {mandate.title?.trim() || "Untitled mandate"}
              </Link>
              <p className="mt-1 text-xs text-gray-500">
                {[labelAssetType(mandate.asset_type), mandate.location].filter(Boolean).join(" · ") || "—"}
              </p>
              <dl className="mt-4 space-y-2.5 border-t border-gray-100 pt-4">
                {formatBudget(mandate.budget_min, mandate.budget_max) !== null && (
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-xs text-gray-400">Budget</dt>
                    <dd className="text-xs font-medium text-gray-800">
                      {formatBudget(mandate.budget_min, mandate.budget_max)}
                    </dd>
                  </div>
                )}
                {(() => {
                  const desc = cleanDescription(mandate.description);
                  return (
                    <div className="space-y-1">
                      <dt className="text-xs text-gray-400">Requirements</dt>
                      {desc ? (
                        <dd className="line-clamp-2 text-xs leading-relaxed text-gray-500">{desc}</dd>
                      ) : (
                        <dd className="text-xs text-gray-400">No detailed requirements provided yet.</dd>
                      )}
                    </div>
                  );
                })()}
              </dl>
            </>
          ) : (
            <p className="mt-2 text-xs text-gray-400">Mandate not available.</p>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <DealStageSelector
          dealId={dealId}
          dealRoomId={dealRoomId}
          currentStage={row.stage}
        />
      </div>

      <dl className="mt-8 space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Summary
          </dt>
          <dd className="mt-1 text-sm text-gray-800">
            {row.summary?.trim() || "No summary yet."}
          </dd>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Last updated
          </dt>
          <dd className="mt-1 text-sm font-medium text-gray-900">
            {formatUpdatedAt(row.updated_at)}
          </dd>
        </div>
      </dl>

      <div className="mt-8">
        <DealNotes
          dealId={dealId}
          dealRoomId={dealRoomId}
          initialNotes={notes}
          currentUserDisplayName={companyRecord.name}
        />
      </div>

      <div className="mt-6">
        <Link
          href={`/deal-rooms/${dealRoomId}`}
          className="text-sm font-medium text-gray-800 underline-offset-4 hover:underline"
        >
          ← Back to deal room
        </Link>
      </div>
    </div>
  );
}