"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createDealRoomFromPortfolio } from "./actions";

type Props = {
  assetId: string;
  mandateId: string;
};

export function OpenDealRoomForm({ assetId, mandateId }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const fd = new FormData();
      fd.set("assetId", assetId);
      fd.set("mandateId", mandateId);
      const result = await createDealRoomFromPortfolio(fd);
      if (result.ok) {
        router.push(`/deal-rooms/${result.dealRoomId}`);
      } else {
        setError(result.error);
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} aria-label="Open deal room for this match">
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-gray-900 px-2.5 py-1 text-center text-[11px] font-semibold text-white shadow-sm transition hover:bg-gray-800 disabled:opacity-60"
      >
        {pending ? "Opening…" : "Open deal room"}
      </button>
      {error ? (
        <p
          className="mt-1 max-w-[11rem] text-right text-[10px] leading-snug text-red-600"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </form>
  );
}
