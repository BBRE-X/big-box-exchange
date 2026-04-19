import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveCompanyRecord } from "@/lib/app-context";
import { DealStageSelector } from "./DealStageSelector";
import { DealNotes } from "./DealNotes";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type PageProps = {
  params: Promise<{ id: string; dealId: string }>;
};

type DealRow = {
  id: string;
  deal_room_id: string;
  company_id: string;
  title: string;
  summary: string | null;
  stage: string;
  updated_at: string;
};

type MembershipRow = {
  user_id: string;
  role: string | null;
};

type NoteRow = {
  id: string;
  body: string;
  created_at: string;
  created_by: string | null;
};

type NormalizedNote = {
  id: string;
  body: string;
  created_at: string;
  created_by: string | null;
  authorEmail: string | null;
  authorRole: string | null;
  isCurrentUser: boolean;
};

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Australia/Brisbane",
  }).format(new Date(value));
}

export default async function DealRecordPage({ params }: PageProps) {
  const { id: dealRoomId, dealId } = await params;

  if (!UUID_RE.test(dealRoomId) || !UUID_RE.test(dealId)) {
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

  const { data: deal, error: dealError } = await supabase
    .from("deals")
    .select("id, deal_room_id, company_id, title, summary, stage, updated_at")
    .eq("id", dealId)
    .eq("deal_room_id", dealRoomId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (dealError || !deal) {
    notFound();
  }

  const row = deal as DealRow;

  const { data: notesRaw, error: notesError } = await supabase
    .from("deal_room_notes")
    .select("id, body, created_at, created_by")
    .eq("deal_room_id", dealRoomId)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (notesError) {
    console.error("[DealRecordPage] Failed to load notes:", notesError);
  }

  const { data: membershipsRaw, error: membershipsError } = await supabase
    .from("memberships")
    .select("user_id, role")
    .eq("company_id", companyId);

  if (membershipsError) {
    console.error("[DealRecordPage] Failed to load memberships:", membershipsError);
  }

  const memberships = (membershipsRaw ?? []) as MembershipRow[];

  const notes = ((notesRaw ?? []) as NoteRow[]).map((note): NormalizedNote => {
    const membership = memberships.find((m) => m.user_id === note.created_by);

    return {
      id: note.id,
      body: note.body,
      created_at: note.created_at,
      created_by: note.created_by,
      authorEmail: note.created_by === user.id ? user.email ?? null : null,
      authorRole: membership?.role ?? "Member",
      isCurrentUser: note.created_by === user.id,
    };
  });

  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
        <Link href="/portfolio" className="text-gray-500 hover:text-gray-800">
          Portfolio
        </Link>
        <span className="mx-1.5 text-gray-300">/</span>
        <Link
          href={`/deal-rooms/${dealRoomId}`}
          className="text-gray-500 hover:text-gray-800"
        >
          Deal room
        </Link>
        <span className="mx-1.5 text-gray-300">/</span>
        Deal
      </p>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            {row.title}
          </h1>
          <p className="mt-1 text-sm leading-snug text-gray-600">
            Execution record for this deal under {companyRecord.name}.
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <DealStageSelector
          dealId={dealId}
          dealRoomId={dealRoomId}
          currentStage={row.stage}
        />
      </div>

      <dl className="mt-8 space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Summary
          </dt>
          <dd className="mt-1 text-sm text-gray-800">
            {row.summary?.trim() || "No summary yet."}
          </dd>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Last updated
          </dt>
          <dd className="mt-1 text-sm font-medium text-gray-900">
            {formatUpdatedAt(row.updated_at)}
          </dd>
        </div>
      </dl>

      <div className="mt-8">
        <DealNotes
          dealId={dealId}
          dealRoomId={dealRoomId}
          initialNotes={notes}
          currentUserDisplayName={companyRecord.name}
        />
      </div>

      <div className="mt-6">
        <Link
          href={`/deal-rooms/${dealRoomId}`}
          className="text-sm font-medium text-gray-800 underline-offset-4 hover:underline"
        >
          ← Back to deal room
        </Link>
      </div>
    </div>
  );
}