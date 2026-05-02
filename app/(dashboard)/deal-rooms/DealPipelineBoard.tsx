import Link from "next/link";
import {
  DEAL_ROOM_STAGES,
  type DealRoomStage,
  labelDealRoomStage,
  dealStageBadgeClass,
  normalizeDealRoomStage,
} from "@/lib/deal-room-stage";

export type PipelineDeal = {
  id: string;
  deal_room_id: string;
  title: string;
  stage: string;
  updated_at: string;
  assetTitle: string | null;
  mandateTitle: string | null;
};

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function DealCard({ deal }: { deal: PipelineDeal }) {
  const subtitle = [deal.assetTitle, deal.mandateTitle].filter(Boolean).join(" · ");
  const stage = normalizeDealRoomStage(deal.stage);

  return (
    <article className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold leading-snug text-gray-900">{deal.title}</p>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${dealStageBadgeClass(stage)}`}
        >
          {labelDealRoomStage(stage)}
        </span>
      </div>

      {subtitle ? (
        <p className="line-clamp-1 text-[11px] leading-snug text-gray-500">{subtitle}</p>
      ) : null}

      <div className="flex items-center justify-between gap-2 border-t border-gray-100 pt-2">
        <p className="text-[10px] text-gray-400">Updated {formatUpdatedAt(deal.updated_at)}</p>
        <Link
          href={`/deal-rooms/${deal.deal_room_id}/deals/${deal.id}`}
          className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-[10px] font-semibold text-gray-800 shadow-sm transition hover:border-gray-400 hover:bg-gray-50"
        >
          View deal
        </Link>
      </div>
    </article>
  );
}

function StageColumn({
  stage,
  deals,
}: {
  stage: DealRoomStage;
  deals: PipelineDeal[];
}) {
  return (
    <div className="flex w-64 shrink-0 flex-col">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-xs font-semibold text-gray-700">{labelDealRoomStage(stage)}</h2>
        <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-gray-500">
          {deals.length}
        </span>
      </div>
      <div className="flex flex-col gap-2.5">
        {deals.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 px-3 py-4 text-center">
            <p className="text-[11px] text-gray-400">No deals</p>
          </div>
        ) : (
          deals.map((deal) => <DealCard key={deal.id} deal={deal} />)
        )}
      </div>
    </div>
  );
}

export function DealPipelineBoard({ deals }: { deals: PipelineDeal[] }) {
  const byStage = Object.fromEntries(
    DEAL_ROOM_STAGES.map((stage) => [
      stage,
      deals.filter((d) => normalizeDealRoomStage(d.stage) === stage),
    ])
  ) as Record<DealRoomStage, PipelineDeal[]>;

  return (
    <div className="mt-6">
      {deals.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/80 px-4 py-8 text-center">
          <p className="text-sm font-medium text-gray-800">No deals in pipeline yet</p>
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-gray-600">
            Initiate a discussion from a matched asset on the Portfolio page to create your first
            deal.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4" style={{ minWidth: "max-content" }}>
            {DEAL_ROOM_STAGES.map((stage) => (
              <StageColumn key={stage} stage={stage} deals={byStage[stage]} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
