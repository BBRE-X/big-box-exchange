type MandateCardProps = {
  companyName: string
  companyType?: string
  dealIntent: string
  assetTypes: string[]
  searchAreas: string[]
  budgetLabel: string
  status?: string
  postedLabel?: string
}

export default function MandateCard({
  companyName,
  companyType,
  dealIntent,
  assetTypes,
  searchAreas,
  budgetLabel,
  status = "Active",
  postedLabel = "Posted recently",
}: MandateCardProps) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-neutral-900 px-3 py-1 text-xs font-medium text-white">
              {dealIntent}
            </span>
            <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
              {status}
            </span>
          </div>

          <h3 className="mt-4 text-2xl font-semibold tracking-tight text-neutral-900">
            {companyName}
          </h3>

          {companyType ? (
            <p className="mt-1 text-sm text-neutral-500">{companyType}</p>
          ) : null}
        </div>

        <div className="text-sm text-neutral-500">{postedLabel}</div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            Asset Types
          </div>
          <div className="mt-2 text-sm font-semibold text-neutral-900">
            {assetTypes.join(", ")}
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            Search Areas
          </div>
          <div className="mt-2 text-sm font-semibold text-neutral-900">
            {searchAreas.join(", ")}
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            Budget
          </div>
          <div className="mt-2 text-sm font-semibold text-neutral-900">
            {budgetLabel}
          </div>
        </div>
      </div>
    </div>
  )
}