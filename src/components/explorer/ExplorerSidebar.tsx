"use client";

import { TopicMeta, SpeakingChunk } from "@/types";
import { Brain, Clock, Star } from "lucide-react";
import { ExplorerNavItem, SidebarSection } from "./ExplorerNavItem";

export interface ExplorerSidebarProps {
  topics: TopicMeta[];
  chunks: SpeakingChunk[];
  activeSection: SidebarSection;
  studiedCount: number;
  dueCount: number;
  customCount: number;
  onSelect: (id: SidebarSection) => void;
}

export function ExplorerSidebar({
  topics,
  chunks,
  activeSection,
  studiedCount,
  dueCount,
  customCount,
  onSelect
}: ExplorerSidebarProps) {
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
}

