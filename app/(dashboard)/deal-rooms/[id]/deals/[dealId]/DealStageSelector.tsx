"use client";

import { useState } from "react";
import {
  DEAL_ROOM_STAGES,
  type DealRoomStage,
  labelDealRoomStage,
  dealStageBadgeClass,
} from "@/lib/deal-room-stage";
import { updateDealStage } from "./actions";

type DealStageSelectorProps = {
  dealId: string;
  dealRoomId: string;
  currentStage: string;
};

export function DealStageSelector({
  dealId,
  dealRoomId,
  currentStage,
}: DealStageSelectorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );
  const [stage, setStage] = useState(currentStage);

  async function handleStageChange(newStage: DealRoomStage) {
    if (newStage === stage) return;

    setIsLoading(true);
    setFeedback(null);

    const result = await updateDealStage(dealId, newStage, dealRoomId);

    if (result.ok) {
      setStage(result.newStage);
      setFeedback({ type: "success", message: "Stage updated." });
      setTimeout(() => setFeedback(null), 2000);
    } else {
      setFeedback({ type: "error", message: result.error });
    }

    setIsLoading(false);
  }

  return (
    <div className="space-y-4">
      {/* Stage Buttons */}
      <div className="flex flex-wrap gap-2">
        {DEAL_ROOM_STAGES.map((stageOption) => {
          const isActive = stageOption === stage;
          const label = labelDealRoomStage(stageOption);

          return (
            <button
              key={stageOption}
              onClick={() => handleStageChange(stageOption as DealRoomStage)}
              disabled={isLoading}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? `${dealStageBadgeClass(stageOption)} ring-2 ring-offset-2 ring-gray-400 cursor-default`
                  : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              } ${isLoading ? "cursor-not-allowed opacity-60" : ""}`}
              aria-pressed={isActive}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Feedback Message */}
      {feedback && (
        <div
          className={`rounded-lg px-3 py-2 text-sm font-medium ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Current Stage Indicator */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span>Current:</span>
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${dealStageBadgeClass(
            stage
          )}`}
        >
          {labelDealRoomStage(stage)}
        </span>
      </div>
    </div>
  );
}
