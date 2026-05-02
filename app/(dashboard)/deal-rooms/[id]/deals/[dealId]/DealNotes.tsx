"use client";

import { useState, useTransition } from "react";
import { addDealNote } from "./actions";

interface DealNote {
  id: string;
  body: string;
  created_at: string;
  created_by?: string | null;
  authorEmail?: string | null;
  authorRole?: string | null;
  isCurrentUser?: boolean;
}

interface DealNotesProps {
  dealId: string;
  dealRoomId: string;
  initialNotes: DealNote[];
  currentUserDisplayName: string;
}

function formatAuthor(note: DealNote, currentUserDisplayName: string) {
  if (note.isCurrentUser) {
    return note.authorRole
      ? `${currentUserDisplayName} (${note.authorRole})`
      : currentUserDisplayName;
  }

  if (note.authorEmail && note.authorRole) {
    return `${note.authorEmail} (${note.authorRole})`;
  }

  if (note.authorEmail) {
    return note.authorEmail;
  }

  if (note.created_by && note.authorRole) {
    return `${note.created_by} (${note.authorRole})`;
  }

  if (note.created_by) {
    return note.created_by;
  }

  if (note.authorRole) {
    return note.authorRole;
  }

  return "User";
}

function formatNoteTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Australia/Brisbane",
  }).format(new Date(value));
}

export function DealNotes({
  dealId,
  dealRoomId,
  initialNotes,
  currentUserDisplayName,
}: DealNotesProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!body.trim()) return;

    const noteBody = body.trim();

    startTransition(async () => {
      const result = await addDealNote(dealId, noteBody, dealRoomId);

      if (result.ok) {
        const newNote: DealNote = {
          id: `temp-${Date.now()}`,
          body: noteBody,
          created_at: new Date().toISOString(),
          isCurrentUser: true,
          authorRole: notes.find((note) => note.isCurrentUser)?.authorRole ?? "Member",
        };

        setNotes((prev) => [newNote, ...prev]);
        setBody("");
      } else {
        console.error("[DealNotes] Error from server:", result.error);
        alert(result.error);
      }
    });
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-900">Internal notes</h2>
      <p className="mt-0.5 text-xs text-gray-500">Visible only to your company.</p>

      <form onSubmit={handleSubmit} className="mt-4">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a note…"
          className="w-full resize-none rounded-lg border border-gray-300 p-3 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 disabled:opacity-50"
          rows={3}
          disabled={isPending}
        />
        <div className="mt-2 flex justify-end">
          <button
            type="submit"
            disabled={isPending || !body.trim()}
            className="inline-flex items-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Adding…" : "Add note"}
          </button>
        </div>
      </form>

      <div className="mt-5 space-y-3">
        {notes.length === 0 ? (
          <p className="text-xs text-gray-400">No notes yet.</p>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className="rounded-lg border border-gray-100 bg-gray-50 p-3.5 shadow-sm"
            >
              <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-medium text-gray-700">
                  {formatAuthor(note, currentUserDisplayName)}
                </p>
                <p className="text-[11px] text-gray-400">
                  {formatNoteTimestamp(note.created_at)}
                </p>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
                {note.body}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}