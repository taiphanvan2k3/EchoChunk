"use client";

import React, { useState, useEffect, useRef } from "react";
import { SpeakingChunk, TopicMeta, ChunkExample } from "@/types";
import { speechService } from "@/lib/speech";
import { soundManager } from "@/lib/sound";
import { getPhraseIpa, resolveChunkIpas } from "@/lib/ipa";
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
  Plus
} from "lucide-react";

interface ChunkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (chunk: SpeakingChunk) => void;
  onDelete?: (chunkId: string) => void;
  chunkToEdit?: SpeakingChunk | null;
  existingTopics: TopicMeta[];
}

interface ModalExampleItem {
  id: string;
  sentence: string;
  translation: string;
  sentenceIpa: string;
  context: string;
  isIpaEdited?: boolean;
}

export const ChunkModal: React.FC<ChunkModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  chunkToEdit,
  existingTopics
}) => {
  const isEditing = Boolean(chunkToEdit);

  const [chunkText, setChunkText] = useState("");
  const [meaning, setMeaning] = useState("");
  const [chunkIpa, setChunkIpa] = useState("");
  const [isChunkIpaEdited, setIsChunkIpaEdited] = useState(false);
  const [level, setLevel] = useState("B1");
  const [topicId, setTopicId] = useState(existingTopics[0]?.topicId || "CUSTOM");
  const [customTopicName, setCustomTopicName] = useState("");
  const [detailMeaning, setDetailMeaning] = useState("");
  const [tags, setTags] = useState<string[]>(["custom", "speaking"]);
  const [examples, setExamples] = useState<ModalExampleItem[]>([
    { id: "ex_init_1", sentence: "", translation: "", sentenceIpa: "", context: "" }
  ]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [showAdvanced, setShowAdvanced] = useState(Boolean(chunkToEdit));

  // Track props to adjust state during render (React recommended pattern for state sync without effect)
  const [prevSyncKey, setPrevSyncKey] = useState<{ id?: string; isOpen: boolean }>({
    id: chunkToEdit?.id,
    isOpen
  });

  if (prevSyncKey.id !== chunkToEdit?.id || prevSyncKey.isOpen !== isOpen) {
    setPrevSyncKey({ id: chunkToEdit?.id, isOpen });
    if (chunkToEdit) {
      const resolved = resolveChunkIpas(chunkToEdit);
      setChunkText(chunkToEdit.chunk || "");
      setMeaning(chunkToEdit.meaning || "");
      setChunkIpa(resolved.chunkIpa);
      setIsChunkIpaEdited(Boolean(chunkToEdit.chunkIpa || chunkToEdit.ipa));
      setLevel(chunkToEdit.level || "B1");
      setTopicId(chunkToEdit.topicId || "CUSTOM");
      setCustomTopicName(chunkToEdit.topicName || "");
      setDetailMeaning(chunkToEdit.detailMeaning || "");
      setTags(chunkToEdit.tags && chunkToEdit.tags.length > 0 ? chunkToEdit.tags : ["custom", "speaking"]);

      // Populate multiple examples
      if (chunkToEdit.examples && chunkToEdit.examples.length > 0) {
        setExamples(
          chunkToEdit.examples.map((ex, idx) => ({
            id: ex.id || `ex_${idx + 1}`,
            sentence: ex.sentence || "",
            translation: ex.translation || "",
            sentenceIpa: ex.sentenceIpa || (ex.sentence ? getPhraseIpa(ex.sentence) : ""),
            context: ex.context || "",
            isIpaEdited: Boolean(ex.sentenceIpa)
          }))
        );
      } else {
        const initialSentence = chunkToEdit.exampleSentence || chunkToEdit.cleanExample || "";
        setExamples([
          {
            id: "ex_init_1",
            sentence: initialSentence,
            translation: chunkToEdit.translation || "",
            sentenceIpa: resolved.sentenceIpa,
            context: chunkToEdit.context || "",
            isIpaEdited: Boolean(chunkToEdit.sentenceIpa)
          }
        ]);
      }

      setShowAdvanced(true);
    } else {
      setChunkText("");
      setMeaning("");
      setChunkIpa("");
      setIsChunkIpaEdited(false);
      setLevel("B1");
      setTopicId(existingTopics[0]?.topicId || "CUSTOM");
      setCustomTopicName("Từ vựng của tôi");
      setDetailMeaning("");
      setTags(["custom", "speaking"]);
      setExamples([
        { id: 'ex_default_1', sentence: '', translation: '', sentenceIpa: '', context: '' },
      ]);
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
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isTopicMenuOpen]);

  if (!isOpen) return null;

  // Real-time Chunk text typing with automatic IPA generation
  const handleChunkTextChange = (val: string) => {
    setChunkText(val);
    if (!isChunkIpaEdited || !chunkIpa.trim()) {
      if (val.trim()) {
        const autoIpa = getPhraseIpa(val.trim());
        setChunkIpa(autoIpa);
      } else {
        setChunkIpa("");
      }
    }
  };

  const handleChunkIpaChange = (val: string) => {
    setChunkIpa(val);
    setIsChunkIpaEdited(true);
  };

  const handleForceGenerateChunkIpa = () => {
    const trimmed = chunkText.trim();
    if (!trimmed) return;
    const generated = getPhraseIpa(trimmed);
    setChunkIpa(generated);
    setIsChunkIpaEdited(false);
  };

  // Example management
  const handleExampleSentenceChange = (index: number, val: string) => {
    setExamples((prev) => {
      const next = [...prev];
      const current = next[index];
      if (!current) return prev;

      let newIpa = current.sentenceIpa;
      if (!current.isIpaEdited || !current.sentenceIpa.trim()) {
        newIpa = val.trim() ? getPhraseIpa(val.trim()) : "";
      }

      next[index] = {
        ...current,
        sentence: val,
        sentenceIpa: newIpa
      };
      return next;
    });
  };

  const handleExampleIpaChange = (index: number, val: string) => {
    setExamples((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], sentenceIpa: val, isIpaEdited: true };
      }
      return next;
    });
  };

  const handleForceGenerateExampleIpa = (index: number) => {
    setExamples((prev) => {
      const next = [...prev];
      const ex = next[index];
      if (ex && ex.sentence.trim()) {
        next[index] = {
          ...ex,
          sentenceIpa: getPhraseIpa(ex.sentence.trim()),
          isIpaEdited: false
        };
      }
      return next;
    });
  };

  const handleExampleTranslationChange = (index: number, val: string) => {
    setExamples((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], translation: val };
      }
      return next;
    });
  };

  const handleExampleContextChange = (index: number, val: string) => {
    setExamples((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], context: val };
      }
      return next;
    });
  };

  const handleAddExample = () => {
    soundManager.playClick();
    setExamples((prev) => [
      ...prev,
      {
        id: `ex_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        sentence: "",
        translation: "",
        sentenceIpa: "",
        context: ""
      }
    ]);
  };

  const handleRemoveExample = (index: number) => {
    soundManager.playClick();
    setExamples((prev) => prev.filter((_, i) => i !== index));
  };

  const handleTestAudio = (text: string) => {
    const target = text.trim() || chunkText.trim();
    if (target) {
      speechService.speak(target, 1.0);
    }
  };

  // Check if example sentence contains the chunk keywords
  const isChunkInSentence = (sentence: string) => {
    if (!chunkText.trim() || !sentence.trim()) return true;
    const cleanExample = sentence.toLowerCase();
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

    // Quick Add validation: Chunk and Meaning are required
    if (!trimmedChunk) {
      setErrorMessage("Vui lòng nhập cụm từ tiếng Anh (trường bắt buộc).");
      return;
    }

    if (!trimmedMeaning) {
      setErrorMessage("Vui lòng nhập nghĩa cốt lõi tiếng Việt (trường bắt buộc).");
      return;
    }

    const selectedTopic = existingTopics.find((t) => t.topicId === topicId);
    const resolvedTopicName =
      topicId === "CUSTOM" ? customTopicName.trim() || "Từ vựng của tôi" : selectedTopic?.topicName || "Tổng hợp";
    const resolvedTopicIcon = topicId === "CUSTOM" ? "⭐" : selectedTopic?.icon || "📁";

    // Auto-resolve Chunk IPA if blank
    let finalChunkIpa = chunkIpa.trim();
    if (!finalChunkIpa && trimmedChunk) {
      finalChunkIpa = getPhraseIpa(trimmedChunk);
    }

    // Process all examples
    const validExamples: ChunkExample[] = examples
      .map((ex, idx) => {
        const s = ex.sentence.trim();
        const cleanS = s ? s.replace(/[*_`]/g, "") : "";
        let ipa = ex.sentenceIpa.trim();
        if (!ipa && s) {
          ipa = getPhraseIpa(s);
        }
        return {
          id: ex.id || `ex_${idx + 1}`,
          sentence: s,
          cleanSentence: cleanS,
          sentenceIpa: ipa,
          translation: ex.translation.trim(),
          context: ex.context.trim()
        };
      })
      .filter((ex) => ex.sentence || ex.translation || ex.context);

    // Primary example for 100% backward compatibility
    const primary = validExamples[0] || {
      sentence: "",
      cleanSentence: "",
      sentenceIpa: "",
      translation: "",
      context: ""
    };

    const updatedChunk: SpeakingChunk = {
      id: chunkToEdit?.id || `custom_chunk_${Date.now()}`,
      topicId: topicId,
      topicName: resolvedTopicName,
      topicIcon: resolvedTopicIcon,
      sectionTitle: chunkToEdit?.sectionTitle || resolvedTopicName,
      number: chunkToEdit?.number || 999,
      chunk: trimmedChunk,
      meaning: trimmedMeaning,
      level: level || "B1",
      detailMeaning: detailMeaning.trim() || trimmedMeaning,
      exampleSentence: primary.sentence,
      cleanExample: primary.cleanSentence || primary.sentence,
      ipa: finalChunkIpa,
      chunkIpa: finalChunkIpa,
      sentenceIpa: primary.sentenceIpa,
      translation: primary.translation || "",
      context: primary.context || "",
      tags: tags.length > 0 ? tags : ["custom", "speaking"],
      isCustom: true,
      examples: validExamples.length > 0 ? validExamples : undefined
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
    topicId === "CUSTOM"
      ? { topicId: "CUSTOM", topicName: customTopicName || "Từ vựng tự tạo / Khác", icon: "⭐" }
      : existingTopics.find((t) => t.topicId === topicId) || {
          topicId: "CUSTOM",
          topicName: "Từ vựng tự tạo",
          icon: "⭐"
        };

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
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
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
              onChange={(e) => handleChunkTextChange(e.target.value)}
              autoFocus
            />
            <span className="notion-required-star" title="Trường bắt buộc">
              *
            </span>
          </div>

          {/* Core Properties: Nghĩa tiếng Việt */}
          <div className="notion-properties-table">
            <div className="notion-property-row">
              <div className="notion-prop-label">
                <span>🎯</span>
                <span>
                  Nghĩa cốt lõi <span className="notion-required-star">*</span>
                </span>
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

          {/* Collapsible Accordion Toggle */}
          <div className="notion-toggle-advanced-wrap">
            <button type="button" className="notion-toggle-advanced-btn" onClick={() => setShowAdvanced(!showAdvanced)}>
              <ChevronDown size={15} className={`notion-toggle-chevron ${showAdvanced ? "expanded" : ""}`} />
              <span>
                {showAdvanced ? "Thu gọn tùy chỉnh nâng cao" : "Tùy chỉnh nâng cao (Chủ đề, Ví dụ câu, IPA...)"}
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
                            className={`notion-menu-item ${topicId === "CUSTOM" ? "selected" : ""}`}
                            onClick={() => {
                              setTopicId("CUSTOM");
                              setIsTopicMenuOpen(false);
                            }}
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
                        onChange={(e) => setCustomTopicName(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Property: Phiên âm IPA Cụm từ (Tự động sinh khi gõ) */}
                <div className="notion-property-row">
                  <div className="notion-prop-label">
                    <span>🔤</span>
                    <span>IPA Cụm từ</span>
                  </div>
                  <div className="notion-prop-value flex items-center gap-2">
                    <input
                      type="text"
                      className="notion-inline-input flex-1"
                      placeholder="Tự động sinh khi gõ cụm từ... (hoặc tự chỉnh sửa)"
                      value={chunkIpa}
                      onChange={(e) => handleChunkIpaChange(e.target.value)}
                    />
                    {chunkText.trim() && (
                      <button
                        type="button"
                        onClick={handleForceGenerateChunkIpa}
                        className="notion-btn-inline-action"
                        title="Tự động đồng bộ lại phiên âm chuẩn Mỹ cho cụm từ này"
                      >
                        <Wand2 size={13} />
                        <span>Tạo lại IPA</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="notion-content-divider" />

              {/* Multiple Examples Section */}
              <div className="notion-examples-list-wrap">
                <div className="notion-examples-header">
                  <span className="notion-section-subhead">Danh sách câu ví dụ thực tế ({examples.length})</span>
                </div>

                {examples.map((ex, index) => {
                  const showWarning = chunkText.trim() && ex.sentence.trim() && !isChunkInSentence(ex.sentence);

                  return (
                    <div key={ex.id} className="notion-callout-editor notion-example-item-card">
                      <div className="callout-editor-header">
                        <div className="callout-label-row">
                          <MessageSquare size={15} className="callout-icon" />
                          <span className="callout-title">Câu ví dụ thực tế #{index + 1}</span>
                        </div>
                        <div className="callout-actions-row">
                          <button
                            type="button"
                            className="callout-listen-btn"
                            onClick={() => handleTestAudio(ex.sentence)}
                            title="Nghe thử phát âm câu ví dụ này"
                          >
                            <Volume2 size={14} />
                            <span>Nghe thử</span>
                          </button>
                          {examples.length > 1 && (
                            <button
                              type="button"
                              className="callout-remove-btn"
                              onClick={() => handleRemoveExample(index)}
                              title="Xóa câu ví dụ này"
                            >
                              <Trash2 size={14} />
                              <span>Xóa</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <textarea
                        className="notion-callout-textarea"
                        rows={2}
                        placeholder={`Ví dụ #${index + 1}: Let's touch base next Monday after the team meeting...`}
                        value={ex.sentence}
                        onChange={(e) => handleExampleSentenceChange(index, e.target.value)}
                      />

                      {/* Sentence IPA Editor inside Callout Box */}
                      <div className="callout-sentence-ipa-row">
                        <div className="callout-sentence-ipa-label">
                          <span>🔤</span>
                          <span>Phiên âm IPA câu ví dụ (tự sinh khi gõ):</span>
                        </div>
                        <div className="callout-sentence-ipa-input-wrap">
                          <input
                            type="text"
                            className="notion-inline-input callout-sentence-ipa-input flex-1"
                            placeholder="Tự động sinh khi gõ câu ví dụ... (hoặc tự chỉnh sửa)"
                            value={ex.sentenceIpa}
                            onChange={(e) => handleExampleIpaChange(index, e.target.value)}
                          />
                          {ex.sentence.trim() && (
                            <button
                              type="button"
                              onClick={() => handleForceGenerateExampleIpa(index)}
                              className="notion-btn-inline-action"
                              title="Tự động đồng bộ lại phiên âm IPA cho câu ví dụ này"
                            >
                              <Wand2 size={13} />
                              <span>Tạo lại IPA</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Translation & Context inside the Example Card */}
                      <div className="notion-example-meta-fields">
                        <div className="sub-field">
                          <label className="sub-field-label">🇻🇳 Dịch nghĩa câu ví dụ #{index + 1}:</label>
                          <input
                            type="text"
                            className="notion-sub-input"
                            placeholder="Ví dụ: Hãy trao đổi nhanh vào thứ Hai tới sau buổi họp..."
                            value={ex.translation}
                            onChange={(e) => handleExampleTranslationChange(index, e.target.value)}
                          />
                        </div>

                        <div className="sub-field">
                          <label className="sub-field-label">💡 Ghi chú ngữ cảnh (tùy chọn):</label>
                          <input
                            type="text"
                            className="notion-sub-input"
                            placeholder="Ví dụ: Thường dùng trong email công việc hoặc khi muốn trao đổi ngắn gọn"
                            value={ex.context}
                            onChange={(e) => handleExampleContextChange(index, e.target.value)}
                          />
                        </div>
                      </div>

                      {showWarning && (
                        <div className="chunk-context-hint">
                          <AlertTriangle size={14} className="shrink-0 text-amber-600" />
                          <span>
                            Gợi ý: Câu ví dụ nên chứa cụm từ <strong>&quot;{chunkText}&quot;</strong> để bài tập nhại
                            câu và điền từ hoạt động chuẩn xác nhất.
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Add Example Button */}
                <button
                  type="button"
                  className="notion-btn-add-example"
                  onClick={handleAddExample}
                  title="Thêm một câu ví dụ khác cho cụm từ này"
                >
                  <Plus size={15} />
                  <span>Thêm câu ví dụ khác</span>
                </button>
              </div>
            </div>
          )}

          {/* Notion Page Footer Actions */}
          <div className="notion-modal-footer">
            {isEditing && onDelete && (
              <button type="button" className="notion-btn-danger" onClick={handleDelete} title="Xóa chunk này">
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
                <span>{isEditing ? "Cập Nhật Thay Đổi" : "Lưu Vào Kho Chunks"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
