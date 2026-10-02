"use client";

import { SpeakingChunk, ChunkProgress } from "@/types";
import { Clock, Sparkles, RotateCcw } from "lucide-react";

interface ExplorerSRSBadgeProps {
  chunk: SpeakingChunk;
  progressMap: Record<string, ChunkProgress>;
  now: number;
}

export function ExplorerSRSBadge({
  chunk,
  progressMap,
  now,
}: ExplorerSRSBadgeProps) {
  const prog = progressMap[chunk.id];

  if (!prog || prog.repetitions === 0) {
    return <span className="text-xs text-notion-muted italic">Chưa học</span>;
  }

  const isDue = new Date(prog.dueDate).getTime() <= now;
  const isMastered =
    prog.repetitions >= 3 &&
    (prog.bestAccuracy >= 80 || prog.confidenceScore >= 3);
  const daysLeft = Math.max(
    0,
    Math.round(
      (new Date(prog.dueDate).getTime() - now) / (1000 * 60 * 60 * 24)
    )
  );

  return (
    <div className="flex flex-col gap-1">
      {isDue ? (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-notion-red-text bg-notion-red-bg border border-notion-red-border px-2 py-0.5 rounded-full">
          <Clock size={10} /> Ôn ngay
        </span>
      ) : isMastered ? (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-notion-green-text bg-notion-green-bg border border-notion-green-border px-2 py-0.5 rounded-full">
          <Sparkles size={10} /> Thành thạo
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-xs text-notion-blue-text bg-notion-blue-bg border border-notion-blue-border px-2 py-0.5 rounded-full">
          <RotateCcw size={10} /> Sau {daysLeft}n
        </span>
      )}
      <span className="text-[11px] text-notion-muted">
        {prog.repetitions}x · {prog.bestAccuracy > 0 ? `${prog.bestAccuracy}%` : "—"}
      </span>
    </div>
  );
}

