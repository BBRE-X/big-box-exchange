import { labelDealRoomStage } from "@/lib/deal-room-stage";

export type ActivityRow = {
  id: string;
  action_type: string;
  from_stage: string | null;
  to_stage: string | null;
  created_at: string;
  user_id: string | null;
  authorEmail: string | null;
};

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Australia/Brisbane",
  }).format(new Date(value));
}

function ActivityLine({ activity }: { activity: ActivityRow }) {
  if (activity.action_type === "stage_changed") {
    const from = activity.from_stage ? labelDealRoomStage(activity.from_stage) : "—";
    const to = activity.to_stage ? labelDealRoomStage(activity.to_stage) : "—";
    return (
      <span>
        Stage changed from{" "}
        <span className="font-medium text-gray-800">{from}</span>
        {" → "}
        <span className="font-medium text-gray-800">{to}</span>
      </span>
    );
  }
  return <span>{activity.action_type}</span>;
}

type Props = {
  activities: ActivityRow[];
  compact?: boolean;
};

export function DealActivity({ activities, compact = false }: Props) {
  const inner = (
    <>
      {compact ? (
        <div className="border-t border-gray-100 pt-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            Recent activity
          </p>
        </div>
      ) : (
        <>
          <h2 className="text-sm font-semibold text-gray-900">Activity</h2>
          <p className="mt-0.5 text-xs text-gray-500">Timeline of key actions on this deal.</p>
        </>
      )}

      <div className={compact ? "mt-3" : "mt-4"}>
        {activities.length === 0 ? (
          <p className="text-xs text-gray-400">No activity yet.</p>
        ) : (
          <ol className="relative space-y-0 border-l border-gray-100">
            {activities.map((activity) => (
              <li key={activity.id} className="pb-4 pl-5 last:pb-0">
                <span
                  className="absolute -left-[5px] mt-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-gray-300"
                  aria-hidden
                />
                <p className="text-xs leading-snug text-gray-600">
                  <ActivityLine activity={activity} />
                </p>
                <p className="mt-0.5 text-[11px] text-gray-400">
                  {formatTimestamp(activity.created_at)}
                  {activity.authorEmail ? (
                    <span className="ml-1.5">· {activity.authorEmail}</span>
                  ) : (
                    <span className="ml-1.5">· Team member</span>
                  )}
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </>
  );

  if (compact) return <div>{inner}</div>;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      {inner}
    </div>
  );
}
