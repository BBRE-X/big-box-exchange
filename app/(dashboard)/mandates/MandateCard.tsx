type MandateCardProps = {
  title: string;
  assetType?: string | null;
  location?: string | null;
  status?: string | null;
  description?: string | null;
};

export default function MandateCard({
  title,
  assetType,
  location,
  status,
  description,
}: MandateCardProps) {
  return (
    <article className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap gap-2">
        {assetType ? (
          <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
            {assetType}
          </span>
        ) : null}

        {status ? (
          <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
            {status}
          </span>
        ) : null}
      </div>

      <h3 className="text-2xl font-semibold tracking-tight text-gray-900">
        {title}
      </h3>

      {location ? (
        <p className="mt-2 text-base text-gray-600">{location}</p>
      ) : null}

      {description ? (
        <p className="mt-4 text-sm leading-6 text-gray-600">{description}</p>
      ) : null}
    </article>
  );
}