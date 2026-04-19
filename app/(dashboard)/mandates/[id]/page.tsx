import type { ReactNode } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Mandate row shape: aligned with `app/(dashboard)/mandates/new/page.tsx` insert/update payload
 * plus columns from `mandates` that the list view selects (`location`, etc.).
 *
 * Future DB extensions (add migrations + types before UI): mandate_visibility,
 * yield_target_pct, irr_target_pct, equity_multiple, structured markets/geo, buyer brief fields.
 */

type SearchArea = {
  label?: string | null;
  suburb?: string | null;
  state?: string | null;
  radius_km?: number | null;
  lat?: number | null;
  lng?: number | null;
};

type MandateDetailRow = {
  id: string;
  company_id: string;
  created_at: string;
  title?: string | null;
  location?: string | null;
  description?: string | null;
  status?: string | null;
  asset_type?: string | null;
  deal_intent?: string | null;
  deal_type?: string | null;
  intended_use?: string | null;
  zoning_notes?: string | null;
  zoning?: string | null;
  budget_min?: number | null;
  budget_max?: number | null;
  building_area_min_sqm?: number | null;
  building_area_max_sqm?: number | null;
  land_area_min_sqm?: number | null;
  land_area_max_sqm?: number | null;
  search_areas?: unknown;
};

function isMeaningfulString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parseSearchAreas(raw: unknown): SearchArea[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is SearchArea => item !== null && typeof item === "object");
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatBudgetRange(min?: number | null, max?: number | null): string | null {
  const hasMin = min !== null && min !== undefined && !Number.isNaN(min);
  const hasMax = max !== null && max !== undefined && !Number.isNaN(max);

  if (hasMin && hasMax) return `${formatCurrency(min!)} – ${formatCurrency(max!)}`;
  if (hasMin) return `From ${formatCurrency(min!)}`;
  if (hasMax) return `Up to ${formatCurrency(max!)}`;
  return null;
}

function formatSqmRange(min?: number | null, max?: number | null): string | null {
  const hasMin = min !== null && min !== undefined && !Number.isNaN(min);
  const hasMax = max !== null && max !== undefined && !Number.isNaN(max);

  if (hasMin && hasMax) return `${min} – ${max} sqm`;
  if (hasMin) return `${min} sqm minimum`;
  if (hasMax) return `Up to ${max} sqm`;
  return null;
}

function formatDate(value?: string | null) {
  if (!value) return "To be confirmed";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function niceLabel(value?: string | null) {
  if (!isMeaningfulString(value)) return null;

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function dealIntentLabel(mandate: MandateDetailRow) {
  return niceLabel(mandate.deal_intent) ?? niceLabel(mandate.deal_type);
}

function zoningText(mandate: MandateDetailRow) {
  if (isMeaningfulString(mandate.zoning_notes)) return mandate.zoning_notes!.trim();
  if (isMeaningfulString(mandate.zoning)) return mandate.zoning!.trim();
  return null;
}

function searchAreaHasContent(area: SearchArea) {
  return (
    isMeaningfulString(area.label) ||
    isMeaningfulString(area.suburb) ||
    isMeaningfulString(area.state) ||
    (area.radius_km !== null &&
      area.radius_km !== undefined &&
      !Number.isNaN(area.radius_km)) ||
    (area.lat !== null &&
      area.lat !== undefined &&
      !Number.isNaN(area.lat) &&
      area.lng !== null &&
      area.lng !== undefined &&
      !Number.isNaN(area.lng))
  );
}

function formatMarketSummary(mandate: MandateDetailRow, areas: SearchArea[]) {
  if (isMeaningfulString(mandate.location)) return mandate.location!.trim();

  const first = areas.find(searchAreaHasContent);
  if (!first) return null;

  const parts = [
    isMeaningfulString(first.label) ? first.label : null,
    isMeaningfulString(first.suburb) ? first.suburb : null,
    isMeaningfulString(first.state) ? first.state : null,
  ].filter(Boolean);

  if (parts.length) return parts.join(" · ");

  if (
    first.radius_km !== null &&
    first.radius_km !== undefined &&
    !Number.isNaN(first.radius_km)
  ) {
    return `${first.radius_km} km radius`;
  }

  if (
    first.lat !== null &&
    first.lat !== undefined &&
    first.lng !== null &&
    first.lng !== undefined
  ) {
    return `${first.lat}, ${first.lng}`;
  }

  return null;
}

type SummaryItem = {
  label: string;
  value: string;
};

function FieldRow({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  if (!isMeaningfulString(value)) return null;

  return (
    <div className="border-b border-gray-100 py-2.5 last:border-b-0 last:pb-0 first:pt-0">
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-gray-900">{value}</p>
    </div>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold tracking-tight text-gray-900 md:text-lg">{title}</h2>
      {description ? <p className="mt-1 text-xs leading-snug text-gray-600">{description}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default async function MandateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  const { data: mandate, error } = await supabase
    .from("mandates")
    .select("*")
    .eq("id", id)
    .eq("company_id", activeMembership.company_id)
    .maybeSingle();

  if (error) {
    console.error("Failed to load mandate:", error);
  }

  if (!mandate) {
    notFound();
  }

  const row = mandate as MandateDetailRow;
  const searchAreas = parseSearchAreas(row.search_areas).filter(searchAreaHasContent);

  const displayTitle = isMeaningfulString(row.title) ? row.title!.trim() : "Untitled mandate";

  const summaryItems: SummaryItem[] = [
    {
      label: "Deal intent",
      value: dealIntentLabel(row) ?? "To be confirmed",
    },
    {
      label: "Status",
      value: niceLabel(row.status) ?? "To be confirmed",
    },
    {
      label: "Asset type",
      value: niceLabel(row.asset_type) ?? "To be confirmed",
    },
    {
      label: "Budget",
      value: formatBudgetRange(row.budget_min, row.budget_max) ?? "Open",
    },
    {
      label: "Focus market",
      value: formatMarketSummary(row, searchAreas) ?? "To be confirmed",
    },
  ];

  const buildingRange = formatSqmRange(row.building_area_min_sqm, row.building_area_max_sqm);
  const landRange = formatSqmRange(row.land_area_min_sqm, row.land_area_max_sqm);
  const zoning = zoningText(row);

  const hasAcquisitionProfileFields =
    dealIntentLabel(row) !== null ||
    niceLabel(row.asset_type) !== null ||
    niceLabel(row.status) !== null ||
    buildingRange !== null ||
    landRange !== null;

  const hasAcquisitionDetail =
    hasAcquisitionProfileFields || isMeaningfulString(row.intended_use);

  const hasLocationContent =
    isMeaningfulString(row.location) || searchAreas.length > 0;

  const hasFinancialContent = formatBudgetRange(row.budget_min, row.budget_max) !== null;

  const hasAdditionalContent =
    zoning !== null || isMeaningfulString(row.description);

  return (
    <main className="mx-auto max-w-3xl">
      <header className="border-b border-gray-200 pb-5">
        <Link
          href="/mandates"
          className="inline-flex text-xs font-medium text-gray-500 transition hover:text-gray-900"
        >
          ← Back to mandates
        </Link>

        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Acquisition profile
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 md:text-3xl">
              {displayTitle}
            </h1>
            <p className="text-xs text-gray-500">Added {formatDate(row.created_at)}</p>
          </div>

          <div className="flex flex-shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
            <Link
              href={`/mandates/new?id=${row.id}`}
              className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-2 text-center text-xs font-medium text-white transition hover:bg-gray-800"
            >
              Edit mandate
            </Link>
            <Link
              href="/mandates"
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-center text-xs font-medium text-gray-800 transition hover:bg-gray-50"
            >
              All mandates
            </Link>
          </div>
        </div>
      </header>

      <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {summaryItems.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-gray-200 bg-white px-3 py-3 shadow-sm"
          >
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
              {item.label}
            </p>
            <p className="mt-1 text-xs font-semibold leading-snug text-gray-900">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 space-y-4">
        {hasAcquisitionDetail ? (
          <SectionCard
            title="Acquisition criteria"
            description="How this mandate is positioned: intent, asset focus, and scale requirements."
          >
            {hasAcquisitionProfileFields ? (
              <div className="divide-y divide-gray-100 rounded-lg border border-gray-100 bg-gray-50/60 px-3 md:px-4">
                <FieldRow label="Deal intent" value={dealIntentLabel(row)} />
                <FieldRow label="Asset type" value={niceLabel(row.asset_type)} />
                <FieldRow label="Status" value={niceLabel(row.status)} />
                <FieldRow label="Building area" value={buildingRange} />
                <FieldRow label="Land area" value={landRange} />
              </div>
            ) : null}
            {isMeaningfulString(row.intended_use) ? (
              <div
                className={
                  hasAcquisitionProfileFields
                    ? "mt-4 rounded-lg border border-gray-100 bg-white p-3"
                    : "rounded-lg border border-gray-100 bg-white p-3"
                }
              >
                <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                  Intended use
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-snug text-gray-700">
                  {row.intended_use!.trim()}
                </p>
              </div>
            ) : null}
          </SectionCard>
        ) : (
          <SectionCard
            title="Acquisition criteria"
            description="How this mandate is positioned: intent, asset focus, and scale requirements."
          >
            <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50/80 px-4 py-4 text-xs leading-relaxed text-gray-600">
              No acquisition criteria captured yet. Edit the mandate to add intent, asset focus, and
              size requirements.
            </p>
          </SectionCard>
        )}

        {hasLocationContent ? (
          <SectionCard
            title="Location preferences"
            description="Geographic focus for origination and screening."
          >
            {isMeaningfulString(row.location) ? (
              <div className="rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                  Primary location
                </p>
                <p className="mt-1 text-sm font-medium text-gray-900">{row.location!.trim()}</p>
              </div>
            ) : null}

            {searchAreas.length > 0 ? (
              <div className={isMeaningfulString(row.location) ? "mt-4" : ""}>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-gray-500">
                  Search geography
                </p>
                <ul className="grid gap-2 md:grid-cols-2">
                  {searchAreas.map((area, index) => {
                    const heading =
                      [area.label, area.suburb].find(isMeaningfulString)?.trim() ||
                      `Area ${index + 1}`;

                    return (
                      <li
                        key={`${heading}-${index}`}
                        className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
                      >
                        <p className="text-sm font-semibold text-gray-900">{heading}</p>
                        <dl className="mt-2 space-y-1 text-xs text-gray-600">
                          {isMeaningfulString(area.state) ? (
                            <div className="flex gap-2">
                              <dt className="text-gray-500">State</dt>
                              <dd className="font-medium text-gray-800">{area.state}</dd>
                            </div>
                          ) : null}
                          {isMeaningfulString(area.suburb) && area.suburb !== area.label ? (
                            <div className="flex gap-2">
                              <dt className="text-gray-500">Suburb</dt>
                              <dd className="font-medium text-gray-800">{area.suburb}</dd>
                            </div>
                          ) : null}
                          {area.radius_km !== null &&
                          area.radius_km !== undefined &&
                          !Number.isNaN(area.radius_km) ? (
                            <div className="flex gap-2">
                              <dt className="text-gray-500">Radius</dt>
                              <dd className="font-medium text-gray-800">{area.radius_km} km</dd>
                            </div>
                          ) : null}
                          {area.lat !== null &&
                          area.lat !== undefined &&
                          area.lng !== null &&
                          area.lng !== undefined ? (
                            <div className="flex gap-2">
                              <dt className="text-gray-500">Coordinates</dt>
                              <dd className="font-medium text-gray-800">
                                {area.lat}, {area.lng}
                              </dd>
                            </div>
                          ) : null}
                        </dl>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </SectionCard>
        ) : (
          <SectionCard
            title="Location preferences"
            description="Geographic focus for origination and screening."
          >
            <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50/80 px-4 py-4 text-xs leading-relaxed text-gray-600">
              No location preferences specified yet.
            </p>
          </SectionCard>
        )}

        {hasFinancialContent ? (
          <SectionCard
            title="Financial parameters"
            description="Capital envelope for screening and introductions."
          >
            <div className="rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                Budget range
              </p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {formatBudgetRange(row.budget_min, row.budget_max)}
              </p>
            </div>
          </SectionCard>
        ) : null}

        {hasAdditionalContent ? (
          <SectionCard
            title="Additional requirements"
            description="Planning context and narrative detail for counterparties."
          >
            {zoning ? (
              <div className="rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                  Zoning / planning
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-snug text-gray-700">
                  {zoning}
                </p>
              </div>
            ) : null}

            {isMeaningfulString(row.description) ? (
              <div
                className={
                  zoning ? "mt-4 rounded-lg border border-gray-100 bg-white p-3" : "rounded-lg border border-gray-100 bg-white p-3"
                }
              >
                <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                  Description
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-snug text-gray-700">
                  {row.description!.trim()}
                </p>
              </div>
            ) : null}
          </SectionCard>
        ) : (
          <SectionCard
            title="Additional requirements"
            description="Planning context and narrative detail for counterparties."
          >
            <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50/80 px-4 py-4 text-xs leading-relaxed text-gray-600">
              No additional requirements provided yet.
            </p>
          </SectionCard>
        )}
      </div>
    </main>
  );
}
