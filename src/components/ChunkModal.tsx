'use client';

import React, { useState, useEffect, useRef } from 'react';
import { SpeakingChunk, TopicMeta } from '@/types';
import { speechService } from '@/lib/speech';
import { soundManager } from '@/lib/sound';
import { getAmericanIpa } from '@/lib/ipa';
import {
  X,
  Volume2,
  Save,
  Trash2,
  Check,
  ChevronDown,
  MessageSquare,
  AlertCircle,
  AlertTriangle,
  Wand2,
} from 'lucide-react';

interface ChunkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (chunk: SpeakingChunk) => void;
  onDelete?: (chunkId: string) => void;
  chunkToEdit?: SpeakingChunk | null;
  existingTopics: TopicMeta[];
}

export const ChunkModal: React.FC<ChunkModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  chunkToEdit,
  existingTopics,
}) => {
  const isEditing = Boolean(chunkToEdit);

  const [chunkText, setChunkText] = useState('');
  const [meaning, setMeaning] = useState('');
  const [ipa, setIpa] = useState('');
  const [level, setLevel] = useState('B1');
  const [topicId, setTopicId] = useState(existingTopics[0]?.topicId || 'CUSTOM');
  const [customTopicName, setCustomTopicName] = useState('');
  const [exampleSentence, setExampleSentence] = useState('');
  const [translation, setTranslation] = useState('');
  const [detailMeaning, setDetailMeaning] = useState('');
  const [context, setContext] = useState('');
  const [tagsStr, setTagsStr] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [showAdvanced, setShowAdvanced] = useState(Boolean(chunkToEdit));

  // Track props to adjust state during render (React recommended pattern for state sync without effect)
  const [prevSyncKey, setPrevSyncKey] = useState<{ id?: string; isOpen: boolean }>({
    id: chunkToEdit?.id,
    isOpen,
  });

  if (prevSyncKey.id !== chunkToEdit?.id || prevSyncKey.isOpen !== isOpen) {
    setPrevSyncKey({ id: chunkToEdit?.id, isOpen });
    if (chunkToEdit) {
      setChunkText(chunkToEdit.chunk || '');
      setMeaning(chunkToEdit.meaning || '');
      setIpa(chunkToEdit.ipa || '');
      setLevel(chunkToEdit.level || 'B1');
      setTopicId(chunkToEdit.topicId || 'CUSTOM');
      setCustomTopicName(chunkToEdit.topicName || '');
      setExampleSentence(chunkToEdit.exampleSentence || chunkToEdit.cleanExample || '');
      setTranslation(chunkToEdit.translation || '');
      setDetailMeaning(chunkToEdit.detailMeaning || '');
      setContext(chunkToEdit.context || '');
      setTagsStr(chunkToEdit.tags?.join(', ') || '');
      setShowAdvanced(true);
    } else {
      setChunkText('');
      setMeaning('');
      setIpa('');
      setLevel('B1');
      setTopicId(existingTopics[0]?.topicId || 'CUSTOM');
      setCustomTopicName('Từ vựng của tôi');
      setExampleSentence('');
      setTranslation('');
      setDetailMeaning('');
      setContext('');
      setTagsStr('');
      setShowAdvanced(false);
    }
    setErrorMessage(null);
  }

  // Custom Notion Dropdown State
  const [isTopicMenuOpen, setIsTopicMenuOpen] = useState(false);
  const topicDropdownRef = useRef<HTMLDivElement>(null);

  // Click outside to close custom dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (topicDropdownRef.current && !topicDropdownRef.current.contains(e.target as Node)) {
        setIsTopicMenuOpen(false);
      }
    };
    if (isTopicMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isTopicMenuOpen]);

  if (!isOpen) return null;

  const handleTestAudio = () => {
    const textToSpeak = exampleSentence.trim() || chunkText.trim();
    if (textToSpeak) {
      speechService.speak(textToSpeak, 1.0);
    }
  };

  // Helper: Auto generate American IPA for chunk text
  const handleAutoGenerateIpa = () => {
    const words = chunkText.trim().split(/\s+/);
    if (!words.length || !words[0]) return;

    const ipaParts = words.map((w) => {
      const phonetic = getAmericanIpa(w);
      return phonetic ? phonetic.replace(/^\/|\/$/g, '') : w.toLowerCase();
    });

    const generated = `/${ipaParts.join(' ')}/`;
    setIpa(generated);
  };

  // Check if example sentence contains the chunk keywords
  const isChunkInExample = () => {
    if (!chunkText.trim() || !exampleSentence.trim()) return true;
    const cleanExample = exampleSentence.toLowerCase();
    const cleanChunk = chunkText.toLowerCase().trim();

    if (cleanExample.includes(cleanChunk)) return true;

    const words = cleanChunk.split(/\s+/).filter((w) => w.length > 3);
    if (words.length > 0) {
      return words.some((w) => cleanExample.includes(w));
    }

    return true;
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedChunk = chunkText.trim();
    const trimmedMeaning = meaning.trim();
    const trimmedExample = exampleSentence.trim();
    const trimmedTranslation = translation.trim();

    // Quick Add validation: Only Chunk and Meaning are required
    if (!trimmedChunk) {
      setErrorMessage('Vui lòng nhập cụm từ tiếng Anh (trường bắt buộc).');
      return;
    }

    if (!trimmedMeaning) {
      setErrorMessage('Vui lòng nhập nghĩa cốt lõi tiếng Việt (trường bắt buộc).');
      return;
    }

    const selectedTopic = existingTopics.find((t) => t.topicId === topicId);
    const resolvedTopicName =
      topicId === 'CUSTOM'
        ? customTopicName.trim() || 'Từ vựng của tôi'
        : selectedTopic?.topicName || 'Tổng hợp';
    const resolvedTopicIcon = topicId === 'CUSTOM' ? '⭐' : selectedTopic?.icon || '📁';

    const parsedTags = tagsStr
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);

    // Auto-resolve IPA if user left it blank
    let finalIpa = ipa.trim();
    if (!finalIpa) {
      const words = trimmedChunk.split(/\s+/);
      const parts = words
        .map((w) => {
          const found = getAmericanIpa(w);
          return found ? found.replace(/^\/|\/$/g, '') : '';
        })
        .filter(Boolean);
      if (parts.length > 0) {
        finalIpa = `/${parts.join(' ')}/`;
      }
    }

    const resolvedCleanExample = trimmedExample ? trimmedExample.replace(/[*_`]/g, '') : '';

    const updatedChunk: SpeakingChunk = {
      id: chunkToEdit?.id || `custom_chunk_${Date.now()}`,
      topicId: topicId,
      topicName: resolvedTopicName,
      topicIcon: resolvedTopicIcon,
      sectionTitle: chunkToEdit?.sectionTitle || resolvedTopicName,
      number: chunkToEdit?.number || 999,
      chunk: trimmedChunk,
      meaning: trimmedMeaning,
      level: level,
      detailMeaning: detailMeaning.trim() || trimmedMeaning,
      exampleSentence: trimmedExample,
      cleanExample: resolvedCleanExample,
      ipa: finalIpa,
      translation: trimmedTranslation,
      context: context.trim(),
      tags: parsedTags.length > 0 ? parsedTags : ['custom', 'speaking'],
      isCustom: true,
    };

    soundManager.playSuccess();
    onSave(updatedChunk);
    onClose();
  };

  const handleDelete = () => {
    if (!chunkToEdit || !onDelete) return;
    if (window.confirm(`Bạn có chắc chắn muốn xóa chunk "${chunkToEdit.chunk}" khỏi kho học tập không?`)) {
      soundManager.playClick();
      onDelete(chunkToEdit.id);
      onClose();
    }
  };

  const currentSelectedTopic =
    topicId === 'CUSTOM'
      ? { topicId: 'CUSTOM', topicName: customTopicName || 'Từ vựng tự tạo / Khác', icon: '⭐' }
      : existingTopics.find((t) => t.topicId === topicId) || {
          topicId: 'CUSTOM',
          topicName: 'Từ vựng tự tạo',
          icon: '⭐',
        };

  const showContextWarning = chunkText.trim() && exampleSentence.trim() && !isChunkInExample();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="notion-page-modal" onClick={(e) => e.stopPropagation()}>
        {/* Notion Modal Header with Icon & Close */}
        <div className="notion-modal-top">
          <div className="notion-page-icon-badge">
            <span>🗣️</span>
          </div>
          <button className="notion-modal-close" onClick={onClose} title="Đóng (Esc)">
            <X size={18} />
          </button>
        </div>

        {errorMessage && (
          <div className="notion-form-alert">
            <AlertCircle size={15} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form
          onSubmit={handleSave}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
              e.preventDefault();
              handleSave(e);
            }
          }}
          className="notion-page-form"
        >
          {/* Page Title (Chunk Name) with subtle red asterisk */}
          <div className="notion-title-row">
            <input
              type="text"
              className="notion-page-title-input"
              placeholder="Nhập cụm từ tiếng Anh... (ví dụ: touch base with)"
              value={chunkText}
              onChange={(e) => setChunkText(e.target.value)}
              autoFocus
            />
            <span className="notion-required-star" title="Trường bắt buộc">*</span>
          </div>

          {/* Core Properties: Nghĩa tiếng Việt */}
          <div className="notion-properties-table">
            <div className="notion-property-row">
              <div className="notion-prop-label">
                <span>🎯</span>
                <span>Nghĩa cốt lõi <span className="notion-required-star">*</span></span>
              </div>
              <div className="notion-prop-value">
                <input
                  type="text"
                  className="notion-inline-input"
                  placeholder="Ví dụ: liên hệ ngắn gọn, trao đổi nhanh..."
                  value={meaning}
                  onChange={(e) => setMeaning(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Quick Add Helper Badge */}
          {!showAdvanced && (
            <div className="notion-quick-hint">
              <span className="notion-quick-hint-icon">⚡</span>
              <span>
                <strong>Thêm nhanh:</strong> Chỉ cần nhập 2 ô trên và nhấn <em>Lưu</em> (hoặc <em>Enter</em>). Bạn có thể mở rộng tùy chỉnh bên dưới để thêm câu ví dụ hoặc ngữ cảnh bất kỳ lúc nào.
              </span>
            </div>
          )}

          {/* Collapsible Accordion Toggle */}
          <div className="notion-toggle-advanced-wrap">
            <button
              type="button"
              className="notion-toggle-advanced-btn"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <ChevronDown
                size={15}
                className={`notion-toggle-chevron ${showAdvanced ? 'expanded' : ''}`}
              />
              <span>
                {showAdvanced
                  ? 'Thu gọn tùy chỉnh nâng cao'
                  : 'Tùy chỉnh nâng cao (Chủ đề, Ví dụ câu, IPA, Cấp độ...)'}
              </span>
            </button>
          </div>

          {/* Advanced Section: Collapsible */}
          {showAdvanced && (
            <div className="notion-advanced-section">
              <div className="notion-properties-table">
                {/* Property: Chủ đề (Custom Notion Dropdown Selector) */}
                <div className="notion-property-row">
                  <div className="notion-prop-label">
                    <span>📁</span>
                    <span>Chủ đề</span>
                  </div>
                  <div className="notion-prop-value" ref={topicDropdownRef}>
                    <div className="notion-custom-select">
                      <button
                        type="button"
                        className="notion-select-trigger"
                        onClick={() => setIsTopicMenuOpen(!isTopicMenuOpen)}
                      >
                        <span className="trigger-icon">{currentSelectedTopic.icon}</span>
                        <span className="trigger-text">{currentSelectedTopic.topicName}</span>
                        <ChevronDown size={14} className="trigger-arrow" />
                      </button>

                      {/* Notion Floating Dropdown Menu */}
                      {isTopicMenuOpen && (
                        <div className="notion-dropdown-menu">
                          <div
                            className={`notion-menu-item ${topicId === 'CUSTOM' ? 'selected' : ''}`}
                            onClick={() => {
                              setTopicId('CUSTOM');
                              setIsTopicMenuOpen(false);
                            }}
                          >
                            <span className="menu-item-left">
                              <span>⭐</span>
                              <span>Từ vựng tự tạo / Khác</span>
                            </span>
                            {topicId === 'CUSTOM' && <Check size={14} className="check-icon" />}
                          </div>

                          <div className="notion-menu-divider" />

                          {existingTopics
                            .filter((t) => t.topicId !== 'CUSTOM')
                            .map((t) => (
                              <div
                                key={t.topicId}
                                className={`notion-menu-item ${topicId === t.topicId ? 'selected' : ''}`}
                                onClick={() => {
                                  setTopicId(t.topicId);
                                  setIsTopicMenuOpen(false);
                                }}
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

                {topicId === 'CUSTOM' && (
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
                        onChange={(e) => setCustomTopicName(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Property: Cấp độ CEFR (Notion Status Pills) */}
                <div className="notion-property-row">
                  <div className="notion-prop-label">
                    <span>🏷️</span>
                    <span>Cấp độ CEFR</span>
                  </div>
                  <div className="notion-prop-value">
                    <div className="notion-level-pills-row">
                      {[
                        { id: 'A2', label: 'A2 - Cơ bản' },
                        { id: 'B1', label: 'B1 - Trung cấp' },
                        { id: 'B2', label: 'B2 - Nâng cao' },
                        { id: 'C1', label: 'C1 - Thành thạo' },
                      ].map((lvl) => (
                        <button
                          key={lvl.id}
                          type="button"
                          className={`notion-level-pill ${level === lvl.id ? `active-${lvl.id.toLowerCase()}` : ''}`}
                          onClick={() => setLevel(lvl.id)}
                        >
                          {lvl.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Property: Phiên âm IPA */}
                <div className="notion-property-row">
                  <div className="notion-prop-label">
                    <span>🔤</span>
                    <span>Phiên âm IPA Mỹ</span>
                  </div>
                  <div className="notion-prop-value flex items-center gap-2">
                    <input
                      type="text"
                      className="notion-inline-input flex-1"
                      placeholder="Ví dụ: /tʌtʃ beɪs wɪð/ (tự động sinh nếu để trống)"
                      value={ipa}
                      onChange={(e) => setIpa(e.target.value)}
                    />
                    {chunkText.trim() && (
                      <button
                        type="button"
                        onClick={handleAutoGenerateIpa}
                        className="notion-btn-inline-action"
                        title="Tự động sinh phiên âm Anh - Mỹ từ từ điển offline"
                      >
                        <Wand2 size={13} />
                        <span>Sinh IPA</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="notion-content-divider" />

              {/* Page Body Content (Notion Callout Box Style) */}
              <div className="notion-callout-editor">
                <div className="callout-editor-header">
                  <div className="callout-label-row">
                    <MessageSquare size={15} className="callout-icon" />
                    <span className="callout-title">
                      Câu ví dụ thực tế (tùy chọn)
                    </span>
                  </div>
                  <button
                    type="button"
                    className="callout-listen-btn"
                    onClick={handleTestAudio}
                    title="Nghe thử phát âm câu này"
                  >
                    <Volume2 size={14} />
                    <span>Nghe thử phát âm</span>
                  </button>
                </div>
                <textarea
                  className="notion-callout-textarea"
                  rows={3}
                  placeholder="Ví dụ: Let's touch base next Monday after the team meeting to align on deliverables."
                  value={exampleSentence}
                  onChange={(e) => setExampleSentence(e.target.value)}
                />

                {showContextWarning && (
                  <div className="chunk-context-hint">
                    <AlertTriangle size={14} className="shrink-0 text-amber-600" />
                    <span>
                      Gợi ý: Câu ví dụ nên chứa cụm từ <strong>&quot;{chunkText}&quot;</strong> để bài tập nhại câu và điền từ hoạt động chuẩn xác nhất.
                    </span>
                  </div>
                )}
              </div>

              {/* Additional Details (Translation, Context, Tags) */}
              <div className="notion-sub-fields-grid">
                <div className="sub-field col-full">
                  <label className="sub-field-label">
                    🇻🇳 Dịch nghĩa câu ví dụ (tùy chọn)
                  </label>
                  <input
                    type="text"
                    className="notion-sub-input"
                    placeholder="Ví dụ: Hãy trao đổi nhanh vào thứ Hai tới sau buổi họp nhóm để thống nhất kết quả..."
                    value={translation}
                    onChange={(e) => setTranslation(e.target.value)}
                  />
                </div>

                <div className="sub-field col-full">
                  <label className="sub-field-label">💡 Ghi chú ngữ cảnh (tùy chọn):</label>
                  <input
                    type="text"
                    className="notion-sub-input"
                    placeholder="Ví dụ: Thường dùng trong email công việc hoặc khi muốn trao đổi ngắn gọn"
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                  />
                </div>

                <div className="sub-field col-full">
                  <label className="sub-field-label">🏷️ Thẻ phân loại (tags):</label>
                  <input
                    type="text"
                    className="notion-sub-input"
                    placeholder="Ví dụ: work, meeting, business, casual (cách nhau bằng dấu phẩy)"
                    value={tagsStr}
                    onChange={(e) => setTagsStr(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Notion Page Footer Actions */}
          <div className="notion-modal-footer">
            {isEditing && onDelete && (
              <button
                type="button"
                className="notion-btn-danger"
                onClick={handleDelete}
                title="Xóa chunk này"
              >
                <Trash2 size={15} />
                <span>Xóa chunk</span>
              </button>
            )}

            <div className="notion-footer-right">
              <button type="button" className="notion-btn-secondary" onClick={onClose}>
                Đóng
              </button>
              <button type="submit" className="notion-btn-primary">
                <Save size={15} />
                <span>{isEditing ? 'Cập Nhật Thay Đổi' : 'Lưu Vào Kho Chunks'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
