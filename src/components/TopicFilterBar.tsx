import { useRef, useState, useEffect, useCallback, WheelEvent } from 'react';
import { soundManager } from '@/lib/client/sound';
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

export function TopicFilterBar({
  topics,
  selectedTopicId,
  onSelectTopic,
  selectedLevel,
  onSelectLevel,
  searchQuery,
  onSearchChange,
  totalChunksCount,
}: TopicFilterBarProps) {
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
  const handleWheel = (e: WheelEvent) => {
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

  const getLevelColorClass = (lvlId: string, isActive: boolean) => {
    if (!isActive) return 'text-notion-secondary hover:text-notion-text';
    switch (lvlId) {
      case 'A2':
        return 'bg-white text-notion-green-text font-bold shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)]';
      case 'B1':
        return 'bg-white text-notion-blue-text font-bold shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)]';
      case 'B2':
        return 'bg-white text-notion-purple-text font-bold shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)]';
      default:
        return 'bg-white text-notion-text font-bold shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)]';
    }
  };

  return (
    <div className="mb-4 sm:mb-5 flex flex-col gap-2.5 sm:gap-3 w-full">
      {/* Search and Level Controls Row */}
      <div className="flex items-center gap-1.5 sm:gap-2 w-full">
        {/* Clean Notion Search Box */}
        <div className="flex-1 min-w-0 relative flex items-center">
          <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 absolute left-2.5 sm:left-3 text-notion-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm theo cụm từ, nghĩa tiếng Việt, câu ví dụ..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full py-1 sm:py-1.5 pl-8 sm:pl-9 pr-7 sm:pr-8 bg-white border border-notion-border-medium rounded-lg text-xs sm:text-[0.84rem] text-notion-text placeholder-notion-muted outline-none transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)] focus:border-notion-primary focus:ring-2 focus:ring-notion-primary/15"
          />
          {searchQuery && (
            <button
              type="button"
              className="absolute right-2 bg-transparent border-none text-notion-muted hover:text-notion-text hover:bg-notion-hover text-sm sm:text-base cursor-pointer leading-none px-1 py-0.5 rounded"
              onClick={() => onSearchChange('')}
              title="Xóa tìm kiếm"
            >
              ×
            </button>
          )}
        </div>

        {/* Premium Notion-style Segmented Level Switcher */}
        <div className="inline-flex items-center bg-notion-hover p-[2px] rounded-lg border border-notion-border gap-0.5 shrink-0 select-none" role="group" aria-label="Lọc theo cấp độ CEFR">
          {levelOptions.map((lvl) => (
            <button
              key={lvl.id}
              type="button"
              className={`border-none bg-transparent py-0.5 px-1.5 sm:py-1 sm:px-2.5 rounded-md text-[0.7rem] sm:text-[0.78rem] font-semibold cursor-pointer transition-all whitespace-nowrap ${getLevelColorClass(
                lvl.id,
                selectedLevel === lvl.id
              )}`}
              onClick={() => onSelectLevel(lvl.id)}
            >
              {lvl.label}
            </button>
          ))}
        </div>
      </div>

      {/* Horizontal Scroll Topics Row with Navigation Controls */}
      <div className="relative w-full flex items-center">
        {canScrollLeft && (
          <button
            type="button"
            className="absolute -left-2.5 sm:-left-3 z-10 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white border border-notion-border-medium text-notion-secondary hover:text-notion-text hover:bg-notion-surface flex items-center justify-center cursor-pointer shadow-[0_2px_6px_rgba(0,0,0,0.08)] hover:shadow-[0_3px_8px_rgba(0,0,0,0.12)] hover:scale-105 transition-all"
            onClick={() => handleScroll('left')}
            title="Cuộn sang trái"
          >
            <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        )}

        <div
          ref={scrollRef}
          onScroll={checkScrollBounds}
          onWheel={handleWheel}
          className="flex gap-1 sm:gap-1.5 overflow-x-auto scroll-smooth py-0.5 sm:py-1 px-0.5 w-full items-center [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <button
            type="button"
            className={`inline-flex items-center gap-1 sm:gap-1.5 py-1 sm:py-1.5 px-2.5 sm:px-3 rounded-full text-[0.74rem] sm:text-[0.8rem] font-medium whitespace-nowrap cursor-pointer transition-all select-none border shadow-[0_1px_2px_rgba(0,0,0,0.02)] ${
              selectedTopicId === 'ALL'
                ? 'bg-notion-blue-bg border-notion-primary text-notion-blue-text font-semibold shadow-[0_1px_3px_rgba(35,131,226,0.15)]'
                : 'bg-white border-notion-border text-notion-secondary hover:bg-notion-surface-subtle hover:text-notion-text hover:border-notion-border-medium'
            }`}
            onClick={() => onSelectTopic('ALL')}
          >
            <span className="text-[0.82rem] sm:text-[0.92rem] leading-none">✨</span>
            <span>Tất cả chủ đề</span>
            <span
              className={`text-[0.62rem] sm:text-[0.68rem] font-bold py-0.2 px-1.5 rounded-full leading-tight ${
                selectedTopicId === 'ALL'
                  ? 'bg-notion-blue-bg text-notion-blue-text'
                  : 'bg-notion-hover text-notion-secondary'
              }`}
            >
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
              className={`inline-flex items-center gap-1 sm:gap-1.5 py-1 sm:py-1.5 px-2.5 sm:px-3 rounded-full text-[0.74rem] sm:text-[0.8rem] font-medium whitespace-nowrap cursor-pointer transition-all select-none border shadow-[0_1px_2px_rgba(0,0,0,0.02)] ${
                selectedTopicId === t.topicId
                  ? 'bg-notion-blue-bg border-notion-primary text-notion-blue-text font-semibold shadow-[0_1px_3px_rgba(35,131,226,0.15)]'
                  : 'bg-white border-notion-border text-notion-secondary hover:bg-notion-surface-subtle hover:text-notion-text hover:border-notion-border-medium'
              }`}
              onClick={() => onSelectTopic(t.topicId)}
            >
              <span className="text-[0.82rem] sm:text-[0.92rem] leading-none">{t.icon}</span>
              <span>{t.topicName}</span>
              <span
                className={`text-[0.62rem] sm:text-[0.68rem] font-bold py-0.2 px-1.5 rounded-full leading-tight ${
                  selectedTopicId === t.topicId
                    ? 'bg-notion-blue-bg text-notion-blue-text'
                    : 'bg-notion-hover text-notion-secondary'
                }`}
              >
                {t.chunkCount}
              </span>
            </button>
          ))}
        </div>

        {canScrollRight && (
          <button
            type="button"
            className="absolute -right-2.5 sm:-right-3 z-10 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white border border-notion-border-medium text-notion-secondary hover:text-notion-text hover:bg-notion-surface flex items-center justify-center cursor-pointer shadow-[0_2px_6px_rgba(0,0,0,0.08)] hover:shadow-[0_3px_8px_rgba(0,0,0,0.12)] hover:scale-105 transition-all"
            onClick={() => handleScroll('right')}
            title="Cuộn sang phải"
          >
            <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
