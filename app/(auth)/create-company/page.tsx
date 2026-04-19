"use client";

import { useState } from "react";
import { createCompanyAction } from "./actions";

const ENTITY_OPTIONS = [
  {
    value: "principal",
    label: "Principal",
    description:
      "Owner-occupiers, acquisition teams, corporates buying for their own balance sheet",
  },
  {
    value: "investor",
    label: "Investor",
    description:
      "Private investors, syndicates, family offices deploying capital",
  },
  {
    value: "developer",
    label: "Developer",
    description:
      "Groups undertaking development, repositioning, or value-add projects",
  },
  {
    value: "agency",
    label: "Agency",
    description:
      "Licensed real estate agencies acting on behalf of vendors or landlords",
  },
  {
    value: "capital_partner",
    label: "Capital Partner",
    description:
      "Funds managers, private equity, institutional capital allocators",
  },
  {
    value: "government_authority",
    label: "Government / Authority",
    description: "Government bodies, councils, statutory authorities",
  },
  {
    value: "advisory_service_provider",
    label: "Advisory / Service Provider",
    description:
      "Lawyers, accountants, planners, consultants, brokers, project managers",
  },
] as const;

export default function CreateCompanyPage() {
  const [selectedEntityType, setSelectedEntityType] = useState<string>("principal");

  const selectedOption =
    ENTITY_OPTIONS.find((option) => option.value === selectedEntityType) ??
    ENTITY_OPTIONS[0];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Create your company
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Big Box Exchange is company-centric. Your company owns mandates, deal
          rooms, and portfolios.
        </p>
      </div>

      <form action={createCompanyAction} className="space-y-5">
        <div>
          <label
            htmlFor="company-name"
            className="block text-sm font-medium text-gray-700"
          >
            Company name
          </label>
          <input
            id="company-name"
            name="name"
            placeholder="e.g. Big Box Capital"
            required
            className="mt-1.5 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black/80"
          />
        </div>

        <div>
          <label
            htmlFor="entity-type"
            className="block text-sm font-medium text-gray-700"
          >
            Entity type
          </label>

          <select
            id="entity-type"
            name="entity_type"
            value={selectedEntityType}
            onChange={(e) => setSelectedEntityType(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/80"
          >
            {ENTITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <div className="text-sm font-medium text-gray-900">
              {selectedOption.label}
            </div>
            <div className="mt-1 text-sm leading-6 text-gray-500">
              {selectedOption.description}
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="w-full rounded-xl bg-black py-3 text-sm font-medium text-white transition-all hover:bg-black/90"
        >
          Create company
        </button>
      </form>
    </div>
  );
}