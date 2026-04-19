"use client";

import { useState } from "react";

export default function NewAssetForm({
  action,
  initialData,
}: {
  action: (formData: FormData) => void;
  initialData?: {
    listing_options?: string[]; // ["for_sale", ...]
    is_public?: boolean;
    title?: string;
    description?: string;
    asset_type?: string;
    address?: string;
    suburb?: string;
    state?: string;
    country?: string;
    location_visibility?: string;
    price_min?: number | string;
    price_max?: number | string;
    hide_price?: boolean;
    hide_price_display_text?: string;
    building_area_sqm?: number | string;
    land_area_sqm?: number | string;
    // images are ignored on edit since they aren't able to be prefilled
  };
}) {
  // Support prefilling all values
  const [hidePrice, setHidePrice] = useState(Boolean(initialData?.hide_price));

  // Pre-checkboxes for listing options
  const isListingOptionChecked = (option: string) =>
    initialData?.listing_options?.includes(option) ?? false;

  return (
    <form action={action} className="space-y-8">
      <section className="space-y-4 rounded-xl border p-6">
        <h2 className="text-lg font-semibold">Listing options</h2>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            name="listing_options"
            value="for_sale"
            defaultChecked={isListingOptionChecked("for_sale")}
          />
          <span>For Sale</span>
        </label>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            name="listing_options"
            value="for_lease"
            defaultChecked={isListingOptionChecked("for_lease")}
          />
          <span>For Lease</span>
        </label>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            name="listing_options"
            value="open_for_offers"
            defaultChecked={isListingOptionChecked("open_for_offers")}
          />
          <span>Open for Offers</span>
        </label>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            name="listing_options"
            value="none"
            defaultChecked={isListingOptionChecked("none")}
          />
          <span>None (not active)</span>
        </label>
      </section>

      <section className="space-y-4 rounded-xl border p-6">
        <h2 className="text-lg font-semibold">Visibility</h2>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            name="is_public"
            defaultChecked={initialData?.is_public ?? false}
          />
          <span>List publicly on feed</span>
        </label>
      </section>

      <section className="space-y-4 rounded-xl border p-6">
        <h2 className="text-lg font-semibold">Core details</h2>

        <input
          name="title"
          placeholder="Title"
          className="w-full rounded-lg border p-3"
          required
          defaultValue={initialData?.title ?? ""}
        />

        <textarea
          name="description"
          placeholder="Description"
          className="w-full rounded-lg border p-3"
          rows={5}
          defaultValue={initialData?.description ?? ""}
        />

        <select
          name="asset_type"
          className="w-full rounded-lg border p-3"
          required
          defaultValue={initialData?.asset_type ?? ""}
        >
          <option value="">Asset type</option>
          <option value="industrial">Industrial</option>
          <option value="retail">Retail</option>
          <option value="office">Office</option>
          <option value="land">Land</option>
          <option value="development_site">Development Site</option>
          <option value="mixed_use">Mixed Use</option>
          <option value="other">Other</option>
        </select>
      </section>

      <section className="space-y-4 rounded-xl border p-6">
        <h2 className="text-lg font-semibold">Location</h2>

        <input
          name="address"
          placeholder="Street number and name"
          className="w-full rounded-lg border p-3"
          defaultValue={initialData?.address ?? ""}
        />

        <input
          name="suburb"
          placeholder="Suburb"
          className="w-full rounded-lg border p-3"
          defaultValue={initialData?.suburb ?? ""}
        />

        <input
          name="state"
          placeholder="State"
          className="w-full rounded-lg border p-3"
          defaultValue={initialData?.state ?? ""}
        />

        <input
          name="country"
          defaultValue={initialData?.country ?? "Australia"}
          className="w-full rounded-lg border p-3"
        />

        <select
          name="location_visibility"
          defaultValue={initialData?.location_visibility ?? "suburb_only"}
          className="w-full rounded-lg border p-3"
        >
          <option value="exact_address">Exact address</option>
          <option value="suburb_only">Suburb only</option>
          <option value="confidential">Confidential</option>
        </select>
      </section>

      <section className="space-y-4 rounded-xl border p-6">
        <h2 className="text-lg font-semibold">Commercial details</h2>

        <input
          name="price_min"
          type="number"
          placeholder="Price min"
          className="w-full rounded-lg border p-3"
          defaultValue={initialData?.price_min ?? ""}
        />

        <input
          name="price_max"
          type="number"
          placeholder="Price max"
          className="w-full rounded-lg border p-3"
          defaultValue={initialData?.price_max ?? ""}
        />

        <div className="space-y-3 rounded-lg border border-gray-200 p-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              name="hide_price"
              checked={hidePrice}
              onChange={(e) => setHidePrice(e.target.checked)}
            />
            <span className="font-medium">Hide price</span>
          </label>

          {hidePrice ? (
            <div className="space-y-2">
              <label
                htmlFor="hide_price_display_text"
                className="block text-sm font-medium text-gray-700"            >
                Display text instead of price
              </label>
              <input
                id="hide_price_display_text"
                name="hide_price_display_text"
                placeholder="Add your text here"
                className="w-full rounded-lg border p-3"
                defaultValue={initialData?.hide_price_display_text ?? ""}
              />
            </div>
          ) : null}
        </div>

        <input
          name="building_area_sqm"
          type="number"
          placeholder="Building area sqm"
          className="w-full rounded-lg border p-3"
          defaultValue={initialData?.building_area_sqm ?? ""}
        />

        <input
          name="land_area_sqm"
          type="number"
          placeholder="Land area sqm"
          className="w-full rounded-lg border p-3"
          defaultValue={initialData?.land_area_sqm ?? ""}
        />
      </section>

      <section className="space-y-4 rounded-xl border p-6">
        <h2 className="text-lg font-semibold">Images</h2>

        <input type="file" name="images" multiple accept="image/*" />

        <p className="text-sm text-gray-500">
          Optional. Upload up to 4 images.
        </p>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button className="rounded-xl bg-black px-6 py-3 text-white">
          {initialData ? "Update Asset" : "Add Asset"}
        </button>

        <a
          href="/assets"
          className="block rounded-xl border px-6 py-3 text-center"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}