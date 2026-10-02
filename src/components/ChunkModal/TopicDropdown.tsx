"use client";

import { RefObject } from "react";
import { Check, ChevronDown } from "lucide-react";
import { TopicMeta } from "@/types";

interface TopicDropdownProps {
  topicId: string;
  existingTopics: TopicMeta[];
  isOpen: boolean;
  dropdownRef: RefObject<HTMLDivElement | null>;
  currentSelectedTopic: { topicId: string; topicName: string; icon: string };
  onToggle: () => void;
  onSelectTopic: (id: string) => void;
}

export function TopicDropdown({
  topicId,
  existingTopics,
  isOpen,
  dropdownRef,
  currentSelectedTopic,
  onToggle,
  onSelectTopic
}: TopicDropdownProps) {
  return (
    <div className="flex flex-col sm:grid sm:grid-cols-[170px_1fr] sm:items-center gap-1 sm:gap-3">
      <div className="text-[0.78rem] sm:text-[0.82rem] text-notion-secondary flex items-center gap-1.5 font-semibold select-none whitespace-nowrap shrink-0">
        <span>📁</span>
        <span>Chủ đề</span>
      </div>
      <div className="flex items-center w-full" ref={dropdownRef}>
        <div className="relative w-full">
          <button
            type="button"
            className="w-full inline-flex items-center justify-between gap-2 py-2 px-3 bg-gray-50/80 hover:bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-800 cursor-pointer transition-all select-none"
            onClick={onToggle}
          >
            <span className="flex items-center gap-2 truncate">
              <span>{currentSelectedTopic.icon}</span>
              <span className="font-medium text-gray-900 truncate">{currentSelectedTopic.topicName}</span>
            </span>
            <ChevronDown size={14} className="text-gray-400 shrink-0 ml-1" />
          </button>

          {isOpen && (
            <div className="absolute top-[calc(100%+4px)] left-0 min-w-[290px] max-h-[270px] overflow-y-auto bg-white border border-notion-border-medium rounded-[8px] shadow-[0_10px_28px_rgba(0,0,0,0.14)] z-[500] p-1.5 scrollbar-thin">
              <div
                className={`flex items-center justify-between py-1.5 px-2.5 rounded-md text-[0.85rem] cursor-pointer transition-colors ${
                  topicId === "CUSTOM" ? "bg-notion-blue-bg text-notion-blue-text font-semibold" : "text-notion-text hover:bg-notion-hover"
                }`}
                onClick={() => onSelectTopic("CUSTOM")}
              >
                <span className="flex items-center gap-2">
                  <span>⭐</span>
                  <span>Từ vựng của tôi</span>
                </span>
                {topicId === "CUSTOM" && <Check size={14} className="text-notion-blue-text" />}
              </div>

              <div className="h-px bg-notion-border my-1" />

              {existingTopics
                .filter((t) => t.topicId !== "CUSTOM" && t.topicId !== "STUDIED" && t.topicId !== "ALL")
                .map((t) => (
                  <div
                    key={t.topicId}
                    className={`flex items-center justify-between py-1.5 px-2.5 rounded-md text-[0.85rem] cursor-pointer transition-colors ${
                      topicId === t.topicId ? "bg-notion-blue-bg text-notion-blue-text font-semibold" : "text-notion-text hover:bg-notion-hover"
                    }`}
                    onClick={() => onSelectTopic(t.topicId)}
                  >
                    <span className="flex items-center gap-2">
                      <span>{t.icon}</span>
                      <span>{t.topicName}</span>
                    </span>
                    {topicId === t.topicId && <Check size={14} className="text-notion-blue-text" />}
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
