"use client";

import React, { useState } from "react";
import { SpeakingChunk, ChunkProgress } from "@/types";
import { speechService } from "@/lib/client/speech";
import {
  Volume2,
  Play,
  Edit2,
  Trash2,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from "lucide-react";
import { ExplorerSRSBadge } from "./ExplorerSRSBadge";
import { SidebarSection } from "./ExplorerNavItem";

const LEVEL_COLOR: Record<string, string> = {
  A2: "bg-emerald-50 text-emerald-700 border-emerald-200",
  B1: "bg-blue-50 text-blue-700 border-blue-200",
  B2: "bg-violet-50 text-violet-700 border-violet-200",
  C1: "bg-rose-50 text-rose-700 border-rose-200"
};

const PAGE_SIZE_OPTIONS = [10, 50, 100] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

interface ExplorerChunkTableProps {
  displayChunks: SpeakingChunk[];
  baseChunks: SpeakingChunk[];
  progressMap: Record<string, ChunkProgress>;
  now: number;
  search: string;
  activeSection: SidebarSection;
  onPracticeChunk?: (chunk: SpeakingChunk, topicIdOverride?: string) => void;
  onEditChunk: (chunk: SpeakingChunk) => void;
  onDeleteChunk: (chunkId: string) => void;
  onClearFilters: () => void;
  showClearBtn: boolean;
}

export const ExplorerChunkTable: React.FC<ExplorerChunkTableProps> = ({
  displayChunks,
  baseChunks,
  progressMap,
  now,
  search,
  activeSection,
  onPracticeChunk,
  onEditChunk,
  onDeleteChunk,
  onClearFilters,
  showClearBtn
}) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(10);

  const totalPages = Math.max(1, Math.ceil(displayChunks.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, displayChunks.length);
  const pageChunks = displayChunks.slice(startIdx, endIdx);

  // Generate page number buttons (max 5 visible)
  const getPageNumbers = () => {
    const delta = 2;
    const range: number[] = [];
    const rangeWithDots: (number | "...")[] = [];
    let l: number | undefined;

    for (let i = Math.max(1, safePage - delta); i <= Math.min(totalPages, safePage + delta); i++) {
      range.push(i);
    }

    for (const i of range) {
      if (l !== undefined) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l > 2) {
          rangeWithDots.push("...");
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    // prepend 1 if needed
    if (range[0] > 1) {
      rangeWithDots.unshift(1);
      if (range[0] > 2) rangeWithDots.splice(1, 0, "...");
    }
    // append last if needed
    if (range[range.length - 1] < totalPages) {
      if (range[range.length - 1] < totalPages - 1) rangeWithDots.push("...");
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  // ── Empty state ──────────────────────────────────────────────────────────
  if (displayChunks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center px-6">
        <BookOpen size={40} className="text-gray-200 mb-4" />
        <h3 className="font-semibold text-gray-500 mb-1">{search ? "Không tìm thấy kết quả" : "Chưa có cụm từ nào"}</h3>
        <p className="text-sm text-gray-400 max-w-xs">
          {search
            ? `Thử tìm từ khóa khác cho "${search}"`
            : activeSection === "DUE"
              ? "Chưa có từ nào đến hạn ôn tập hôm nay 🎉"
              : "Chọn một chủ đề và bắt đầu luyện tập để từ vựng xuất hiện ở đây."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* ── Pagination bar (top) ────────────────────────────────────────── */}
      <div className="border-b border-gray-100 bg-white px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
        {/* Left: count info + clear */}
        <div className="flex items-center gap-3">
          <span>
            <span className="font-semibold text-gray-700">
              {startIdx + 1}–{endIdx}
            </span>{" "}
            / {displayChunks.length} cụm từ
            {displayChunks.length < baseChunks.length && ` (lọc từ ${baseChunks.length})`}
          </span>
          {showClearBtn && (
            <button onClick={onClearFilters} className="text-blue-500 hover:underline">
              Xóa bộ lọc
            </button>
          )}
        </div>

        {/* Right: page size + pagination controls */}
        <div className="flex items-center gap-3">
          {/* Page size selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-gray-400">Hiển thị</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value) as PageSize);
                setPage(1);
              }}
              className="text-xs border border-gray-200 rounded-md px-1.5 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {PAGE_SIZE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <span className="text-gray-400">/ trang</span>
          </div>

          {/* Pagination buttons */}
          {totalPages > 1 && (
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setPage(1)}
                disabled={safePage === 1}
                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Trang đầu"
              >
                <ChevronsLeft size={14} />
              </button>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Trang trước"
              >
                <ChevronLeft size={14} />
              </button>

              {getPageNumbers().map((p, i) =>
                p === "..." ? (
                  <span key={`dots-${i}`} className="px-2 text-gray-400">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    className={`min-w-[28px] h-7 px-1.5 rounded text-xs font-semibold transition-colors ${
                      safePage === p ? "bg-blue-600 text-white" : "hover:bg-gray-100 text-gray-600"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Trang sau"
              >
                <ChevronRight size={14} />
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={safePage === totalPages}
                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Trang cuối"
              >
                <ChevronsRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm border-collapse table-fixed">
          <colgroup>
            <col className="w-[22%]" />
            <col className="w-[22%] hidden sm:table-column" />
            <col className="w-[28%] hidden md:table-column" />
            <col className="w-[16%] hidden lg:table-column" />
            <col className="w-[12%]" />
          </colgroup>
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left font-semibold text-gray-500 text-xs uppercase tracking-wide px-4 py-3">
                Cụm từ
              </th>
              <th className="text-left font-semibold text-gray-500 text-xs uppercase tracking-wide px-4 py-3 hidden sm:table-cell">
                Nghĩa tiếng Việt
              </th>
              <th className="text-left font-semibold text-gray-500 text-xs uppercase tracking-wide px-4 py-3 hidden md:table-cell">
                Câu ví dụ
              </th>
              <th className="text-left font-semibold text-gray-500 text-xs uppercase tracking-wide px-4 py-3 hidden lg:table-cell">
                Tiến độ SRS
              </th>
              <th className="text-right font-semibold text-gray-500 text-xs uppercase tracking-wide px-4 py-3">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {pageChunks.map((chunk) => {
              const levelCls = LEVEL_COLOR[chunk.level] ?? "bg-gray-100 text-gray-600 border-gray-200";
              const practiceTopicId = activeSection !== "ALL" && activeSection !== "DUE" ? activeSection : undefined;

              return (
                <tr key={chunk.id} className="hover:bg-blue-50/40 transition-colors">
                  {/* Cụm từ & Level */}
                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-900 leading-snug">{chunk.chunk}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${levelCls}`}>
                          {chunk.level}
                        </span>
                        {chunk.isCustom && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-200">
                            Tự tạo
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-emerald-700 sm:hidden">➜ {chunk.meaning}</p>
                    </div>
                  </td>

                  {/* Nghĩa */}
                  <td className="px-4 py-3 align-top hidden sm:table-cell">
                    <span className="text-emerald-700 font-medium leading-snug">{chunk.meaning}</span>
                  </td>

                  {/* Ví dụ */}
                  <td className="px-4 py-3 align-top hidden md:table-cell">
                    <div className="flex flex-col gap-1">
                      <p className="text-gray-500 italic leading-snug text-[13px] line-clamp-2">
                        &ldquo;{chunk.cleanExample}&rdquo;
                      </p>
                      {chunk.examples && chunk.examples.length > 1 && (
                        <span className="self-start text-[10px] font-medium text-blue-600 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5">
                          +{chunk.examples.length - 1} ví dụ khác
                        </span>
                      )}
                    </div>
                  </td>

                  {/* SRS */}
                  <td className="px-4 py-3 align-top hidden lg:table-cell">
                    <ExplorerSRSBadge chunk={chunk} progressMap={progressMap} now={now} />
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 align-top">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        title="Nghe câu ví dụ"
                        onClick={() => speechService.speak(chunk.cleanExample)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <Volume2 size={15} />
                      </button>
                      {onPracticeChunk && (
                        <button
                          type="button"
                          title="Luyện cụm từ này"
                          onClick={() => onPracticeChunk(chunk, practiceTopicId)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <Play size={15} />
                        </button>
                      )}
                      <button
                        type="button"
                        title="Sửa"
                        onClick={() => onEditChunk(chunk)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        type="button"
                        title="Xóa"
                        onClick={() => {
                          if (window.confirm(`Xóa chunk "${chunk.chunk}"?`)) {
                            onDeleteChunk(chunk.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
