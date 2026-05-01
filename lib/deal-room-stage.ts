export const DEAL_ROOM_STAGES = [
  "lead",
  "qualified",
  "under_review",
  "negotiation",
  "under_contract",
  "closed",
] as const;

export type DealRoomStage = (typeof DEAL_ROOM_STAGES)[number];

const STAGE_LABELS: Record<DealRoomStage, string> = {
  lead: "Initiated",
  qualified: "Qualified",
  under_review: "Under review",
  negotiation: "Negotiation",
  under_contract: "Under contract",
  closed: "Closed",
};

/** Tailwind classes for a high-contrast stage pill on white cards. */
const STAGE_BADGE_CLASSES: Record<DealRoomStage, string> = {
  lead: "bg-slate-100 text-slate-800 ring-1 ring-inset ring-slate-200/80",
  qualified: "bg-sky-50 text-sky-950 ring-1 ring-inset ring-sky-200/90",
  under_review: "bg-indigo-50 text-indigo-950 ring-1 ring-inset ring-indigo-200/90",
  negotiation: "bg-amber-50 text-amber-950 ring-1 ring-inset ring-amber-200/90",
  under_contract: "bg-emerald-50 text-emerald-950 ring-1 ring-inset ring-emerald-200/90",
  closed: "bg-zinc-100 text-zinc-800 ring-1 ring-inset ring-zinc-300/80",
};

export function isDealRoomStage(value: string): value is DealRoomStage {
  return (DEAL_ROOM_STAGES as readonly string[]).includes(value);
}

export function normalizeDealRoomStage(value: string | null | undefined): DealRoomStage {
  if (value && isDealRoomStage(value)) {
    return value;
  }
  return "lead";
}

export function labelDealRoomStage(stage: string | null | undefined): string {
  return STAGE_LABELS[normalizeDealRoomStage(stage)];
}

export function dealStageBadgeClass(stage: string | null | undefined): string {
  return STAGE_BADGE_CLASSES[normalizeDealRoomStage(stage)];
}
