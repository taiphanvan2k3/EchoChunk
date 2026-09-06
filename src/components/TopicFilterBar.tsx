'use client';

import React from 'react';
import { TopicMeta } from '@/types';
import { Search, Shuffle, Plus } from 'lucide-react';

interface TopicFilterBarProps {
  topics: TopicMeta[];
  selectedTopicId: string;
  onSelectTopic: (topicId: string) => void;
  selectedLevel: string;
  onSelectLevel: (level: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onShuffle: () => void;
  totalFiltered: number;
  onOpenAddChunk?: () => void;
}

export const TopicFilterBar: React.FC<TopicFilterBarProps> = ({
  topics,
  selectedTopicId,
  onSelectTopic,
  selectedLevel,
  onSelectLevel,
  searchQuery,
  onSearchChange,
  onShuffle,
  totalFiltered,
  onOpenAddChunk,
}) => {
  return (
    <div className="filter-bar-wrapper">
      {/* Search and Level Controls */}
      <div className="filter-top-row">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Tìm theo cụm từ, nghĩa tiếng Việt, hoặc từ khóa IT..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button className="clear-search" onClick={() => onSearchChange('')}>
              ×
            </button>
          )}
        </div>

        <div className="level-pills">
          {['ALL', 'A2', 'B1', 'B2'].map((lvl) => (
            <button
              key={lvl}
              className={`pill-btn ${selectedLevel === lvl ? 'active' : ''}`}
              onClick={() => onSelectLevel(lvl)}
            >
              {lvl}
            </button>
          ))}
        </div>

        <button className="action-btn shuffle-btn" onClick={onShuffle} title="Xáo trộn danh sách chunks">
          <Shuffle size={16} />
          <span>Xáo trộn ({totalFiltered})</span>
        </button>

        {onOpenAddChunk && (
          <button className="action-btn add-inline-btn" onClick={onOpenAddChunk} title="Thêm chunk mới">
            <Plus size={16} />
            <span>Thêm mới</span>
          </button>
        )}
      </div>

      {/* Horizontal Scroll Topics */}
      <div className="topics-scroll-row">
        <button
          className={`topic-pill ${selectedTopicId === 'ALL' ? 'active' : ''}`}
          onClick={() => onSelectTopic('ALL')}
        >
          ✨ Tất cả chủ đề ({topics.reduce((acc, t) => acc + t.chunkCount, 0)})
        </button>

        {topics.map((t) => (
          <button
            key={t.topicId}
            className={`topic-pill ${selectedTopicId === t.topicId ? 'active' : ''}`}
            onClick={() => onSelectTopic(t.topicId)}
          >
            <span className="topic-emoji">{t.icon}</span>
            <span className="topic-name">{t.topicName}</span>
            <span className="topic-count">{t.chunkCount}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
