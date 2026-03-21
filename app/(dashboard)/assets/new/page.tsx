import { redirect, notFound } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import NewAssetForm from "@/components/assets/NewAssetForm";

type SearchParams = Promise<{
  id?: string;
}>;

type PageProps = {
  searchParams?: SearchParams;
};

type CompanyRow = {
  id: string;
  name: string;
};

const BUCKET_NAME = "asset-images";

function normaliseListingOptions(values: FormDataEntryValue[]) {
  const options = values
    .map((value) => String(value))
    .filter(Boolean);

  const hasOpenForOffers = options.includes("open_for_offers");

  let listingType = "none";
  if (options.includes("for_sale")) {
    listingType = "for_sale";
  } else if (options.includes("for_lease")) {
    listingType = "for_lease";
  } else if (hasOpenForOffers) {
    listingType = "open_for_offers";
  }

  return {
    listing_options: options,
    listing_type: listingType,
    open_for_offers: hasOpenForOffers,
  };
}

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

  const { data: memberships, error: membershipsError } = await supabase
    .from("memberships")
    .select("company_id, status, companies(id, name)")
    .eq("user_id", user.id);

  if (membershipsError) {
    throw new Error(`Failed to load memberships: ${membershipsError.message}`);
  }

  const activeMemberships =
    memberships?.filter((m: any) => !m.status || m.status === "active") ?? [];

  const companies: CompanyRow[] = activeMemberships
    .map((m: any) => m.companies)
    .filter(Boolean)
    .map((c: any) => ({
      id: c.id,
      name: c.name,
    }));

  if (companies.length === 0) {
    redirect("/companies");
  }

  let activeCompany = companies[0];

  const { data: profile } = await supabase
    .from("profiles")
    .select("active_company_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.active_company_id) {
    const matched = companies.find((c) => c.id === profile.active_company_id);
    if (matched) activeCompany = matched;
  }

  let initialData: Record<string, unknown> | null = null;

  if (assetId) {
    const { data: asset, error: assetError } = await supabase
      .from("assets")
      .select("*")
      .eq("id", assetId)
      .eq("company_id", activeCompany.id)
      .single();

    if (assetError || !asset) {
      notFound();
    }

    const listingOptions: string[] = [];
    if (asset.listing_type && asset.listing_type !== "none") {
      listingOptions.push(asset.listing_type);
    }
    if (asset.open_for_offers && !listingOptions.includes("open_for_offers")) {
      listingOptions.push("open_for_offers");
    }
    if (listingOptions.length === 0) {
      listingOptions.push("none");
    }

    initialData = {
      ...asset,
      listing_options: listingOptions,
      hide_price: Boolean(asset.price_display),
      hide_price_display_text: asset.price_display ?? "",
    };
  }

  async function saveAssetAction(formData: FormData) {
    "use server";

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

    const { data: memberships, error: membershipsError } = await supabase
      .from("memberships")
      .select("company_id, status, companies(id, name)")
      .eq("user_id", user.id);

    if (membershipsError) {
      throw new Error(`Failed to load memberships: ${membershipsError.message}`);
    }

    const activeMemberships =
      memberships?.filter((m: any) => !m.status || m.status === "active") ?? [];

    const companies: CompanyRow[] = activeMemberships
      .map((m: any) => m.companies)
      .filter(Boolean)
      .map((c: any) => ({
        id: c.id,
        name: c.name,
      }));

    if (companies.length === 0) {
      redirect("/companies");
    }

    let activeCompany = companies[0];

    const { data: profile } = await supabase
      .from("profiles")
      .select("active_company_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.active_company_id) {
      const matched = companies.find((c) => c.id === profile.active_company_id);
      if (matched) activeCompany = matched;
    }

    const title = String(formData.get("title") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const asset_type = String(formData.get("asset_type") ?? "industrial");
    const suburb = String(formData.get("suburb") ?? "").trim();
    const state = String(formData.get("state") ?? "").trim();
    const country = String(formData.get("country") ?? "").trim();

    const price_min_raw = String(formData.get("price_min") ?? "").trim();
    const price_max_raw = String(formData.get("price_max") ?? "").trim();
    const building_area_raw = String(formData.get("building_area_sqm") ?? "").trim();
    const land_area_raw = String(formData.get("land_area_sqm") ?? "").trim();

    const hidePrice = formData.get("hide_price") === "on";
    const hidePriceDisplayText = String(
      formData.get("hide_price_display_text") ?? ""
    ).trim();

    const listingData = normaliseListingOptions(formData.getAll("listing_options"));

    if (!title) {
      throw new Error("Title is required.");
    }

    const basePayload = {
      title,
      description: description || null,
      asset_type,
      listing_type: listingData.listing_type,
      suburb: suburb || null,
      state: state || null,
      country: country || null,
      price_min: hidePrice ? null : price_min_raw ? Number(price_min_raw) : null,
      price_max: hidePrice ? null : price_max_raw ? Number(price_max_raw) : null,
      price_display: hidePrice ? hidePriceDisplayText || "Price on application" : null,
      building_area_sqm: building_area_raw ? Number(building_area_raw) : null,
      land_area_sqm: land_area_raw ? Number(land_area_raw) : null,
      is_public: formData.get("is_public") === "on",
      open_for_offers: listingData.open_for_offers,
      company_id: activeCompany.id,
    };

    let savedAssetId = assetId;

    if (assetId) {
      const { error } = await supabase
        .from("assets")
        .update(basePayload)
        .eq("id", assetId)
        .eq("company_id", activeCompany.id);

      if (error) {
        throw new Error(`Failed to update asset: ${error.message}`);
      }
    } else {
      const insertPayload = {
        ...basePayload,
        created_by: user.id,
      };

      const { data: insertedAsset, error } = await supabase
        .from("assets")
        .insert(insertPayload)
        .select("id")
        .single();

      if (error) {
        throw new Error(`Failed to create asset: ${error.message}`);
      }

      savedAssetId = insertedAsset.id as string;
    }

    if (!savedAssetId) {
      throw new Error("Asset ID missing after save.");
    }

    const imageFiles = formData
      .getAll("images")
      .filter(
        (value): value is File =>
          value instanceof File && value.size > 0 && Boolean(value.name)
      )
      .slice(0, 4);

    if (imageFiles.length > 0) {
      if (assetId) {
        const { error: deleteExistingImagesError } = await supabase
          .from("asset_images")
          .delete()
          .eq("asset_id", savedAssetId);

        if (deleteExistingImagesError) {
          throw new Error(
            `Failed to replace existing images: ${deleteExistingImagesError.message}`
          );
        }
      }

      const uploadedImageRows: { asset_id: string; image_url: string; position: number }[] =
        [];

      for (let index = 0; index < imageFiles.length; index += 1) {
        const file = imageFiles[index];
        const fileExt = file.name.includes(".")
          ? file.name.split(".").pop()
          : "jpg";
        const filePath = `${activeCompany.id}/${savedAssetId}/${Date.now()}-${index}.${fileExt}`;

        const arrayBuffer = await file.arrayBuffer();
        const fileBytes = new Uint8Array(arrayBuffer);

        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(filePath, fileBytes, {
            contentType: file.type || "image/jpeg",
            upsert: true,
          });

        if (uploadError) {
          throw new Error(`Failed to upload image: ${uploadError.message}`);
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);

        uploadedImageRows.push({
          asset_id: savedAssetId,
          image_url: publicUrl,
          position: index,
        });
      }

      const { error: assetImagesInsertError } = await supabase
        .from("asset_images")
        .insert(uploadedImageRows);

      if (assetImagesInsertError) {
        throw new Error(
          `Failed to save asset image records: ${assetImagesInsertError.message}`
        );
      }
    }

    redirect(`/assets/${savedAssetId}`);
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