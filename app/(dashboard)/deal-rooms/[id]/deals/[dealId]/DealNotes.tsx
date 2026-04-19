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
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Notes</h2>

      <form onSubmit={handleSubmit} className="mb-6">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a note..."
          className="w-full resize-none rounded-lg border border-gray-300 p-3 focus:border-transparent focus:ring-2 focus:ring-blue-500"
          rows={3}
          disabled={isPending}
        />
        <button
          type="submit"
          disabled={isPending || !body.trim()}
          className="mt-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Adding..." : "Add note"}
        </button>
      </form>

      <div className="space-y-4">
        {notes.length === 0 ? (
          <p className="text-sm text-gray-500">No notes yet.</p>
        ) : (
          notes.map((note) => (
            <div key={note.id} className="border-l-4 border-blue-500 py-2 pl-4">
              <div className="mb-1 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-medium text-gray-800">
                  {formatAuthor(note, currentUserDisplayName)}
                </p>

                <p className="text-xs text-gray-500">
                  {formatNoteTimestamp(note.created_at)}
                </p>
              </div>

              <p className="whitespace-pre-wrap text-gray-900">{note.body}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}