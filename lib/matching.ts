/**
 * Portfolio matching — deterministic scoring using asset vs mandate fields
 * already available in the app (no schema changes).
 *
 * v1 signals: asset_type · suburb · state  (max 90)
 * v2 signals: + price/budget overlap · building area range  (max 135)
 *             + search_areas JSONB fallback for geo when location text is empty
 */

export type AssetForMatch = {
  id: string;
  title: string;
  asset_type: string;
  suburb: string | null;
  state: string | null;
  price_min: number | null;
  price_max: number | null;
  building_area_sqm: number | null;
};

export type MandateSearchArea = {
  label?: string | null;
  suburb?: string | null;
  state?: string | null;
  radius_km?: number | null;
  lat?: number | null;
  lng?: number | null;
};

export type MandateForMatch = {
  id: string;
  title: string;
  asset_type: string | null;
  location: string | null;
  budget_min: number | null;
  budget_max: number | null;
  building_area_min_sqm: number | null;
  building_area_max_sqm: number | null;
  search_areas: MandateSearchArea[] | null;
};

export type MatchResultV1 = {
  assetId: string;
  assetTitle: string;
  mandateId: string;
  mandateTitle: string;
  score: number;
  reasons: string[];
};

const WEIGHT_TYPE = 40;
const WEIGHT_SUBURB = 35;
const WEIGHT_STATE = 15;
const WEIGHT_PRICE = 25;
const WEIGHT_BUILDING = 20;

/** Maximum score returned to callers. Raw signal weights sum to 135; capped at 100. */
export const MATCH_SCORE_MAX = 100;

export type MatchStrength = "strong" | "medium" | "light";

/** strong ≥ 75 · medium ≥ 40 · light < 40 */
export function matchStrength(score: number): MatchStrength {
  if (score >= 75) return "strong";
  if (score >= 40) return "medium";
  return "light";
}

function norm(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

function normAssetType(s: string | null | undefined): string {
  return norm(s).replace(/\s+/g, "_").replace(/-/g, "_");
}

function locationTokens(location: string): string[] {
  return location
    .split(/[,·;|/]/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

function typeMatches(assetType: string, mandateType: string | null): boolean {
  const a = normAssetType(assetType);
  const m = normAssetType(mandateType);
  if (!a || !m) return false;
  return a === m;
}

/** Suburb considered exact if it equals the full location or a comma-separated token. */
function suburbExactMatch(assetSuburb: string | null, mandateLocation: string | null): boolean {
  const sub = norm(assetSuburb);
  const loc = norm(mandateLocation);
  if (!sub || !loc) return false;
  if (loc === sub) return true;
  return locationTokens(mandateLocation ?? "").some((t) => t === sub);
}

function stateMatches(assetState: string | null, mandateLocation: string | null): boolean {
  const st = norm(assetState);
  const loc = norm(mandateLocation);
  if (!st || !loc) return false;
  if (loc.includes(st)) return true;
  const words = loc.split(/[\s,.-]+/).filter(Boolean);
  return words.some((w) => w === st);
}

/**
 * Suburb match against structured search_areas JSONB.
 * Used when mandate.location is empty (new mandate form saves to search_areas only).
 */
function suburbInSearchAreas(
  assetSuburb: string | null,
  areas: MandateSearchArea[] | null
): boolean {
  const sub = norm(assetSuburb);
  if (!sub || !areas?.length) return false;
  return areas.some((area) => norm(area.suburb) === sub);
}

/**
 * State match against structured search_areas JSONB.
 * Used when mandate.location is empty (new mandate form saves to search_areas only).
 */
function stateInSearchAreas(
  assetState: string | null,
  areas: MandateSearchArea[] | null
): boolean {
  const st = norm(assetState);
  if (!st || !areas?.length) return false;
  return areas.some((area) => {
    const aState = norm(area.state);
    if (!aState) return false;
    return aState === st || aState.includes(st);
  });
}

/**
 * Returns true when the asset's price range overlaps the mandate's budget range.
 * Null bounds are open-ended. Requires at least one finite bound on each side.
 */
function priceInBudget(
  assetPriceMin: number | null,
  assetPriceMax: number | null,
  budgetMin: number | null,
  budgetMax: number | null
): boolean {
  if (
    (assetPriceMin === null && assetPriceMax === null) ||
    (budgetMin === null && budgetMax === null)
  ) {
    return false;
  }

  const aLow = assetPriceMin ?? 0;
  const aHigh = assetPriceMax ?? Infinity;
  const bLow = budgetMin ?? 0;
  const bHigh = budgetMax ?? Infinity;

  return aHigh >= bLow && aLow <= bHigh;
}

/**
 * Returns true when the asset's building area falls within the mandate's required range.
 * Requires a real asset area and at least one mandate bound.
 */
function buildingAreaInRange(
  assetSqm: number | null,
  mandateMin: number | null,
  mandateMax: number | null
): boolean {
  if (assetSqm === null || (mandateMin === null && mandateMax === null)) return false;
  if (mandateMin !== null && assetSqm < mandateMin) return false;
  if (mandateMax !== null && assetSqm > mandateMax) return false;
  return true;
}

export function scoreAssetMandatePair(
  asset: AssetForMatch,
  mandate: MandateForMatch
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // Asset type (40 pts)
  if (typeMatches(asset.asset_type, mandate.asset_type)) {
    score += WEIGHT_TYPE;
    reasons.push("Type match");
  }

  // Suburb geo (35 pts) — location text first, fall back to search_areas JSONB
  const suburbMatched =
    suburbExactMatch(asset.suburb, mandate.location) ||
    suburbInSearchAreas(asset.suburb, mandate.search_areas);
  if (suburbMatched) {
    score += WEIGHT_SUBURB;
    reasons.push("Suburb match");
  }

  // State geo (15 pts) — location text first, fall back to search_areas JSONB
  const stateMatched =
    stateMatches(asset.state, mandate.location) ||
    stateInSearchAreas(asset.state, mandate.search_areas);
  if (stateMatched) {
    score += WEIGHT_STATE;
    reasons.push("State match");
  }

  // Price / budget overlap (25 pts)
  if (priceInBudget(asset.price_min, asset.price_max, mandate.budget_min, mandate.budget_max)) {
    score += WEIGHT_PRICE;
    reasons.push("Budget overlap");
  }

  // Building area in mandate range (20 pts)
  if (
    buildingAreaInRange(
      asset.building_area_sqm,
      mandate.building_area_min_sqm,
      mandate.building_area_max_sqm
    )
  ) {
    score += WEIGHT_BUILDING;
    reasons.push("Size match");
  }

  return { score: Math.min(score, 100), reasons };
}

export function computePortfolioMatches(
  assets: AssetForMatch[],
  mandates: MandateForMatch[],
  maxResults: number
): MatchResultV1[] {
  const out: MatchResultV1[] = [];

  for (const asset of assets) {
    for (const mandate of mandates) {
      const { score, reasons } = scoreAssetMandatePair(asset, mandate);
      if (score <= 0) continue;

      out.push({
        assetId: asset.id,
        assetTitle: asset.title,
        mandateId: mandate.id,
        mandateTitle: mandate.title,
        score,
        reasons,
      });
    }
  }

  out.sort((a, b) => b.score - a.score);
  return out.slice(0, maxResults);
}
