"use client";

import React from "react";
import { TopicMeta, SpeakingChunk } from "@/types";
import { Brain, Clock, Star, BookOpen } from "lucide-react";
import { ExplorerNavItem, SidebarSection } from "./ExplorerNavItem";

interface ExplorerSidebarProps {
  topics: TopicMeta[];
  chunks: SpeakingChunk[];
  activeSection: SidebarSection;
  studiedCount: number;
  dueCount: number;
  customCount: number;
  onSelect: (id: SidebarSection) => void;
}

export const ExplorerSidebar: React.FC<ExplorerSidebarProps> = ({
  topics,
  chunks,
  activeSection,
  studiedCount,
  dueCount,
  customCount,
  onSelect
}) => {
  const regularTopics = topics.filter((t) => t.topicId !== "CUSTOM" && t.topicId !== "STUDIED");

  return (
    <div className="flex flex-col gap-5 p-3">
      {/* Personal section */}
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-3 mb-1.5">Của tôi</p>
        <div className="flex flex-col gap-0.5">
          <ExplorerNavItem
            id="ALL"
            icon={<Brain size={16} />}
            label="Từ vựng đã học"
            count={studiedCount}
            activeSection={activeSection}
            onSelect={onSelect}
          />
          <ExplorerNavItem
            id="DUE"
            icon={<Clock size={16} />}
            label="Cần ôn hôm nay"
            count={dueCount}
            activeSection={activeSection}
            onSelect={onSelect}
            badge={
              dueCount > 0 ? (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse flex-shrink-0" />
              ) : undefined
            }
          />
          <ExplorerNavItem
            id="CUSTOM"
            icon={<Star size={16} />}
            label="Từ của tôi"
            count={customCount}
            activeSection={activeSection}
            onSelect={onSelect}
          />
        </div>
      </div>

      {/* Topics section */}
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-3 mb-1.5">Chủ đề bài học</p>
        <div className="flex flex-col gap-0.5">
          {regularTopics.map((topic) => {
            const topicChunkCount = chunks.filter((c) => c.topicId === topic.topicId).length;
            return (
              <ExplorerNavItem
                key={topic.topicId}
                id={topic.topicId}
                icon={<span className="text-base leading-none">{topic.icon}</span>}
                label={topic.topicName}
                count={topicChunkCount}
                activeSection={activeSection}
                onSelect={onSelect}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface ExplorerSidebarShellProps extends ExplorerSidebarProps {
  totalChunks: number;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const ExplorerSidebarShell: React.FC<ExplorerSidebarShellProps> = ({
  totalChunks,
  isMobileOpen,
  onCloseMobile,
  ...sidebarProps
}) => {
  return (
    <>
      {/* Mobile drawer overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={onCloseMobile} />
          <div className="mobile-sidebar-panel absolute left-0 top-0 bottom-0 w-72 bg-white shadow-xl overflow-y-auto">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <span className="font-bold text-gray-800 text-sm">📚 Kho Từ Vựng</span>
              <button onClick={onCloseMobile} className="p-1 rounded hover:bg-gray-100">
                <BookOpen size={18} className="text-gray-500" />
              </button>
            </div>
            <ExplorerSidebar {...sidebarProps} />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 xl:w-64 flex-shrink-0 border-r border-gray-200 bg-white overflow-y-auto">
        <div className="px-4 pt-4 pb-2">
          <p className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
            <BookOpen size={13} className="text-blue-500" />
            Kho Từ Vựng · {totalChunks} cụm
          </p>
        </div>
        <ExplorerSidebar {...sidebarProps} />
      </aside>
    </>
  );
};
