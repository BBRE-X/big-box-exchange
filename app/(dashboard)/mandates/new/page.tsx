import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getActiveCompanyId } from "@/lib/app-context";

export default async function NewMandatePage() {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const activeCompanyId = await getActiveCompanyId(user.id);

  async function createMandateAction(formData: FormData) {
    "use server";

    const supabase = await supabaseServer();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/auth");
    }

    const companyId = await getActiveCompanyId(user.id);

    if (!companyId) {
      redirect("/mandates");
    }

    const title = String(formData.get("title") ?? "").trim();
    const assetType = String(formData.get("asset_type") ?? "").trim();
    const location = String(formData.get("location") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();

    if (!title) {
      redirect("/mandates/new");
    }

    await supabase.from("mandates").insert({
      company_id: companyId,
      title,
      asset_type: assetType || null,
      location: location || null,
      description: description || null,
    });

    redirect("/mandates");
  }

  return (
    <main className="mx-auto max-w-3xl">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-gray-900">
            New Mandate
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            Create an acquisition mandate for your active company.
          </p>
        </div>

        <Link
          href="/mandates"
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800"
        >
          Back
        </Link>
      </div>

      {!activeCompanyId ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
          <h2 className="text-lg font-semibold text-gray-900">No active company</h2>
          <p className="mt-2 text-sm text-gray-600">
            Set an active company before creating a mandate.
          </p>
        </div>
      ) : (
        <form action={createMandateAction} className="space-y-6">
          <div>
            <label
              htmlFor="title"
              className="mb-2 block text-sm font-medium text-gray-800"
            >
              Title
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none ring-0 focus:border-gray-900"
              placeholder="e.g. South East Industrial Acquisition"
            />
          </div>

          <div>
            <label
              htmlFor="asset_type"
              className="mb-2 block text-sm font-medium text-gray-800"
            >
              Asset type
            </label>
            <input
              id="asset_type"
              name="asset_type"
              type="text"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none ring-0 focus:border-gray-900"
              placeholder="e.g. Industrial"
            />
          </div>

          <div>
            <label
              htmlFor="location"
              className="mb-2 block text-sm font-medium text-gray-800"
            >
              Location
            </label>
            <input
              id="location"
              name="location"
              type="text"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none ring-0 focus:border-gray-900"
              placeholder="e.g. Brisbane, QLD"
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="mb-2 block text-sm font-medium text-gray-800"
            >
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={5}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none ring-0 focus:border-gray-900"
              placeholder="Describe mandate requirements."
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
            >
              Create mandate
            </button>

            <Link
              href="/mandates"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800"
            >
              Cancel
            </Link>
          </div>
        </form>
      )}
    </main>
  );
}
