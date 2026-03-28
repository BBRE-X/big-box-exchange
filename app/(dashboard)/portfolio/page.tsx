import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveCompanyRecord } from "@/lib/app-context";
import {
  computePortfolioMatches,
  type AssetForMatch,
  type MandateForMatch,
} from "@/lib/matching";
import { OpenDealRoomForm } from "./OpenDealRoomForm";

type AssetPreview = {
  id: string;
  title: string;
  asset_type: string;
  suburb: string | null;
  state: string | null;
  is_public: boolean;
};

type MandatePreview = {
  id: string;
  title: string;
  asset_type: string | null;
  status: string | null;
  location: string | null;
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

function niceMandateStatus(value: string | null) {
  if (!value?.trim()) return "—";
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Display only — mirrors v1 weights (40 + 35 + 15). */
const MATCH_SCORE_MAX = 90;

function matchScorePercent(score: number): number {
  return Math.min(100, Math.round((score / MATCH_SCORE_MAX) * 100));
}

type MatchStrength = "strong" | "medium" | "light";

function matchStrength(score: number): MatchStrength {
  if (score >= 65) return "strong";
  if (score >= 35) return "medium";
  return "light";
}

function matchStrengthLabel(s: MatchStrength): string {
  if (s === "strong") return "Strong";
  if (s === "medium") return "Medium";
  return "Light";
}

function displayMatchReason(reason: string): string {
  switch (reason) {
    case "Type match":
      return "Asset type match";
    case "Suburb match":
      return "Suburb match · Location aligned";
    case "State match":
      return "State aligned";
    default:
      return reason;
  }
}

const MATCHES_LIMIT = 12;

export default async function PortfolioPage() {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const companyRecord = await getActiveCompanyRecord(user.id);

  if (!companyRecord) {
    return (
      <main className="mx-auto max-w-6xl">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Portfolio</h1>
        <p className="mt-1 text-sm leading-snug text-gray-600">
          Combined view of your company&apos;s assets and acquisition mandates.
        </p>
        <div className="mt-6 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
          <p className="text-sm font-medium text-gray-800">No active company</p>
          <p className="mt-1 text-xs text-gray-600">
            Select or create a company to see your portfolio overview.
          </p>
          <Link
            href="/companies"
            className="mt-4 inline-flex rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
          >
            Manage companies
          </Link>
        </div>
      </main>
    );
  }

  const activeCompanyId = companyRecord.id;

  const [
    assetsCountRes,
    publicAssetsCountRes,
    mandatesCountRes,
    activeMandatesCountRes,
    assetsPreviewRes,
    mandatesPreviewRes,
    assetsForMatchRes,
    mandatesForMatchRes,
  ] = await Promise.all([
    supabase
      .from("assets")
      .select("id", { count: "exact", head: true })
      .eq("company_id", activeCompanyId),
    supabase
      .from("assets")
      .select("id", { count: "exact", head: true })
      .eq("company_id", activeCompanyId)
      .eq("is_public", true),
    supabase
      .from("mandates")
      .select("id", { count: "exact", head: true })
      .eq("company_id", activeCompanyId),
    supabase
      .from("mandates")
      .select("id", { count: "exact", head: true })
      .eq("company_id", activeCompanyId)
      .eq("status", "active"),
    supabase
      .from("assets")
      .select("id, title, asset_type, suburb, state, is_public")
      .eq("company_id", activeCompanyId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("mandates")
      .select("id, title, asset_type, status, location")
      .eq("company_id", activeCompanyId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("assets")
      .select("id, title, asset_type, suburb, state")
      .eq("company_id", activeCompanyId)
      .order("created_at", { ascending: false }),
    supabase
      .from("mandates")
      .select("id, title, asset_type, location")
      .eq("company_id", activeCompanyId)
      .order("created_at", { ascending: false }),
  ]);

  const totalAssets = assetsCountRes.count ?? 0;
  const publicAssets = publicAssetsCountRes.count ?? 0;
  const totalMandates = mandatesCountRes.count ?? 0;
  const activeMandates = activeMandatesCountRes.count ?? 0;

  const assetRows = (assetsPreviewRes.data ?? []) as AssetPreview[];
  const mandateRows = (mandatesPreviewRes.data ?? []) as MandatePreview[];

  const assetsForMatch = (assetsForMatchRes.data ?? []) as AssetForMatch[];
  const mandatesForMatch = (mandatesForMatchRes.data ?? []) as MandateForMatch[];
  const matches = computePortfolioMatches(assetsForMatch, mandatesForMatch, MATCHES_LIMIT);

  const companyName = companyRecord.name;
  const logoUrl = companyRecord.logo_url;
  const initial = companyName.trim().charAt(0).toUpperCase() || "?";

  return (
    <main className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Portfolio</h1>
          <p className="mt-1 max-w-xl text-sm leading-snug text-gray-600">
            Command overview of your active company&apos;s listed opportunities and live acquisition
            mandates.
          </p>
        </div>
      </div>

      <section className="mt-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- company logo from storage
              <img
                src={logoUrl}
                alt=""
                className="h-10 w-10 shrink-0 rounded-lg object-cover"
              />
            ) : (
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-900 text-sm font-semibold text-white"
                aria-hidden
              >
                {initial}
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-gray-900">{companyName}</h2>
              <p className="text-[11px] text-gray-500">
                {totalAssets} assets · {totalMandates} mandates
              </p>
            </div>
          </div>
          <Link
            href="/companies"
            className="shrink-0 text-xs font-medium text-gray-700 underline-offset-2 hover:underline"
          >
            Switch company
          </Link>
        </div>
      </section>

      <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Overview stats">
        <div className="rounded-xl border border-gray-200 bg-white px-3 py-3 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Total assets</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-gray-900">{totalAssets}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white px-3 py-3 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
            Total mandates
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-gray-900">{totalMandates}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white px-3 py-3 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
            Public assets
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-gray-900">{publicAssets}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white px-3 py-3 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
            Active mandates
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-gray-900">{activeMandates}</p>
        </div>
      </section>

      <section
        className="mt-5 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
        aria-label="Matches"
      >
        <header className="border-b border-gray-100 bg-gradient-to-b from-gray-50/80 to-white px-3 py-2.5 sm:px-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
                <h3 className="text-sm font-semibold tracking-tight text-gray-900">Matches</h3>
                {matches.length > 0 ? (
                  <span className="text-[10px] font-medium tabular-nums text-gray-400">
                    Top {matches.length}
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 max-w-2xl text-[11px] leading-snug text-gray-500">
                Highest-confidence matches between your current assets and active mandates.
              </p>
            </div>
          </div>
        </header>
        {matches.length === 0 ? (
          <div className="px-3 py-6 text-center sm:px-4 sm:py-7">
            <p className="text-xs font-semibold tracking-tight text-gray-800">
              No strong matches identified yet.
            </p>
            <p className="mx-auto mt-1.5 max-w-sm text-[11px] leading-relaxed text-gray-500">
              Add or refine assets and mandates so types and locations line up — matches appear here
              automatically.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {matches.map((m) => {
              const strength = matchStrength(m.score);
              const pct = matchScorePercent(m.score);
              const barClass =
                strength === "strong"
                  ? "bg-gray-900"
                  : strength === "medium"
                    ? "bg-gray-600"
                    : "bg-gray-400";
              const badgeClass =
                strength === "strong"
                  ? "border-gray-900 bg-gray-900 text-white"
                  : strength === "medium"
                    ? "border-gray-300 bg-white text-gray-900"
                    : "border-gray-200 bg-gray-50 text-gray-700";
              const rowKey = `${m.assetId}-${m.mandateId}`;
              const priorityId = `match-priority-${rowKey.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
              return (
                <li
                  key={rowKey}
                  className="transition-colors has-[:checked]:bg-amber-50/45"
                >
                  <div className="grid grid-cols-1 gap-2.5 px-3 py-2 sm:grid-cols-[minmax(0,1fr)_7.5rem_auto] sm:items-center sm:gap-3 sm:px-4 sm:py-2">
                    <div className="min-w-0 space-y-1">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-gray-400">
                        Asset → Mandate
                      </p>
                      <div className="space-y-0.5">
                        <Link
                          href={`/assets/${m.assetId}`}
                          className="block truncate text-sm font-semibold leading-tight text-gray-900 decoration-gray-300 underline-offset-2 hover:underline"
                        >
                          {m.assetTitle}
                        </Link>
                        <div className="flex items-center gap-1.5 pl-0.5">
                          <span className="text-[10px] font-medium text-gray-300" aria-hidden>
                            →
                          </span>
                          <Link
                            href={`/mandates/${m.mandateId}`}
                            className="min-w-0 flex-1 truncate text-sm font-medium leading-tight text-gray-700 decoration-gray-300 underline-offset-2 hover:underline"
                          >
                            {m.mandateTitle}
                          </Link>
                        </div>
                      </div>
                      <p className="text-[10px] leading-snug text-gray-500">
                        {m.reasons.map(displayMatchReason).join(" · ")}
                      </p>
                    </div>

                    <div className="flex w-full flex-col justify-center gap-1 sm:w-[7.5rem]">
                      <div
                        className={`inline-flex w-max max-w-full items-center gap-1 rounded-full border px-2 py-0.5 shadow-sm ${badgeClass}`}
                      >
                        <span className="text-[11px] font-bold tabular-nums">{m.score}</span>
                        <span className="text-[9px] font-medium opacity-80" aria-hidden>
                          ·
                        </span>
                        <span className="text-[9px] font-semibold tracking-tight opacity-90">
                          {matchStrengthLabel(strength)}
                        </span>
                      </div>
                      <div className="w-full">
                        <div className="h-0.5 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className={`h-full rounded-full ${barClass}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="mt-0.5 text-[9px] tabular-nums text-gray-400">
                          Match strength · {pct}%
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-stretch justify-center gap-1 sm:items-end">
                      <input
                        type="checkbox"
                        id={priorityId}
                        className="peer sr-only"
                        aria-label="Mark as priority match"
                      />
                      <OpenDealRoomForm assetId={m.assetId} mandateId={m.mandateId} />
                      <label
                        htmlFor={priorityId}
                        className="cursor-pointer rounded-md border border-gray-200 bg-white px-2.5 py-1 text-center text-[11px] font-medium text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 peer-checked:hidden"
                      >
                        Mark priority
                      </label>
                      <label
                        htmlFor={priorityId}
                        className="hidden cursor-pointer rounded-md border border-amber-200/80 bg-amber-100/50 px-2.5 py-1 text-center text-[11px] font-semibold text-amber-900 shadow-sm peer-checked:inline-block"
                      >
                        Priority ✓
                      </label>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-900">Recent assets</h3>
            <Link
              href="/assets"
              className="text-xs font-medium text-gray-700 hover:text-gray-900"
            >
              View all assets
            </Link>
          </div>
          <ul className="divide-y divide-gray-100">
            {assetRows.length === 0 ? (
              <li className="px-4 py-6 text-center text-xs text-gray-500">No assets yet.</li>
            ) : (
              assetRows.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/assets/${a.id}`}
                    className="block px-4 py-2.5 transition hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 truncate text-sm font-medium text-gray-900">{a.title}</p>
                      {a.is_public ? (
                        <span className="shrink-0 rounded-md bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-800">
                          Public
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-700">
                          Private
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-gray-500">
                      {labelAssetType(a.asset_type)}
                      {a.suburb || a.state
                        ? ` · ${[a.suburb, a.state].filter(Boolean).join(", ")}`
                        : ""}
                    </p>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-900">Recent mandates</h3>
            <Link
              href="/mandates"
              className="text-xs font-medium text-gray-700 hover:text-gray-900"
            >
              View all mandates
            </Link>
          </div>
          <ul className="divide-y divide-gray-100">
            {mandateRows.length === 0 ? (
              <li className="px-4 py-6 text-center text-xs text-gray-500">No mandates yet.</li>
            ) : (
              mandateRows.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/mandates/${m.id}`}
                    className="block px-4 py-2.5 transition hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 truncate text-sm font-medium text-gray-900">{m.title}</p>
                      <span className="shrink-0 rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-700">
                        {niceMandateStatus(m.status)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-gray-500">
                      {[m.asset_type, m.location].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      <section className="mt-6 rounded-xl border border-dashed border-gray-200 bg-gray-50/80 px-4 py-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Future modules
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-gray-500">
          Coming later: portfolio analytics and market intelligence — wired into this overview as the
          platform grows.
        </p>
        <ul className="mt-3 grid gap-2 text-[11px] text-gray-600 sm:grid-cols-2 lg:grid-cols-3">
          <li className="rounded-lg bg-white/80 px-2.5 py-2 ring-1 ring-gray-100">
            Portfolio analytics
          </li>
          <li className="rounded-lg bg-white/80 px-2.5 py-2 ring-1 ring-gray-100">
            Market intelligence
          </li>
        </ul>
      </section>
    </main>
  );
}
