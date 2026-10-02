'use client';

import { Mic, Edit3, MessageSquare, BookOpen } from 'lucide-react';

interface PracticeModeCardsProps {
  completedCount: number;
  totalCount: number;
  isLoading?: boolean;
  onSelectMode?: (mode: 'shadowing' | 'dictation' | 'aitalk' | 'vocab') => void;
}

export function PracticeModeCards({
  completedCount,
  totalCount,
  isLoading = false,
  onSelectMode,
}: PracticeModeCardsProps) {
  return (
    <div className="bg-notion-surface border border-notion-border rounded-xl p-5 md:px-6 shadow-sm">
      <div className="text-center mb-4">
        <h3 className="text-base font-bold text-notion-text mb-1">Choose a practice mode</h3>
        <p className="text-[0.8rem] text-notion-secondary">Each mode opens a focused practice room.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* 1. Shadowing */}
        <div
          className={`bg-notion-surface rounded-[10px] py-[0.85rem] px-2.5 flex flex-col items-center text-center gap-1.5 cursor-pointer transition-all duration-200 border border-notion-blue-border hover:bg-notion-blue-bg hover:shadow-md hover:-translate-y-0.5 ${
            isLoading ? "opacity-75 cursor-wait" : ""
          }`}
          onClick={() => !isLoading && onSelectMode?.('shadowing')}
        >
          <div>
            <Mic size={22} className="text-notion-blue-text" />
          </div>
          <div>
            <h4 className="text-[0.85rem] font-bold text-notion-text">Shadowing</h4>
            <p className="text-[0.72rem] text-notion-secondary leading-[1.35] line-clamp-2">Listen and repeat each sentence</p>
          </div>
          <div className="text-[0.72rem] font-semibold py-[0.2rem] px-[0.55rem] rounded-full mt-1 min-w-[42px] flex items-center justify-center bg-notion-blue-bg text-notion-blue-text">
            {isLoading ? (
              <span className="inline-block w-7 h-3 rounded bg-notion-blue/30 animate-pulse" />
            ) : (
              `${completedCount}/${totalCount}`
            )}
          </div>
        </div>

        {/* 2. Dictation */}
        <div
          className={`bg-notion-surface rounded-[10px] py-[0.85rem] px-2.5 flex flex-col items-center text-center gap-1.5 cursor-pointer transition-all duration-200 border border-notion-yellow-border hover:bg-notion-yellow-bg hover:shadow-md hover:-translate-y-0.5 ${
            isLoading ? "opacity-75 cursor-wait" : ""
          }`}
          onClick={() => !isLoading && onSelectMode?.('dictation')}
        >
          <div>
            <Edit3 size={22} className="text-notion-yellow-text" />
          </div>
          <div>
            <h4 className="text-[0.85rem] font-bold text-notion-text">Dictation</h4>
            <p className="text-[0.72rem] text-notion-secondary leading-[1.35] line-clamp-2">Listen and type what you hear</p>
          </div>
          <div className="text-[0.72rem] font-semibold py-[0.2rem] px-[0.55rem] rounded-full mt-1 min-w-[42px] flex items-center justify-center bg-notion-yellow-bg text-notion-yellow-text">
            {isLoading ? (
              <span className="inline-block w-7 h-3 rounded bg-notion-yellow/30 animate-pulse" />
            ) : (
              `0/${totalCount}`
            )}
          </div>
        </div>

        {/* 3. AI Talk */}
        <div
          className="bg-notion-surface rounded-[10px] py-[0.85rem] px-2.5 flex flex-col items-center text-center gap-1.5 cursor-pointer transition-all duration-200 border border-notion-green-border hover:bg-notion-green-bg hover:shadow-md hover:-translate-y-0.5"
          onClick={() => onSelectMode?.('aitalk')}
        >
          <div>
            <MessageSquare size={22} className="text-notion-green-text" />
          </div>
          <div>
            <h4 className="text-[0.85rem] font-bold text-notion-text">AI Talk</h4>
            <p className="text-[0.72rem] text-notion-secondary leading-[1.35] line-clamp-2">Discuss the video with an AI tutor</p>
          </div>
          <div className="text-[0.72rem] font-semibold py-[0.2rem] px-[0.55rem] rounded-full mt-1 min-w-[42px] flex items-center justify-center bg-notion-green-bg text-notion-green-text">
            Soon
          </div>
        </div>

        {/* 4. Vocabulary */}
        <div
          className="bg-notion-surface rounded-[10px] py-[0.85rem] px-2.5 flex flex-col items-center text-center gap-1.5 cursor-pointer transition-all duration-200 border border-notion-purple-border hover:bg-notion-purple-bg hover:shadow-md hover:-translate-y-0.5"
          onClick={() => onSelectMode?.('vocab')}
        >
          <div>
            <BookOpen size={22} className="text-notion-purple-text" />
          </div>
          <div>
            <h4 className="text-[0.85rem] font-bold text-notion-text">Vocabulary</h4>
            <p className="text-[0.72rem] text-notion-secondary leading-[1.35] line-clamp-2">Study the key speaking chunks</p>
          </div>
          <div className="text-[0.72rem] font-semibold py-[0.2rem] px-[0.55rem] rounded-full mt-1 min-w-[42px] flex items-center justify-center bg-notion-purple-bg text-notion-purple-text">
            Soon
          </div>
        </div>
      </div>
    </div>
  );
}
