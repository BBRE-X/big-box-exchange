import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveCompanyRecord } from "@/lib/app-context";
import {
  dealStageBadgeClass,
  labelDealRoomStage,
  normalizeDealRoomStage,
} from "@/lib/deal-room-stage";

type DealRow = {
  id: string;
  deal_room_id: string;
  company_id: string;
  title: string;
  summary: string | null;
  stage: string;
  updated_at: string;
};

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getStageCount(deals: DealRow[], stageToMatch: string) {
  return deals.filter(
    (deal) => normalizeDealRoomStage(deal.stage) === stageToMatch
  ).length;
}

export default async function DealRoomsPage() {
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

  const { data, error } = await supabase
    .from("deals")
    .select("id, deal_room_id, company_id, title, summary, stage, updated_at")
    .eq("company_id", companyId)
    .order("updated_at", { ascending: false });

  if (error) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4">
          <h1 className="text-base font-semibold text-red-900">
            Unable to load deal rooms
          </h1>
          <p className="mt-1 text-sm text-red-700">
            There was a problem loading your active deals for {companyRecord.name}.
          </p>
          <p className="mt-2 text-xs text-red-600">{error.message}</p>
        </div>
      </div>
    );
  }

  const deals: DealRow[] = data ? (data as DealRow[]) : [];

  const leadCount = getStageCount(deals, "lead");
  const qualifiedCount = getStageCount(deals, "qualified");
  const underReviewCount = getStageCount(deals, "under_review");
  const negotiationCount = getStageCount(deals, "negotiation");
  const underContractCount = getStageCount(deals, "under_contract");
  const closedCount = getStageCount(deals, "closed");

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
            Workspace
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-gray-900">
            Deal Rooms
          </h1>
          <p className="mt-1 max-w-3xl text-sm leading-snug text-gray-600">
            <span className="font-medium text-gray-800">
              Summary workspace for active deals
            </span>{" "}
            across {companyRecord.name}. View all current pipeline activity at a
            glance, including matched deals, mandate opportunities, and manually
            added existing opportunities.
          </p>
        </div>
      </div>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Total active
          </p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{deals.length}</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Lead
          </p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{leadCount}</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Qualified
          </p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{qualifiedCount}</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Under review
          </p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{underReviewCount}</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Negotiation
          </p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{negotiationCount}</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Under contract
          </p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{underContractCount}</p>
          <p className="mt-1 text-[11px] text-gray-500">Closed: {closedCount}</p>
        </div>
      </section>

      <section className="mt-8" aria-label="Active deals">
        <div className="border-b border-gray-200 pb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Active deals
          </h2>
          <p className="mt-0.5 text-xs leading-snug text-gray-500">
            Every card represents a current deal in the pipeline.
          </p>
        </div>

        {deals.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-gray-200 bg-gray-50/80 px-4 py-8 text-center">
            <p className="text-sm font-medium text-gray-800">No active deals yet</p>
            <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-gray-600">
              When a listing matches a mandate, or when a manual deal is added,
              it will appear here as part of your active pipeline overview.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/assets"
                className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 shadow-sm transition hover:bg-gray-50"
              >
                Browse assets
              </Link>
              <Link
                href="/mandates"
                className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 shadow-sm transition hover:bg-gray-50"
              >
                Browse mandates
              </Link>
            </div>
          </div>
        ) : (
          <ul className="mt-4 grid list-none gap-4 p-0 sm:grid-cols-2 xl:grid-cols-3">
            {deals.map((deal) => {
              const stage = normalizeDealRoomStage(deal.stage);

              return (
                <li key={deal.id}>
                  <article className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm ring-1 ring-black/[0.02] transition-shadow hover:shadow-md">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-semibold leading-snug text-gray-900">
                          {deal.title}
                        </h3>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="inline-flex rounded-md bg-gray-50 px-2 py-0.5 text-[10px] font-medium tracking-wide text-gray-600 ring-1 ring-gray-200/90">
                            Active deal
                          </span>
                        </div>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${dealStageBadgeClass(
                          stage
                        )}`}
                      >
                        {labelDealRoomStage(stage)}
                      </span>
                    </div>

                    <p className="mt-3 line-clamp-3 flex-1 text-xs leading-relaxed text-gray-600">
                      {deal.summary?.trim() ? deal.summary.trim() : "No summary yet."}
                    </p>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3">
                      <p className="text-[11px] text-gray-500">
                        <span className="font-medium text-gray-600">Updated</span>{" "}
                        {formatUpdatedAt(deal.updated_at)}
                      </p>

                      <div className="flex items-center gap-2">
                        <Link
                          href={`/deal-rooms/${deal.deal_room_id}`}
                          className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-900 shadow-sm transition hover:border-gray-400 hover:bg-gray-50"
                        >
                          View room
                        </Link>
                        <Link
                          href={`/deal-rooms/${deal.deal_room_id}/deals/${deal.id}`}
                          className="inline-flex items-center rounded-lg border border-gray-900 bg-gray-900 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-gray-800"
                        >
                          View deal
                        </Link>
                      </div>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-6 rounded-xl border border-dashed border-gray-200 bg-gray-50/80 px-4 py-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Workspace
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-gray-600">
          This page is your company-level pipeline overview. Open a deal room to view
          the linked asset and mandate context, or open an individual deal record to
          manage execution at the deal level.
        </p>
      </section>
    </div>
  );
}