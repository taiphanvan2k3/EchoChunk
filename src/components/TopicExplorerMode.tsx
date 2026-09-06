'use client';

import React, { useState } from 'react';
import { SpeakingChunk, TopicMeta, ChunkProgress } from '@/types';
import { speechService } from '@/lib/speech';
import { soundManager } from '@/lib/sound';
import {
  Volume2,
  Play,
  ChevronDown,
  ChevronUp,
  Plus,
  Edit2,
  Trash2,
  Sparkles,
  RotateCcw,
  Clock,
  BookOpen,
} from 'lucide-react';

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

type StudiedFilter = 'ALL' | 'DUE' | 'LEARNING' | 'MASTERED';

export const TopicExplorerMode: React.FC<TopicExplorerModeProps> = ({
  topics,
  chunks,
  progressMap,
  onStartPracticeTopic,
  onPracticeChunk,
  onOpenAddChunk,
  onEditChunk,
  onDeleteChunk,
}) => {
  const studiedChunks = chunks.filter(
    (c) => progressMap[c.id] && progressMap[c.id].repetitions > 0
  );

  const [expandedTopicId, setExpandedTopicId] = useState<string | null>(
    studiedChunks.length > 0 ? 'STUDIED' : topics[0]?.topicId || null
  );

  const [studiedFilter, setStudiedFilter] = useState<StudiedFilter>('ALL');

  const toggleTopic = (tId: string) => {
    soundManager.playClick();
    setExpandedTopicId(expandedTopicId === tId ? null : tId);
  };

  const customChunks = chunks.filter((c) => c.isCustom || c.topicId === 'CUSTOM');

  const [now] = useState(() => Date.now());
  const dueChunks = studiedChunks.filter(
    (c) => new Date(progressMap[c.id]?.dueDate || '').getTime() <= now
  );
  const masteredChunks = studiedChunks.filter((c) => {
    const p = progressMap[c.id];
    return p && p.repetitions >= 3 && (p.bestAccuracy >= 80 || p.confidenceScore >= 3);
  });
  const learningChunks = studiedChunks.filter((c) => {
    const p = progressMap[c.id];
    return p && (p.repetitions < 3 || (p.bestAccuracy < 80 && p.confidenceScore < 3));
  });

  const displayStudiedChunks = (() => {
    switch (studiedFilter) {
      case 'DUE':
        return dueChunks;
      case 'MASTERED':
        return masteredChunks;
      case 'LEARNING':
        return learningChunks;
      case 'ALL':
      default:
        return studiedChunks;
    }
  })();

  const studiedPercent =
    chunks.length > 0 ? Math.round((studiedChunks.length / chunks.length) * 100) : 0;

  return (
    <div className="explorer-container">
      {/* Top Banner Overview */}
      <div className="explorer-header-card">
        <div className="explorer-header-content">
          <div className="explorer-title-row">
            <span className="explorer-icon-tag">📚 THƯ VIỆN & TIẾN ĐỘ</span>
            <h2 className="explorer-title">Kho Lưu Trữ Speaking Chunks ({chunks.length} Cụm)</h2>
            <p className="explorer-subtitle">
              Xem lại các cụm từ bạn <strong>đã từng luyện tập</strong> theo thuật toán nhớ giãn cách SRS, hoặc duyệt theo 12 chủ đề thực chiến và từ vựng tự tạo.
            </p>

            <div className="explorer-progress-bar-wrap">
              <div className="progress-info-row">
                <span>
                  Tiến độ học tập: <strong>{studiedChunks.length} / {chunks.length} chunks</strong> ({studiedPercent}%)
                </span>
                {dueChunks.length > 0 && (
                  <span className="due-alert-pill">
                    {dueChunks.length} cụm cần ôn hôm nay
                  </span>
                )}
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${studiedPercent}%` }} />
              </div>
            </div>
          </div>

          <button className="add-chunk-hero-btn" onClick={onOpenAddChunk} title="Tạo mới speaking chunk">
            <Plus size={16} />
            <span>Thêm Chunk</span>
          </button>
        </div>
      </div>

      <div className="topics-accordion-list">
        {/* ================================================================= */}
        {/* ACCORDION 1: CÁC CHUNK ĐÃ TỪNG HỌC (SRS STUDIED CHUNKS)          */}
        {/* ================================================================= */}
        <div
          className={`topic-card-accordion studied-accordion ${
            expandedTopicId === 'STUDIED' ? 'expanded' : ''
          }`}
        >
          <div className="accordion-header" onClick={() => toggleTopic('STUDIED')}>
            <div className="accordion-left">
              <div className="accordion-icon-badge studied-badge">
                <span>🧠</span>
              </div>
              <div className="accordion-title-wrap">
                <div className="flex items-center gap-2">
                  <h3 className="accordion-name">Từ vựng đã luyện tập (SRS)</h3>
                  <span className="badge-count-pill">{studiedChunks.length}</span>
                  {dueChunks.length > 0 && (
                    <span className="badge-due-pill">{dueChunks.length} cần ôn</span>
                  )}
                </div>
                <span className="accordion-count">
                  {dueChunks.length > 0
                    ? `Có ${dueChunks.length} cụm đến lịch ôn tập hôm nay`
                    : 'Ôn tập lặp lại ngắt quãng (Spaced Repetition)'}
                </span>
              </div>
            </div>

            <div className="accordion-right">
              {studiedChunks.length > 0 && (
                <button
                  type="button"
                  className="action-btn-mini btn-studied-review"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartPracticeTopic('STUDIED');
                  }}
                  title="Luyện lại các chunk đã học"
                >
                  <Play size={13} />
                  <span>Ôn tập ({dueChunks.length > 0 ? dueChunks.length : studiedChunks.length})</span>
                </button>
              )}
              {expandedTopicId === 'STUDIED' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>
          </div>

          {expandedTopicId === 'STUDIED' && (
            <div className="accordion-body">
              {studiedChunks.length === 0 ? (
                <div className="studied-empty-notice">
                  <BookOpen size={28} className="text-gray-400 mb-2" />
                  <h4>Chưa có cụm từ nào được học</h4>
                  <p>
                    Hãy chọn một chủ đề bên dưới để luyện tập Shadowing hoặc Phản xạ. Các từ bạn đã học sẽ tự động được xếp lịch ôn tại đây!
                  </p>
                </div>
              ) : (
                <>
                  {/* Clean Filter Tabs */}
                  <div className="studied-filters-row">
                    <button
                      type="button"
                      className={`studied-tab ${studiedFilter === 'ALL' ? 'active' : ''}`}
                      onClick={() => { soundManager.playClick(); setStudiedFilter('ALL'); }}
                    >
                      Tất cả <span className="tab-num">{studiedChunks.length}</span>
                    </button>

                    <button
                      type="button"
                      className={`studied-tab ${studiedFilter === 'DUE' ? 'active' : ''} ${
                        dueChunks.length > 0 ? 'has-due' : ''
                      }`}
                      onClick={() => { soundManager.playClick(); setStudiedFilter('DUE'); }}
                    >
                      Cần ôn <span className="tab-num">{dueChunks.length}</span>
                    </button>

                    <button
                      type="button"
                      className={`studied-tab ${studiedFilter === 'LEARNING' ? 'active' : ''}`}
                      onClick={() => { soundManager.playClick(); setStudiedFilter('LEARNING'); }}
                    >
                      Đang học <span className="tab-num">{learningChunks.length}</span>
                    </button>

                    <button
                      type="button"
                      className={`studied-tab ${studiedFilter === 'MASTERED' ? 'active' : ''}`}
                      onClick={() => { soundManager.playClick(); setStudiedFilter('MASTERED'); }}
                    >
                      Thành thạo <span className="tab-num">{masteredChunks.length}</span>
                    </button>
                  </div>

                  {/* Clean Chunks Grid */}
                  <div className="chunks-grid">
                    {displayStudiedChunks.map((chunk) => {
                      const prog = progressMap[chunk.id];
                      const isDue = prog && new Date(prog.dueDate).getTime() <= now;
                      const isMastered =
                        prog && prog.repetitions >= 3 && (prog.bestAccuracy >= 80 || prog.confidenceScore >= 3);

                      const daysLeft = prog
                        ? Math.max(
                            0,
                            Math.round(
                              (new Date(prog.dueDate).getTime() - now) / (1000 * 60 * 60 * 24)
                            )
                          )
                        : 0;

                      return (
                        <div
                          key={chunk.id}
                          className={`chunk-mini-card studied-chunk-card ${
                            isDue ? 'card-status-due' : isMastered ? 'card-status-mastered' : ''
                          }`}
                        >
                          {/* Card Header: Chunk text + CEFR level */}
                          <div className="chunk-mini-top">
                            <span className="chunk-mini-name">{chunk.chunk}</span>
                            <div className="chunk-badge-group">
                              {isDue && <span className="badge-due-tag">Cần ôn</span>}
                              {isMastered && <span className="badge-mastered-tag">Thành thạo</span>}
                              <span className="chunk-mini-level">{chunk.level}</span>
                            </div>
                          </div>

                          {/* Concise Meaning */}
                          <p className="chunk-mini-meaning">➜ {chunk.meaning}</p>

                          {/* Clean English Example Only (Avoid bulky Vietnamese sentences) */}
                          <p className="chunk-mini-example">&ldquo;{chunk.cleanExample}&rdquo;</p>

                          {/* Streamlined Inline SRS Metadata */}
                          {prog && (
                            <div className="studied-meta-line">
                              <span className="meta-stat" title="Độ chính xác cao nhất">
                                <Sparkles size={11} className="text-amber-500" />
                                {prog.bestAccuracy > 0 ? `${prog.bestAccuracy}%` : 'Chưa chấm'}
                              </span>
                              <span className="meta-dot">•</span>
                              <span className="meta-stat" title="Số lần đã luyện">
                                <RotateCcw size={11} className="text-blue-500" />
                                {prog.repetitions}x
                              </span>
                              <span className="meta-dot">•</span>
                              <span
                                className={`meta-stat ${isDue ? 'text-rose-600 font-semibold' : ''}`}
                                title="Lịch ôn tập"
                              >
                                <Clock size={11} />
                                {isDue ? 'Hôm nay' : `Sau ${daysLeft} ngày`}
                              </span>
                            </div>
                          )}

                          {/* Bottom Action Bar */}
                          <div className="chunk-mini-bottom">
                            <button
                              type="button"
                              className="audio-icon-btn"
                              onClick={() => speechService.speak(chunk.cleanExample)}
                              title="Nghe câu ví dụ"
                            >
                              <Volume2 size={14} />
                              <span>Nghe</span>
                            </button>

                            <div className="chunk-card-actions">
                              {onPracticeChunk && (
                                <button
                                  type="button"
                                  className="mini-practice-btn"
                                  onClick={() => onPracticeChunk(chunk, 'STUDIED')}
                                  title="Luyện nói câu này trong nhóm từ đã học"
                                >
                                  <Play size={13} />
                                  <span>Luyện</span>
                                </button>
                              )}
                              <button
                                type="button"
                                className="card-action-icon-btn edit"
                                onClick={() => onEditChunk(chunk)}
                                title="Sửa chunk"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                type="button"
                                className="card-action-icon-btn delete"
                                onClick={() => {
                                  if (window.confirm(`Xóa chunk "${chunk.chunk}"?`)) {
                                    onDeleteChunk(chunk.id);
                                  }
                                }}
                                title="Xóa chunk"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* ACCORDION 2: TỪ VỰNG TỰ TẠO (CUSTOM CHUNKS)                      */}
        {/* ================================================================= */}
        {customChunks.length > 0 && (
          <div
            className={`topic-card-accordion custom-topic-accordion ${
              expandedTopicId === 'CUSTOM' ? 'expanded' : ''
            }`}
          >
            <div className="accordion-header" onClick={() => toggleTopic('CUSTOM')}>
              <div className="accordion-left">
                <div className="accordion-icon-badge custom-badge">
                  <span>⭐</span>
                </div>
                <div className="accordion-title-wrap">
                  <div className="flex items-center gap-2">
                    <h3 className="accordion-name">Từ Vựng Của Tôi (Custom Chunks)</h3>
                    <span className="badge-count-pill">{customChunks.length}</span>
                  </div>
                  <span className="accordion-count">Speaking chunks bạn đã tự tạo</span>
                </div>
              </div>

              <div className="accordion-right">
                <button
                  type="button"
                  className="action-btn-mini"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartPracticeTopic('CUSTOM');
                  }}
                  title="Luyện tập từ vựng tự tạo"
                >
                  <Play size={13} />
                  <span>Luyện ngay</span>
                </button>
                {expandedTopicId === 'CUSTOM' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>
            </div>

            {expandedTopicId === 'CUSTOM' && (
              <div className="accordion-body">
                <div className="chunks-grid">
                  {customChunks.map((chunk) => (
                    <div key={chunk.id} className="chunk-mini-card custom-card">
                      <div className="chunk-mini-top">
                        <span className="chunk-mini-name">{chunk.chunk}</span>
                        <div className="chunk-badge-group">
                          <span className="badge-custom">Tự tạo</span>
                          <span className="chunk-mini-level">{chunk.level}</span>
                        </div>
                      </div>
                      <p className="chunk-mini-meaning">➜ {chunk.meaning}</p>
                      <p className="chunk-mini-example">&ldquo;{chunk.cleanExample}&rdquo;</p>
                      <div className="chunk-mini-bottom">
                        <button
                          type="button"
                          className="audio-icon-btn"
                          onClick={() => speechService.speak(chunk.cleanExample)}
                          title="Nghe câu ví dụ"
                        >
                          <Volume2 size={14} />
                          <span>Nghe</span>
                        </button>
                        <div className="chunk-card-actions">
                          {onPracticeChunk && (
                            <button
                              type="button"
                              className="mini-practice-btn"
                              onClick={() => onPracticeChunk(chunk)}
                              title="Luyện câu này"
                            >
                              <Play size={13} />
                              <span>Luyện</span>
                            </button>
                          )}
                          <button
                            type="button"
                            className="card-action-icon-btn edit"
                            onClick={() => onEditChunk(chunk)}
                            title="Sửa"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            className="card-action-icon-btn delete"
                            onClick={() => {
                              if (window.confirm(`Xóa chunk "${chunk.chunk}"?`)) {
                                onDeleteChunk(chunk.id);
                              }
                            }}
                            title="Xóa"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* 12 CORE TOPICS ACCORDIONS                                         */}
        {/* ================================================================= */}
        {topics
          .filter((t) => t.topicId !== 'CUSTOM' && t.topicId !== 'STUDIED')
          .map((topic) => {
            const topicChunks = chunks.filter((c) => c.topicId === topic.topicId);
            const isExpanded = expandedTopicId === topic.topicId;

            return (
              <div
                key={topic.topicId}
                className={`topic-card-accordion ${isExpanded ? 'expanded' : ''}`}
              >
                <div className="accordion-header" onClick={() => toggleTopic(topic.topicId)}>
                  <div className="accordion-left">
                    <span className="accordion-icon">{topic.icon}</span>
                    <div className="accordion-title-wrap">
                      <div className="flex items-center gap-2">
                        <h3 className="accordion-name">{topic.topicName}</h3>
                        <span className="badge-count-pill">{topicChunks.length}</span>
                      </div>
                      <span className="accordion-count">Chủ đề bài học</span>
                    </div>
                  </div>

                  <div className="accordion-right">
                    <button
                      type="button"
                      className="action-btn-mini"
                      onClick={(e) => {
                        e.stopPropagation();
                        onStartPracticeTopic(topic.topicId);
                      }}
                      title="Luyện tập chủ đề này"
                    >
                      <Play size={13} />
                      <span>Luyện ngay</span>
                    </button>
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="accordion-body">
                    <div className="chunks-grid">
                      {topicChunks.map((chunk) => (
                        <div
                          key={chunk.id}
                          className={`chunk-mini-card ${chunk.isCustom ? 'custom-card' : ''}`}
                        >
                          <div className="chunk-mini-top">
                            <span className="chunk-mini-name">{chunk.chunk}</span>
                            <div className="chunk-badge-group">
                              {chunk.isCustom && <span className="badge-custom">Đã sửa</span>}
                              <span className="chunk-mini-level">{chunk.level}</span>
                            </div>
                          </div>
                          <p className="chunk-mini-meaning">➜ {chunk.meaning}</p>
                          <p className="chunk-mini-example">&ldquo;{chunk.cleanExample}&rdquo;</p>
                          <div className="chunk-mini-bottom">
                            <button
                              type="button"
                              className="audio-icon-btn"
                              onClick={() => speechService.speak(chunk.cleanExample)}
                              title="Nghe câu ví dụ"
                            >
                              <Volume2 size={14} />
                              <span>Nghe</span>
                            </button>
                            <div className="chunk-card-actions">
                              {onPracticeChunk && (
                                <button
                                  type="button"
                                  className="card-action-icon-btn practice-btn"
                                  onClick={() => onPracticeChunk(chunk)}
                                  title="Luyện câu này"
                                >
                                  <Play size={13} />
                                  <span>Luyện</span>
                                </button>
                              )}
                              <button
                                type="button"
                                className="card-action-icon-btn edit"
                                onClick={() => onEditChunk(chunk)}
                                title="Sửa"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                type="button"
                                className="card-action-icon-btn delete"
                                onClick={() => {
                                  if (window.confirm(`Xóa chunk "${chunk.chunk}"?`)) {
                                    onDeleteChunk(chunk.id);
                                  }
                                }}
                                title="Xóa"
                              >
                                <Trash2 size={13} />
                              </button>
                              <span className="chunk-mini-number">#{chunk.number}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
};
