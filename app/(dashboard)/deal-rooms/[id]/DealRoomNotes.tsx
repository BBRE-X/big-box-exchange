"use client";

import { useState, useRef, useEffect } from "react";
import { addDealRoomNote } from "./actions";

type Note = {
  id: string;
  body: string;
  created_at: string;
  created_by: string;
  user_email?: string;
};

type DealRoomNotesProps = {
  dealRoomId: string;
  initialNotes: Note[];
  userEmail: string | null;
};

function formatNoteTime(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function DealRoomNotes({
  dealRoomId,
  initialNotes,
  userEmail,
}: DealRoomNotesProps) {
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [body, setBody] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const areDisplayingNotes = notes.length > 0;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!body.trim()) {
      setFeedback({ type: "error", message: "Note cannot be empty." });
      return;
    }

    setIsLoading(true);
    setFeedback(null);

    const result = await addDealRoomNote(dealRoomId, body);

    if (result.ok) {
      // Optimistically add the note to the UI
      const newNote: Note = {
        id: `temp-${Date.now()}`,
        body: body.trim(),
        created_at: new Date().toISOString(),
        created_by: "",
        user_email: userEmail || undefined,
      };

      setNotes([newNote, ...notes]);
      setBody("");
      setFeedback({ type: "success", message: "Note added." });

      // Clear feedback after 2 seconds
      setTimeout(() => setFeedback(null), 2000);

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } else {
      setFeedback({ type: "error", message: result.error });
    }

    setIsLoading(false);
  }

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setBody(e.target.value);
    // Auto-grow textarea
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 300) + "px";
  }

  return (
    <section className="mt-8">
      <div className="border-b border-gray-200 pb-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Notes</h2>
        <p className="mt-0.5 text-xs leading-snug text-gray-500">
          Add notes to track progress, decisions, and context for this deal room.
        </p>
      </div>

      {/* Add Note Form */}
      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            ref={textareaRef}
            value={body}
            onChange={handleTextareaChange}
            placeholder="Add a note..."
            className="h-20 w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
            disabled={isLoading}
          />

          <div className="flex items-center justify-between gap-2">
            <div>
              {feedback && (
                <div
                  className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                    feedback.type === "success"
                      ? "bg-emerald-50 text-emerald-800"
                      : "bg-red-50 text-red-800"
                  }`}
                >
                  {feedback.message}
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={isLoading || !body.trim()}
              className="inline-flex rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "Adding..." : "Add note"}
            </button>
          </div>
        </form>
      </div>

      {/* Notes List */}
      {areDisplayingNotes ? (
        <div className="mt-4 space-y-3">
          {notes.map((note) => (
            <div
              key={note.id}
              className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
            >
              <p className="text-sm leading-relaxed text-gray-900">{note.body}</p>
              <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2">
                <span className="text-[11px] text-gray-500">
                  {note.user_email ? (
                    <>
                      <span className="font-medium text-gray-600">{note.user_email}</span>
                      {" · "}
                    </>
                  ) : null}
                  {formatNoteTime(note.created_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-dashed border-gray-200 bg-gray-50/80 px-3 py-4 text-center">
          <p className="text-xs text-gray-600">No notes yet. Start the conversation.</p>
        </div>
      )}
    </section>
  );
}
