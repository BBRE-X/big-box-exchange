import { redirect, notFound } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import NewAssetForm from "@/components/assets/NewAssetForm";

type PageProps = {
  searchParams?: Promise<{
    id?: string;
  }>;
};

export default async function NewAssetPage({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const assetId = resolvedSearchParams?.id;

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  let initialData: Record<string, unknown> | null = null;

  if (assetId) {
    const { data: asset } = await supabase
      .from("assets")
      .select("*")
      .eq("id", assetId)
      .single();

    if (!asset) {
      notFound();
    }

    initialData = asset;
  }

  async function saveAssetAction(formData: FormData) {
    "use server";

    console.log("Asset form submitted", Object.fromEntries(formData.entries()));
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
          {assetId ? "Edit Asset" : "Add Asset"}
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          {assetId
            ? "Update this company asset."
            : "Add a new company asset to your portfolio."}
        </p>
      </div>

      <NewAssetForm action={saveAssetAction} initialData={initialData} />
    </main>
  );
}