export default function NewInsightPage() {
  return (
    <div className="space-y-8">
      <div>
        <div className="inline-flex rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
          Create
        </div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-neutral-900">
          Create Insight
        </h1>
        <p className="mt-3 max-w-2xl text-base text-neutral-600">
          This page will become the publishing flow for market intelligence and insights.
        </p>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-neutral-700">
          Later this will support agency updates, research posts, market commentary,
          and curated intelligence.
        </p>
      </div>
    </div>
  )
}