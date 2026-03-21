import Link from "next/link";

type MandateCardProps = {
  id: string;
  title: string;
  asset_type: string | null;
  location: string | null;
  status: string | null;
  description: string | null;
};

function niceStatus(value: string | null) {
  if (!value || !value.trim()) return "Unset";
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusBadgeClass(status: string | null) {
  const s = (status ?? "").toLowerCase();
  if (s === "active") return "bg-green-100 text-green-800";
  if (s === "matched") return "bg-blue-100 text-blue-800";
  if (s === "engaged") return "bg-amber-100 text-amber-900";
  if (s === "closed") return "bg-gray-200 text-gray-800";
  return "bg-gray-100 text-gray-700";
}

export default function MandateCard({
  id,
  title,
  asset_type,
  location,
  status,
  description,
}: MandateCardProps) {
  const locationPart = location?.trim() || null;
  const typePart = asset_type?.trim() || null;

  return (
    <Link
      href={`/mandates/${id}`}
      className="block rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
      prefetch={false}
      aria-label={`Open mandate ${title}`}
      style={{ textDecoration: "none" }}
    >
      <article className="flex cursor-pointer flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md md:flex-row md:items-stretch">
        <div className="h-1.5 w-full shrink-0 bg-gray-900 md:hidden" aria-hidden />
        <div
          className="hidden w-1.5 shrink-0 bg-gray-900 md:block md:min-h-[5.5rem]"
          aria-hidden
        />

        <div className="flex min-w-0 flex-1 flex-col justify-center p-3 md:p-4">
          <div className="flex flex-wrap items-start justify-between gap-2 gap-y-1">
            <h3 className="min-w-0 flex-1 text-base font-semibold leading-tight tracking-tight text-gray-900 md:text-lg">
              {title}
            </h3>
            <span
              className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusBadgeClass(status)}`}
            >
              {niceStatus(status)}
            </span>
          </div>

          <p className="mt-1.5 text-[11px] leading-snug text-gray-600">
            <span className="font-medium text-gray-800">Location</span>{" "}
            {locationPart ?? "—"}
            <span className="mx-2 text-gray-300" aria-hidden>
              ·
            </span>
            <span className="font-medium text-gray-800">Type</span> {typePart ?? "—"}
          </p>

          {description?.trim() ? (
            <p className="mt-1.5 line-clamp-1 text-xs leading-snug text-gray-700">
              {description.trim()}
            </p>
          ) : null}
        </div>
      </article>
    </Link>
  );
}
