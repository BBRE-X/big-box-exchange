"use client";

import { useFormStatus } from "react-dom";
import { addDealToRoom } from "@/app/(dashboard)/deal-rooms/[id]/actions";

function AddDealSubmit({ className }: { className: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? "Adding…" : "Add external deal"}
    </button>
  );
}

export function AddDealForm({
  dealRoomId,
  className,
  buttonClassName,
}: {
  dealRoomId: string;
  className?: string;
  buttonClassName: string;
}) {
  return (
    <form action={addDealToRoom as unknown as (formData: FormData) => Promise<void>} className={className}>
      <input type="hidden" name="dealRoomId" value={dealRoomId} />
      <AddDealSubmit className={buttonClassName} />
    </form>
  );
}
