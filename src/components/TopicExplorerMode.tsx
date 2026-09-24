"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { SpeakingChunk, TopicMeta, ChunkProgress } from "@/types";
import { soundManager } from "@/lib/client/sound";
import { Play, Plus, Search, X, Menu } from "lucide-react";
import { SidebarSection } from "./explorer/ExplorerNavItem";
import { ExplorerSidebarShell } from "./explorer/ExplorerSidebar";
import { ExplorerChunkTable } from "./explorer/ExplorerChunkTable";

export type SRSFilter = "ALL" | "DUE" | "LEARNING" | "MASTERED";

interface TopicExplorerModeProps {
  topics: TopicMeta[];
  chunks: SpeakingChunk[];
  progressMap: Record<string, ChunkProgress>;
  onStartPracticeTopic: (topicId: string) => void;
  onPracticeChunk?: (chunk: SpeakingChunk, topicIdOverride?: string) => void;
  onOpenAddChunk: () => void;
  onEditChunk: (chunk: SpeakingChunk) => void;
  onDeleteChunk: (chunkId: string) => void;
}

export const TopicExplorerMode: React.FC<TopicExplorerModeProps> = ({
  topics,
  chunks,
  progressMap,
  onStartPracticeTopic,
  onPracticeChunk,
  onOpenAddChunk,
  onEditChunk,
  onDeleteChunk
}) => {
  const [now] = useState(() => Date.now());
  const [activeSection, setActiveSection] = useState<SidebarSection>("ALL");
  const [srsFilter, setSrsFilter] = useState<SRSFilter>("ALL");
  const [search, setSearch] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // ─── Computed data ────────────────────────────────────────────────────────
  const studiedChunks = useMemo(
    () => chunks.filter((c) => progressMap[c.id] && progressMap[c.id].repetitions > 0),
    [chunks, progressMap]
  );
  const dueChunks = useMemo(
    () => studiedChunks.filter((c) => new Date(progressMap[c.id]?.dueDate || "").getTime() <= now),
    [studiedChunks, progressMap, now]
  );
  const customChunks = useMemo(() => chunks.filter((c) => c.isCustom || c.topicId === "CUSTOM"), [chunks]);

  const baseChunks = useMemo(() => {
    if (activeSection === "ALL") return studiedChunks;
    if (activeSection === "DUE") return dueChunks;
    if (activeSection === "CUSTOM") return customChunks;
    return chunks.filter((c) => c.topicId === activeSection);
  }, [activeSection, chunks, studiedChunks, dueChunks, customChunks]);

  const srsFiltered = useMemo(() => {
    if (activeSection !== "ALL") return baseChunks;
    if (srsFilter === "ALL") return baseChunks;
    if (srsFilter === "DUE")
      return baseChunks.filter((c) => {
        const p = progressMap[c.id];
        return p && new Date(p.dueDate).getTime() <= now;
      });
    if (srsFilter === "MASTERED")
      return baseChunks.filter((c) => {
        const p = progressMap[c.id];
        return p && p.repetitions >= 3 && (p.bestAccuracy >= 80 || p.confidenceScore >= 3);
      });
    if (srsFilter === "LEARNING")
      return baseChunks.filter((c) => {
        const p = progressMap[c.id];
        return p && (p.repetitions < 3 || (p.bestAccuracy < 80 && p.confidenceScore < 3));
      });
    return baseChunks;
  }, [baseChunks, srsFilter, progressMap, now, activeSection]);

  const displayChunks = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return srsFiltered;
    return srsFiltered.filter(
      (c) =>
        c.chunk.toLowerCase().includes(q) ||
        c.meaning.toLowerCase().includes(q) ||
        c.cleanExample.toLowerCase().includes(q)
    );
  }, [srsFiltered, search]);

  // ─── Section metadata ─────────────────────────────────────────────────────
  const sectionLabel = useMemo(() => {
    if (activeSection === "ALL") return "Từ vựng đã học (SRS)";
    if (activeSection === "DUE") return "Cần ôn hôm nay";
    if (activeSection === "CUSTOM") return "Từ vựng của tôi";
    return topics.find((t) => t.topicId === activeSection)?.topicName ?? "Chủ đề";
  }, [activeSection, topics]);

  const sectionIcon = useMemo(() => {
    if (activeSection === "ALL") return "🧠";
    if (activeSection === "DUE") return "🔥";
    if (activeSection === "CUSTOM") return "⭐";
    return topics.find((t) => t.topicId === activeSection)?.icon ?? "📚";
  }, [activeSection, topics]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleSelectSection = (section: SidebarSection) => {
    soundManager.playClick();
    setActiveSection(section);
    setSrsFilter("ALL");
    setSearch("");
    setIsMobileMenuOpen(false);
  };

  const handleClearFilters = () => {
    setSearch("");
    setSrsFilter("ALL");
    searchRef.current?.focus();
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".mobile-sidebar-panel") && !target.closest(".mobile-menu-toggle")) {
        setIsMobileMenuOpen(false);
      }
    };
    if (isMobileMenuOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isMobileMenuOpen]);

  const SRS_FILTER_LABELS: Record<SRSFilter, string> = {
    ALL: "Tất cả",
    DUE: "Cần ôn",
    LEARNING: "Đang học",
    MASTERED: "Thành thạo"
  };

  return (
    <div className="explorer-fullwidth-wrapper">
      <div className="flex flex-col h-full min-h-screen bg-gray-50">
        {/* ── Top header bar ── */}
        <div className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between gap-3">
          <button
            type="button"
            className="mobile-menu-toggle lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-500"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-xl leading-none">{sectionIcon}</span>
            <div className="min-w-0">
              <h2 className="font-bold text-gray-900 text-base truncate">{sectionLabel}</h2>
              <p className="text-xs text-gray-400">
                {displayChunks.length} cụm từ
                {search && " · kết quả tìm kiếm"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => onStartPracticeTopic(activeSection)}
              className="hidden sm:inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-3 py-2 rounded-lg transition-colors"
            >
              <Play size={14} /> Luyện tập
            </button>
            <button
              type="button"
              onClick={onOpenAddChunk}
              className="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold px-3 py-2 rounded-lg transition-colors"
            >
              <Plus size={14} />
              <span className="hidden sm:inline">Thêm Chunk</span>
            </button>
          </div>
        </div>

        {/* ── Body: sidebar + main ── */}
        <div className="flex flex-1 min-h-0 relative">
          <ExplorerSidebarShell
            topics={topics}
            chunks={chunks}
            activeSection={activeSection}
            studiedCount={studiedChunks.length}
            dueCount={dueChunks.length}
            customCount={customChunks.length}
            totalChunks={chunks.length}
            isMobileOpen={isMobileMenuOpen}
            onCloseMobile={() => setIsMobileMenuOpen(false)}
            onSelect={handleSelectSection}
          />

          {/* ── Main content ── */}
          <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Search & filter bar */}
            <div className="bg-white border-b border-gray-100 px-4 py-3 flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-48">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Tìm cụm từ, nghĩa, ví dụ..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-9 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* SRS filter tabs — only for "Từ đã học" section */}
              {activeSection === "ALL" && (
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 flex-shrink-0">
                  {(["ALL", "DUE", "LEARNING", "MASTERED"] as SRSFilter[]).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => {
                        soundManager.playClick();
                        setSrsFilter(f);
                      }}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-all ${
                        srsFilter === f ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {SRS_FILTER_LABELS[f]}
                    </button>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => onStartPracticeTopic(activeSection)}
                className="sm:hidden inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-3 py-2 rounded-lg"
              >
                <Play size={14} /> Luyện
              </button>
            </div>

            {/* Table */}
            <ExplorerChunkTable
              key={`${activeSection}|${search}|${srsFilter}`}
              displayChunks={displayChunks}
              baseChunks={baseChunks}
              progressMap={progressMap}
              now={now}
              search={search}
              activeSection={activeSection}
              onPracticeChunk={onPracticeChunk}
              onEditChunk={onEditChunk}
              onDeleteChunk={onDeleteChunk}
              onClearFilters={handleClearFilters}
              showClearBtn={!!search || srsFilter !== "ALL"}
            />
          </main>
        </div>
      </div>
    </div>
  );
};
