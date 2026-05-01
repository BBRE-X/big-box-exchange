import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveCompanyRecord } from "@/lib/app-context";

import { AddDealForm } from "@/app/(dashboard)/deal-rooms/AddDealForm";
import {
  dealStageBadgeClass,
  labelDealRoomStage,
  normalizeDealRoomStage,
} from "@/lib/deal-room-stage";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type PageProps = {
  params: Promise<{ id: string }>;
};

type DealRow = {
  id: string;
  title: string;
  summary: string | null;
  stage: string;
  updated_at: string;
};

function formatRoomDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function DealRoomDetailPage({ params }: PageProps) {
  const { id: dealRoomId } = await params;

  if (!UUID_RE.test(dealRoomId)) {
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

  const { data: room, error: roomError } = await supabase
    .from("deal_rooms")
    .select("id, company_id, created_at")
    .eq("id", dealRoomId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (roomError || !room) {
    notFound();
  }

  const { data: dealsData, error: dealsError } = await supabase
    .from("deals")
    .select("id, title, summary, stage, updated_at")
    .eq("deal_room_id", dealRoomId)
    .eq("company_id", companyId)
    .order("updated_at", { ascending: false });

  const deals: DealRow[] = !dealsError && dealsData ? (dealsData as DealRow[]) : [];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
            <Link href="/portfolio" className="text-gray-500 hover:text-gray-800">
              Portfolio
            </Link>
            <span className="mx-1.5 text-gray-300">/</span>
            Deal room
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-gray-900">Deal room</h1>
          <p className="mt-1 text-sm leading-snug text-gray-500">
            Opened {formatRoomDate(room.created_at)} · {companyRecord.name}
          </p>
        </div>
        <AddDealForm
          dealRoomId={dealRoomId}
          buttonClassName="inline-flex w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        />
      </div>

      <section className="mt-8" aria-label="Active deals">
        <div className="border-b border-gray-200 pb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Active deals</h2>
          <p className="mt-0.5 text-xs leading-snug text-gray-500">
            Matched discussions initiated from a mandate appear here automatically. View a card to open
            the execution record for that deal.
          </p>
        </div>

        {deals.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-gray-200 bg-gray-50/80 px-4 py-6 text-center">
            <p className="text-sm font-medium text-gray-800">No active deals yet</p>
            <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-gray-600">
              Initiate a discussion from a matched asset on the mandate page to create a deal here
              automatically. You can also record an off-platform opportunity using Add external deal above.
            </p>
          </div>
        ) : (
          <ul className="mt-4 grid list-none gap-4 p-0 sm:grid-cols-2">
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
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${dealStageBadgeClass(stage)}`}
                      >
                        {labelDealRoomStage(stage)}
                      </span>
                    </div>
                    <p className="mt-3 line-clamp-2 flex-1 text-xs leading-relaxed text-gray-600">
                      {deal.summary?.trim() ? deal.summary.trim() : "No summary yet."}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3">
                      <p className="text-[11px] text-gray-500">
                        <span className="font-medium text-gray-600">Updated</span>{" "}
                        {formatRoomDate(deal.updated_at)}
                      </p>
                      <Link
                        href={`/deal-rooms/${dealRoomId}/deals/${deal.id}`}
                        className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-900 shadow-sm transition hover:border-gray-400 hover:bg-gray-50"
                      >
                        View deal
                      </Link>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
