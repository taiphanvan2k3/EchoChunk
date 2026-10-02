"use client";

import { useState } from "react";
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
import { getChunkKind } from "@/lib/shared/chunkClassification";

const LEVEL_COLOR: Record<string, string> = {
  A2: "bg-notion-green-bg text-notion-green-text border-notion-green-border",
  B1: "bg-notion-blue-bg text-notion-blue-text border-notion-blue-border",
  B2: "bg-notion-purple-bg text-notion-purple-text border-notion-purple-border",
  C1: "bg-notion-red-bg text-notion-red-text border-notion-red-border"
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

export function ExplorerChunkTable({
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
}: ExplorerChunkTableProps) {
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
            <button onClick={onClearFilters} className="text-notion-primary hover:underline">
              Xóa bộ lọc
            </button>
          )}
        </div>

        {/* Right: page size + pagination controls */}
        <div className="flex items-center gap-3">
          {/* Page size selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-notion-muted">Hiển thị</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value) as PageSize);
                setPage(1);
              }}
              className="text-xs border border-notion-border rounded-md px-1.5 py-1 bg-notion-surface text-notion-text focus:outline-none focus:ring-1 focus:ring-notion-primary"
            >
              {PAGE_SIZE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <span className="text-notion-muted">/ trang</span>
          </div>

          {/* Pagination buttons */}
          {totalPages > 1 && (
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setPage(1)}
                disabled={safePage === 1}
                className="p-1.5 rounded hover:bg-notion-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Trang đầu"
              >
                <ChevronsLeft size={14} />
              </button>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="p-1.5 rounded hover:bg-notion-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Trang trước"
              >
                <ChevronLeft size={14} />
              </button>

              {getPageNumbers().map((p, i) =>
                p === "..." ? (
                  <span key={`dots-${i}`} className="px-2 text-notion-muted">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    className={`min-w-[28px] h-7 px-1.5 rounded text-xs font-semibold transition-colors ${
                      safePage === p ? "bg-notion-primary text-white" : "hover:bg-notion-hover text-notion-secondary"
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
              <th className="text-left font-semibold text-notion-muted text-xs uppercase tracking-wide px-4 py-3 hidden lg:table-cell">
                Tiến độ SRS
              </th>
              <th className="text-right font-semibold text-notion-muted text-xs uppercase tracking-wide px-4 py-3">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-notion-border bg-notion-surface">
            {pageChunks.map((chunk) => {
              const levelCls = LEVEL_COLOR[chunk.level] ?? "bg-notion-hover text-notion-secondary border-notion-border";
              const practiceTopicId = activeSection !== "ALL" && activeSection !== "DUE" ? activeSection : undefined;

              return (
                <tr key={chunk.id} className="hover:bg-notion-hover transition-colors">
                  {/* Cụm từ & Level */}
                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-notion-text leading-snug">{chunk.chunk}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${levelCls}`}>
                          {chunk.level}
                        </span>
                        {(() => {
                          const kind = getChunkKind(chunk);
                          if (kind === "USER_CREATED") {
                            return (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border bg-notion-yellow-bg text-notion-yellow-text border-notion-yellow-border">
                                Tự tạo
                              </span>
                            );
                          }
                          if (kind === "USER_EDITED") {
                            return (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border bg-notion-blue-bg text-notion-blue-text border-notion-blue-border">
                                Đã tùy chỉnh
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      <p className="text-xs text-notion-green-text sm:hidden">➜ {chunk.meaning}</p>
                    </div>
                  </td>

                  {/* Nghĩa */}
                  <td className="px-4 py-3 align-top hidden sm:table-cell">
                    <span className="text-notion-green-text font-medium leading-snug">{chunk.meaning}</span>
                  </td>

                  {/* Ví dụ */}
                  <td className="px-4 py-3 align-top hidden md:table-cell">
                    <div className="flex flex-col gap-1">
                      <p className="text-notion-secondary italic leading-snug text-[13px] line-clamp-2">
                        &ldquo;{chunk.cleanExample}&rdquo;
                      </p>
                      {chunk.examples && chunk.examples.length > 1 && (
                        <span className="self-start text-[10px] font-medium text-notion-blue-text bg-notion-blue-bg border border-notion-blue-border rounded px-1.5 py-0.5">
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
                        className="p-1.5 rounded-lg text-notion-muted hover:text-notion-primary hover:bg-notion-hover transition-colors"
                      >
                        <Volume2 size={15} />
                      </button>
                      {onPracticeChunk && (
                        <button
                          type="button"
                          title="Luyện cụm từ này"
                          onClick={() => onPracticeChunk(chunk, practiceTopicId)}
                          className="p-1.5 rounded-lg text-notion-muted hover:text-notion-primary hover:bg-notion-hover transition-colors"
                        >
                          <Play size={15} />
                        </button>
                      )}
                      <button
                        type="button"
                        title="Sửa"
                        onClick={() => onEditChunk(chunk)}
                        className="p-1.5 rounded-lg text-notion-muted hover:text-notion-yellow-text hover:bg-notion-hover transition-colors"
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
                        className="p-1.5 rounded-lg text-notion-muted hover:text-notion-red-text hover:bg-notion-hover transition-colors"
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
}
