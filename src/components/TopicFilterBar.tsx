'use client';

import { soundManager } from '@/lib/client/sound';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { TopicMeta } from '@/types';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

interface TopicFilterBarProps {
  topics: TopicMeta[];
  selectedTopicId: string;
  onSelectTopic: (topicId: string) => void;
  selectedLevel: string;
  onSelectLevel: (level: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenAddChunk?: () => void;
  totalChunksCount?: number;
}

export const TopicFilterBar: React.FC<TopicFilterBarProps> = ({
  topics,
  selectedTopicId,
  onSelectTopic,
  selectedLevel,
  onSelectLevel,
  searchQuery,
  onSearchChange,
  totalChunksCount,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Check scroll bounds to show/hide navigation arrows and fade masks
  const checkScrollBounds = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 5);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5);
  }, []);

  useEffect(() => {
    checkScrollBounds();
    window.addEventListener('resize', checkScrollBounds);
    return () => window.removeEventListener('resize', checkScrollBounds);
  }, [checkScrollBounds, topics]);

  const handleScroll = (direction: 'left' | 'right') => {
    soundManager.playClick();
    if (!scrollRef.current) return;
    const scrollAmount = 280;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
    setTimeout(checkScrollBounds, 300);
  };

  // Enable mouse wheel horizontal scrolling
  const handleWheel = (e: React.WheelEvent) => {
    if (scrollRef.current && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      scrollRef.current.scrollLeft += e.deltaY;
      checkScrollBounds();
    }
  };

  const levelOptions = [
    { id: 'ALL', label: 'Tất cả' },
    { id: 'A2', label: 'A2' },
    { id: 'B1', label: 'B1' },
    { id: 'B2', label: 'B2' },
  ];

  return (
    <div className="filter-bar-wrapper">
      {/* Search and Level Controls Row */}
      <div className="filter-top-row">
        {/* Clean Notion Search Box */}
        <div className="search-box">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            placeholder="Tìm theo cụm từ, nghĩa tiếng Việt, câu ví dụ..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button className="clear-search" onClick={() => onSearchChange('')} title="Xóa tìm kiếm">
              ×
            </button>
          )}
        </div>

        {/* Premium Notion-style Segmented Level Switcher */}
        <div className="notion-segmented-control" role="group" aria-label="Lọc theo cấp độ CEFR">
          {levelOptions.map((lvl) => (
            <button
              key={lvl.id}
              type="button"
              className={`segmented-tab ${selectedLevel === lvl.id ? 'active' : ''} tab-${lvl.id.toLowerCase()}`}
              onClick={() => onSelectLevel(lvl.id)}
            >
              {lvl.label}
            </button>
          ))}
        </div>


      </div>

      {/* Horizontal Scroll Topics Row with Navigation Controls */}
      <div className="topics-carousel-container">
        {canScrollLeft && (
          <button
            type="button"
            className="carousel-arrow-btn arrow-left"
            onClick={() => handleScroll('left')}
            title="Cuộn sang trái"
          >
            <ChevronLeft size={16} />
          </button>
        )}

        <div
          ref={scrollRef}
          onScroll={checkScrollBounds}
          onWheel={handleWheel}
          className="topics-scroll-row"
        >
          <button
            type="button"
            className={`topic-pill ${selectedTopicId === 'ALL' ? 'active' : ''}`}
            onClick={() => onSelectTopic('ALL')}
          >
            <span className="topic-emoji">✨</span>
            <span className="topic-name">Tất cả chủ đề</span>
            <span className="topic-count">
              {totalChunksCount !== undefined
                ? totalChunksCount
                : topics
                    .filter((t) => t.topicId !== 'STUDIED' && t.topicId !== 'ALL')
                    .reduce((acc, t) => acc + t.chunkCount, 0)}
            </span>
          </button>

          {topics.map((t) => (
            <button
              key={t.topicId}
              type="button"
              className={`topic-pill ${selectedTopicId === t.topicId ? 'active' : ''}`}
              onClick={() => onSelectTopic(t.topicId)}
            >
              <span className="topic-emoji">{t.icon}</span>
              <span className="topic-name">{t.topicName}</span>
              <span className="topic-count">{t.chunkCount}</span>
            </button>
          ))}
        </div>

        {canScrollRight && (
          <button
            type="button"
            className="carousel-arrow-btn arrow-right"
            onClick={() => handleScroll('right')}
            title="Cuộn sang phải"
          >
            <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
};
