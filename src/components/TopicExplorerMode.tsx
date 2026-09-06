'use client';

import React, { useState } from 'react';
import { SpeakingChunk, TopicMeta } from '@/types';
import { speechService } from '@/lib/speech';
import { soundManager } from '@/lib/sound';
import { Volume2, Play, ChevronDown, ChevronUp, Plus, Edit2, Trash2 } from 'lucide-react';

interface TopicExplorerModeProps {
  topics: TopicMeta[];
  chunks: SpeakingChunk[];
  onStartPracticeTopic: (topicId: string) => void;
  onOpenAddChunk: () => void;
  onEditChunk: (chunk: SpeakingChunk) => void;
  onDeleteChunk: (chunkId: string) => void;
}

export const TopicExplorerMode: React.FC<TopicExplorerModeProps> = ({
  topics,
  chunks,
  onStartPracticeTopic,
  onOpenAddChunk,
  onEditChunk,
  onDeleteChunk,
}) => {
  const [expandedTopicId, setExpandedTopicId] = useState<string | null>(topics[0]?.topicId || null);

  const toggleTopic = (tId: string) => {
    soundManager.playClick();
    setExpandedTopicId(expandedTopicId === tId ? null : tId);
  };

  const customChunks = chunks.filter((c) => c.isCustom || c.topicId === 'CUSTOM');

  return (
    <div className="explorer-container">
      {/* Explorer Top Banner */}
      <div className="explorer-header-card">
        <div className="explorer-header-content">
          <div className="explorer-title-row">
            <span className="explorer-icon-tag">📚 THƯ VIỆN CHUNKS</span>
            <h2 className="explorer-title">Kho Lưu Trữ & Quản Lý Speaking Chunks ({chunks.length} Cụm)</h2>
            <p className="explorer-subtitle">
              Xem toàn bộ 12 chủ đề cốt lõi và các cụm từ vựng do bạn tự thêm. Bạn có thể nghe phát âm, chỉnh sửa câu ví dụ, hoặc thêm các mẫu câu mới học được từ phim/sách báo.
            </p>
          </div>
          <button className="add-chunk-hero-btn" onClick={onOpenAddChunk} title="Tạo mới speaking chunk">
            <Plus size={18} />
            <span>Thêm Chunk Mới</span>
          </button>
        </div>
      </div>

      <div className="topics-accordion-list">
        {/* Custom Chunks Topic Section (if any exists) */}
        {customChunks.length > 0 && (
          <div className={`topic-card-accordion custom-topic-accordion ${expandedTopicId === 'CUSTOM' ? 'expanded' : ''}`}>
            <div className="accordion-header" onClick={() => toggleTopic('CUSTOM')}>
              <div className="accordion-left">
                <span className="accordion-icon">⭐</span>
                <div className="accordion-title-wrap">
                  <h3 className="accordion-name">Từ Vựng Của Tôi (Custom Chunks)</h3>
                  <span className="accordion-count">{customChunks.length} speaking chunks tự tạo</span>
                </div>
              </div>

              <div className="accordion-right">
                <button
                  className="action-btn-mini"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartPracticeTopic('CUSTOM');
                  }}
                  title="Luyện tập riêng các từ vựng tự tạo"
                >
                  <Play size={14} />
                  <span>Luyện ngay</span>
                </button>
                {expandedTopicId === 'CUSTOM' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
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
                      {chunk.translation && (
                        <p className="chunk-mini-translation">{chunk.translation}</p>
                      )}
                      <div className="chunk-mini-bottom">
                        <button
                          className="audio-icon-btn"
                          onClick={() => speechService.speak(chunk.cleanExample)}
                          title="Nghe câu ví dụ"
                        >
                          <Volume2 size={15} />
                          <span>Nghe</span>
                        </button>
                        <div className="chunk-card-actions">
                          <button
                            className="card-action-icon-btn edit"
                            onClick={() => onEditChunk(chunk)}
                            title="Chỉnh sửa chunk này"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            className="card-action-icon-btn delete"
                            onClick={() => {
                              if (window.confirm(`Xóa chunk "${chunk.chunk}" khỏi danh sách?`)) {
                                onDeleteChunk(chunk.id);
                              }
                            }}
                            title="Xóa chunk này"
                          >
                            <Trash2 size={14} />
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

        {/* 12 Core Topics */}
        {topics.filter((t) => t.topicId !== 'CUSTOM').map((topic) => {
          const topicChunks = chunks.filter((c) => c.topicId === topic.topicId);
          const isExpanded = expandedTopicId === topic.topicId;

          return (
            <div key={topic.topicId} className={`topic-card-accordion ${isExpanded ? 'expanded' : ''}`}>
              <div className="accordion-header" onClick={() => toggleTopic(topic.topicId)}>
                <div className="accordion-left">
                  <span className="accordion-icon">{topic.icon}</span>
                  <div className="accordion-title-wrap">
                    <h3 className="accordion-name">{topic.topicName}</h3>
                    <span className="accordion-count">{topicChunks.length} speaking chunks</span>
                  </div>
                </div>

                <div className="accordion-right">
                  <button
                    className="action-btn-mini"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStartPracticeTopic(topic.topicId);
                    }}
                    title="Luyện tập riêng chủ đề này"
                  >
                    <Play size={14} />
                    <span>Luyện ngay</span>
                  </button>
                  {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </div>

              {isExpanded && (
                <div className="accordion-body">
                  <div className="chunks-grid">
                    {topicChunks.map((chunk) => (
                      <div key={chunk.id} className={`chunk-mini-card ${chunk.isCustom ? 'custom-card' : ''}`}>
                        <div className="chunk-mini-top">
                          <span className="chunk-mini-name">{chunk.chunk}</span>
                          <div className="chunk-badge-group">
                            {chunk.isCustom && <span className="badge-custom">Đã sửa</span>}
                            <span className="chunk-mini-level">{chunk.level}</span>
                          </div>
                        </div>
                        <p className="chunk-mini-meaning">➜ {chunk.meaning}</p>
                        <p className="chunk-mini-example">&ldquo;{chunk.cleanExample}&rdquo;</p>
                        {chunk.translation && (
                          <p className="chunk-mini-translation">{chunk.translation}</p>
                        )}
                        <div className="chunk-mini-bottom">
                          <button
                            className="audio-icon-btn"
                            onClick={() => speechService.speak(chunk.cleanExample)}
                            title="Nghe câu ví dụ"
                          >
                            <Volume2 size={15} />
                            <span>Nghe</span>
                          </button>
                          <div className="chunk-card-actions">
                            <button
                              className="card-action-icon-btn edit"
                              onClick={() => onEditChunk(chunk)}
                              title="Chỉnh sửa chunk này"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              className="card-action-icon-btn delete"
                              onClick={() => {
                                if (window.confirm(`Xóa chunk "${chunk.chunk}" khỏi danh sách?`)) {
                                  onDeleteChunk(chunk.id);
                                }
                              }}
                              title="Xóa chunk này"
                            >
                              <Trash2 size={14} />
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
