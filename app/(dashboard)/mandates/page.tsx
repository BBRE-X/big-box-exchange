import MandateCard from "./MandateCard";

export default function MandatesPage() {
  return (
    <main className="mx-auto max-w-7xl">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-gray-900">
            Mandates
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            Manage acquisition mandates for your active company.
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        <MandateCard
          title="Brisbane Industrial Acquisition"
          assetType="Industrial"
          location="Brisbane, QLD"
          status="Active"
          description="Seeking an industrial asset with strong access, modern improvements, and long-term value upside."
        />
      </div>
    </main>
  );
}