export const DEAL_SOURCES = ["manual", "match", "mandate_response"] as const;

export type DealSource = (typeof DEAL_SOURCES)[number];

export function isDealSource(value: string): value is DealSource {
  return (DEAL_SOURCES as readonly string[]).includes(value);
}

export function normalizeDealSource(value: string | null | undefined): DealSource {
  if (value && isDealSource(value)) {
    return value;
  }
  return "manual";
}

export function labelDealSource(source: string | null | undefined): string {
  const s = normalizeDealSource(source);
  const labels: Record<DealSource, string> = {
    manual: "Existing opportunity",
    match: "Matched deal",
    mandate_response: "Mandate opportunity",
  };
  return labels[s];
}
