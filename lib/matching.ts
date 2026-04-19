/**
 * Portfolio v1 matching: deterministic scoring using asset vs mandate fields
 * already available in the app (no new schema).
 */

export type AssetForMatch = {
  id: string;
  title: string;
  asset_type: string;
  suburb: string | null;
  state: string | null;
};

export type MandateForMatch = {
  id: string;
  title: string;
  asset_type: string | null;
  location: string | null;
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

function suburbWeakOverlap(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  return a.toLowerCase().includes(b.toLowerCase()) || b.toLowerCase().includes(a.toLowerCase());
}

export function scoreAssetMandatePair(
  asset: AssetForMatch,
  mandate: MandateForMatch
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  if (typeMatches(asset.asset_type, mandate.asset_type)) {
    score += WEIGHT_TYPE;
    reasons.push("Type match");
  }

  if (suburbExactMatch(asset.suburb, mandate.location)) {
    score += WEIGHT_SUBURB;
    reasons.push("Suburb match");
  }

  if (stateMatches(asset.state, mandate.location)) {
    score += WEIGHT_STATE;
    reasons.push("State match");
  }

  return { score, reasons };
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
