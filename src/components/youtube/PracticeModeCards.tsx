'use client';

import React from 'react';
import { Mic, Edit3, MessageSquare, BookOpen } from 'lucide-react';

interface PracticeModeCardsProps {
  completedCount: number;
  totalCount: number;
  onSelectMode?: (mode: 'shadowing' | 'dictation' | 'aitalk' | 'vocab') => void;
}

export const PracticeModeCards: React.FC<PracticeModeCardsProps> = ({
  completedCount,
  totalCount,
  onSelectMode,
}) => {
  return (
    <div className="yt-practice-modes-section">
      <div className="yt-practice-modes-header">
        <h3 className="yt-practice-modes-title">Choose a practice mode</h3>
        <p className="yt-practice-modes-subtitle">Each mode opens a focused practice room.</p>
      </div>

      <div className="yt-practice-cards-grid">
        {/* 1. Shadowing */}
        <div
          className="yt-mode-card card-shadowing"
          onClick={() => onSelectMode?.('shadowing')}
        >
          <div className="yt-mode-icon-wrap">
            <Mic size={22} className="yt-mode-icon" />
          </div>
          <div className="yt-mode-info">
            <h4 className="yt-mode-name">Shadowing</h4>
            <p className="yt-mode-desc">Listen and repeat each sentence</p>
          </div>
          <div className="yt-mode-badge badge-shadowing">
            {completedCount}/{totalCount}
          </div>
        </div>

        {/* 2. Dictation */}
        <div
          className="yt-mode-card card-dictation"
          onClick={() => onSelectMode?.('dictation')}
        >
          <div className="yt-mode-icon-wrap">
            <Edit3 size={22} className="yt-mode-icon" />
          </div>
          <div className="yt-mode-info">
            <h4 className="yt-mode-name">Dictation</h4>
            <p className="yt-mode-desc">Listen and type what you hear</p>
          </div>
          <div className="yt-mode-badge badge-dictation">
            0/{totalCount}
          </div>
        </div>

        {/* 3. AI Talk */}
        <div
          className="yt-mode-card card-aitalk"
          onClick={() => onSelectMode?.('aitalk')}
        >
          <div className="yt-mode-icon-wrap">
            <MessageSquare size={22} className="yt-mode-icon" />
          </div>
          <div className="yt-mode-info">
            <h4 className="yt-mode-name">AI Talk</h4>
            <p className="yt-mode-desc">Discuss the video with an AI tutor</p>
          </div>
          <div className="yt-mode-badge badge-aitalk">
            Soon
          </div>
        </div>

        {/* 4. Vocabulary */}
        <div
          className="yt-mode-card card-vocab"
          onClick={() => onSelectMode?.('vocab')}
        >
          <div className="yt-mode-icon-wrap">
            <BookOpen size={22} className="yt-mode-icon" />
          </div>
          <div className="yt-mode-info">
            <h4 className="yt-mode-name">Vocabulary</h4>
            <p className="yt-mode-desc">Study the key speaking chunks</p>
          </div>
          <div className="yt-mode-badge badge-vocab">
            Soon
          </div>
        </div>
      </div>
    </div>
  );
};
