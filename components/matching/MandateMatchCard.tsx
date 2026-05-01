"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { matchStrength, MATCH_SCORE_MAX } from "@/lib/matching";
import { createDealRoomFromPortfolio } from "@/app/(dashboard)/portfolio/actions";

export type MatchedAsset = {
  id: string;
  title: string;
  asset_type: string;
  suburb: string | null;
  state: string | null;
  country: string | null;
  price_min: number | null;
  price_max: number | null;
  price_display: string | null;
  building_area_sqm: number | null;
  land_area_sqm: number | null;
  is_public: boolean;
};

type Props = {
  mandateId: string;
  asset: MatchedAsset;
  score: number;
  reasons: string[];
};


function displayReason(reason: string): string {
  switch (reason) {
    case "Type match":     return "Asset type match";
    case "Suburb match":   return "Suburb match";
    case "State match":    return "State aligned";
    case "Budget overlap": return "Budget aligned";
    case "Size match":     return "Building area match";
    default:               return reason;
  }
}

function formatAUD(value: number): string {
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
): string {
  if (display?.trim()) return display.trim();
  if (min !== null && max !== null) return `${formatAUD(min)} – ${formatAUD(max)}`;
  if (min !== null) return `From ${formatAUD(min)}`;
  if (max !== null) return `Up to ${formatAUD(max)}`;
  return "Price on application";
}

function labelAssetType(value: string): string {
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

export function MandateMatchCard({ mandateId, asset, score, reasons }: Props) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);
  const [dealPending, setDealPending] = useState(false);
  const [dealError, setDealError] = useState<string | null>(null);

  if (dismissed) return null;

  const strength = matchStrength(score);
  const pct = Math.min(100, Math.round((score / MATCH_SCORE_MAX) * 100));
  const strengthLabel =
    strength === "strong" ? "Strong" : strength === "medium" ? "Medium" : "Light";

  const badgeClass =
    strength === "strong"
      ? "border-gray-900 bg-gray-900 text-white"
      : strength === "medium"
        ? "border-gray-300 bg-white text-gray-900"
        : "border-gray-200 bg-gray-50 text-gray-700";

  const barClass =
    strength === "strong" ? "bg-gray-900"
      : strength === "medium" ? "bg-gray-600"
        : "bg-gray-400";

  const location =
    [asset.suburb, asset.state, asset.country].filter(Boolean).join(", ") || "—";

  async function handleOpenDealRoom() {
    setDealError(null);
    setDealPending(true);
    try {
      const fd = new FormData();
      fd.set("assetId", asset.id);
      fd.set("mandateId", mandateId);
      const result = await createDealRoomFromPortfolio(fd);
      if (result.ok) {
        router.push(`/deal-rooms/${result.dealRoomId}`);
      } else {
        setDealError(result.error);
      }
    } catch {
      setDealError("Something went wrong. Try again.");
    } finally {
      setDealPending(false);
    }
  }

  return (
    <article
      id={`match-${asset.id}`}
      className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
    >
      {/* Title row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-gray-400">
            Matched asset
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold leading-snug text-gray-900">
            {asset.title}
          </p>
          <p className="mt-0.5 text-[11px] text-gray-500">{location}</p>
        </div>

        {/* Score badge + strength bar */}
        <div className="flex shrink-0 flex-col items-end gap-1">
          <div
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 shadow-sm ${badgeClass}`}
          >
            <span className="text-[11px] font-bold tabular-nums">{score}</span>
            <span className="text-[9px] font-medium opacity-70" aria-hidden>·</span>
            <span className="text-[9px] font-semibold tracking-tight opacity-90">
              {strengthLabel}
            </span>
          </div>
          <div className="w-20">
            <div className="h-0.5 overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full ${barClass}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-0.5 text-right text-[9px] tabular-nums text-gray-400">{pct}%</p>
          </div>
        </div>
      </div>

      {/* Key asset fields */}
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-gray-100 pt-3 sm:grid-cols-4">
        <div>
          <dt className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Type</dt>
          <dd className="mt-0.5 text-xs font-medium text-gray-900">
            {labelAssetType(asset.asset_type)}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Price</dt>
          <dd className="mt-0.5 text-xs font-medium text-gray-900">
            {formatPrice(asset.price_min, asset.price_max, asset.price_display)}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Building</dt>
          <dd className="mt-0.5 text-xs font-medium text-gray-900">
            {asset.building_area_sqm !== null ? `${asset.building_area_sqm} sqm` : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Visibility</dt>
          <dd className="mt-0.5 text-xs font-medium text-gray-900">
            {asset.is_public ? "Public" : "Private"}
          </dd>
        </div>
      </dl>

      {/* Match signals */}
      <p className="mt-3 text-[10px] leading-snug text-gray-500">
        {reasons.map(displayReason).join(" · ")}
      </p>

      {/* Actions */}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
        <Link
          href={`/assets/${asset.id}`}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-[11px] font-medium text-gray-800 shadow-sm transition hover:bg-gray-50"
        >
          View asset
        </Link>

        <button
          type="button"
          onClick={handleOpenDealRoom}
          disabled={dealPending}
          className="rounded-md bg-gray-900 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-gray-800 disabled:opacity-60"
        >
          {dealPending ? "Opening…" : "Initiate discussion"}
        </button>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="ml-auto rounded-md border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-medium text-gray-500 shadow-sm transition hover:border-gray-300 hover:text-gray-700"
        >
          Dismiss
        </button>
      </div>

      {dealError ? (
        <p className="mt-1.5 text-[10px] text-red-600" role="alert">{dealError}</p>
      ) : null}
    </article>
  );
}
