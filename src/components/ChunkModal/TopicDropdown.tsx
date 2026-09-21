"use client";

import React from "react";
import { Check, ChevronDown } from "lucide-react";
import { TopicMeta } from "@/types";

interface TopicDropdownProps {
  topicId: string;
  customTopicName: string;
  existingTopics: TopicMeta[];
  isOpen: boolean;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  currentSelectedTopic: { topicId: string; topicName: string; icon: string };
  onToggle: () => void;
  onSelectTopic: (id: string) => void;
  onCustomTopicNameChange: (val: string) => void;
}

export const TopicDropdown: React.FC<TopicDropdownProps> = ({
  topicId,
  customTopicName,
  existingTopics,
  isOpen,
  dropdownRef,
  currentSelectedTopic,
  onToggle,
  onSelectTopic,
  onCustomTopicNameChange
}) => {
  return (
    <>
      {/* Topic selector row */}
      <div className="notion-property-row">
        <div className="notion-prop-label">
          <span>📁</span>
          <span>Chủ đề</span>
        </div>
        <div className="notion-prop-value" ref={dropdownRef}>
          <div className="notion-custom-select">
            <button type="button" className="notion-select-trigger" onClick={onToggle}>
              <span className="trigger-icon">{currentSelectedTopic.icon}</span>
              <span className="trigger-text">{currentSelectedTopic.topicName}</span>
              <ChevronDown size={14} className="trigger-arrow" />
            </button>

            {isOpen && (
              <div className="notion-dropdown-menu">
                <div
                  className={`notion-menu-item ${topicId === "CUSTOM" ? "selected" : ""}`}
                  onClick={() => onSelectTopic("CUSTOM")}
                >
                  <span className="menu-item-left">
                    <span>⭐</span>
                    <span>Từ vựng tự tạo / Khác</span>
                  </span>
                  {topicId === "CUSTOM" && <Check size={14} className="check-icon" />}
                </div>

                <div className="notion-menu-divider" />

                {existingTopics
                  .filter((t) => t.topicId !== "CUSTOM")
                  .map((t) => (
                    <div
                      key={t.topicId}
                      className={`notion-menu-item ${topicId === t.topicId ? "selected" : ""}`}
                      onClick={() => onSelectTopic(t.topicId)}
                    >
                      <span className="menu-item-left">
                        <span>{t.icon}</span>
                        <span>{t.topicName}</span>
                      </span>
                      {topicId === t.topicId && <Check size={14} className="check-icon" />}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Custom topic name input */}
      {topicId === "CUSTOM" && (
        <div className="notion-property-row">
          <div className="notion-prop-label">
            <span>✏️</span>
            <span>Tên chủ đề riêng</span>
          </div>
          <div className="notion-prop-value">
            <input
              type="text"
              className="notion-inline-input"
              placeholder="Ví dụ: IT Chuyên ngành, Họp Khách Hàng, Du lịch..."
              value={customTopicName}
              onChange={(e) => onCustomTopicNameChange(e.target.value)}
            />
          </div>
        </div>
      )}
    </>
  );
};
