"use client";

import { useState, useEffect, useRef } from "react";
import { SpeakingChunk, TopicMeta, ChunkExample } from "@/types";
import { speechService } from "@/lib/client/speech";
import { soundManager } from "@/lib/client/sound";
import { getPhraseIpa, resolveChunkIpas } from "@/lib/shared/ipa";

export interface ModalExampleItem {
  id: string;
  sentence: string;
  translation: string;
  sentenceIpa: string;
  context: string;
  isIpaEdited?: boolean;
}

interface UseChunkEditorParams {
  isOpen: boolean;
  chunkToEdit?: SpeakingChunk | null;
  existingTopics: TopicMeta[];
  onSave: (chunk: SpeakingChunk) => void;
  onDelete?: (chunkId: string) => void;
  onClose: () => void;
}

export function useChunkEditor({
  isOpen,
  chunkToEdit,
  existingTopics,
  onSave,
  onDelete,
  onClose
}: UseChunkEditorParams) {
  const isEditing = Boolean(chunkToEdit);

  // ── Core state ────────────────────────────────────────────────────────────
  const [chunkText, setChunkText] = useState("");
  const [meaning, setMeaning] = useState("");
  const [chunkIpa, setChunkIpa] = useState("");
  const [isChunkIpaEdited, setIsChunkIpaEdited] = useState(false);
  const [level, setLevel] = useState("B1");
  const [topicId, setTopicId] = useState(existingTopics[0]?.topicId || "CUSTOM");
  const [customTopicName, setCustomTopicName] = useState("");
  const [tags, setTags] = useState<string[]>(["custom", "speaking"]);
  const [examples, setExamples] = useState<ModalExampleItem[]>([
    { id: "ex_init_1", sentence: "", translation: "", sentenceIpa: "", context: "" }
  ]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(Boolean(chunkToEdit));

  // ── UI refs ───────────────────────────────────────────────────────────────
  const [isTopicMenuOpen, setIsTopicMenuOpen] = useState(false);
  const topicDropdownRef = useRef<HTMLDivElement>(null);
  const textareaRefs = useRef<{ [key: number]: HTMLTextAreaElement | null }>({});

  // ── Sync state when chunkToEdit / isOpen changes (during-render pattern) ──
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
      setTags(chunkToEdit.tags && chunkToEdit.tags.length > 0 ? chunkToEdit.tags : ["custom", "speaking"]);

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
      setTags(["custom", "speaking"]);
      setExamples([{ id: "ex_default_1", sentence: "", translation: "", sentenceIpa: "", context: "" }]);
      setShowAdvanced(false);
    }
    setErrorMessage(null);
  }

  // ── Click outside to close dropdown ──────────────────────────────────────
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

  // ── Chunk IPA handlers ────────────────────────────────────────────────────
  const handleChunkTextChange = (val: string) => {
    setChunkText(val);
    if (!isChunkIpaEdited || !chunkIpa.trim()) {
      setChunkIpa(val.trim() ? getPhraseIpa(val.trim()) : "");
    }
  };

  const handleChunkIpaChange = (val: string) => {
    setChunkIpa(val);
    setIsChunkIpaEdited(true);
  };

  const handleForceGenerateChunkIpa = () => {
    const trimmed = chunkText.trim();
    if (!trimmed) return;
    setChunkIpa(getPhraseIpa(trimmed));
    setIsChunkIpaEdited(false);
  };

  // ── Example handlers ──────────────────────────────────────────────────────
  const handleExampleSentenceChange = (index: number, val: string) => {
    setExamples((prev) => {
      const next = [...prev];
      const current = next[index];
      if (!current) return prev;
      const newIpa =
        !current.isIpaEdited || !current.sentenceIpa.trim()
          ? val.trim() ? getPhraseIpa(val.trim()) : ""
          : current.sentenceIpa;
      next[index] = { ...current, sentence: val, sentenceIpa: newIpa };
      return next;
    });
  };

  const handleExampleIpaChange = (index: number, val: string) => {
    setExamples((prev) => {
      const next = [...prev];
      if (next[index]) next[index] = { ...next[index], sentenceIpa: val, isIpaEdited: true };
      return next;
    });
  };

  const handleForceGenerateExampleIpa = (index: number) => {
    setExamples((prev) => {
      const next = [...prev];
      const ex = next[index];
      if (ex && ex.sentence.trim()) {
        next[index] = { ...ex, sentenceIpa: getPhraseIpa(ex.sentence.trim()), isIpaEdited: false };
      }
      return next;
    });
  };

  const handleExampleTranslationChange = (index: number, val: string) => {
    setExamples((prev) => {
      const next = [...prev];
      if (next[index]) next[index] = { ...next[index], translation: val };
      return next;
    });
  };

  const handleExampleContextChange = (index: number, val: string) => {
    setExamples((prev) => {
      const next = [...prev];
      if (next[index]) next[index] = { ...next[index], context: val };
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

  // ── Highlight handlers ────────────────────────────────────────────────────
  const handleTestAudio = (text: string) => {
    const target = text.trim() || chunkText.trim();
    if (target) {
      speechService.speak(target.replace(/[*_`]/g, ""), 1.0);
    }
  };

  const handleToggleHighlight = (index: number) => {
    const textarea = textareaRefs.current[index];
    const ex = examples[index];
    if (!ex) return;

    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = ex.sentence;

      if (start !== end) {
        const selected = text.substring(start, end);
        const isWrapped =
          (selected.startsWith("**`") && selected.endsWith("`**")) ||
          (selected.startsWith("**") && selected.endsWith("**"));

        const replacement = isWrapped
          ? selected.replace(/^\*\*`?|`?\*\*$/g, "")
          : `**\`${selected.replace(/[*`]/g, "")}\`**`;

        const newSentence = text.substring(0, start) + replacement + text.substring(end);
        handleExampleSentenceChange(index, newSentence);

        setTimeout(() => {
          textareaRefs.current[index]?.focus();
          textareaRefs.current[index]?.setSelectionRange(start, start + replacement.length);
        }, 0);
        soundManager.playClick();
        return;
      }
    }

    // Fallback to auto-highlight when nothing selected
    handleAutoHighlightChunk(index);
  };

  const handleAutoHighlightChunk = (index: number) => {
    const ex = examples[index];
    if (!ex || !chunkText.trim() || !ex.sentence.trim()) return;

    const rawSentence = ex.sentence.replace(/[*`]/g, "");
    const escaped = chunkText.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, "i");

    if (regex.test(rawSentence)) {
      handleExampleSentenceChange(index, rawSentence.replace(regex, "**`$1`**"));
      soundManager.playSuccess();
    } else {
      soundManager.playClick();
    }
  };

  const handleClearHighlight = (index: number) => {
    const ex = examples[index];
    if (!ex || !ex.sentence) return;
    handleExampleSentenceChange(index, ex.sentence.replace(/[*_`]/g, ""));
    soundManager.playClick();
  };

  // ── Validation helper ─────────────────────────────────────────────────────
  const isChunkInSentence = (sentence: string): boolean => {
    if (!chunkText.trim() || !sentence.trim()) return true;
    const cleanExample = sentence.toLowerCase();
    const cleanChunk = chunkText.toLowerCase().trim();
    if (cleanExample.includes(cleanChunk)) return true;
    const words = cleanChunk.split(/\s+/).filter((w) => w.length > 3);
    return words.length > 0 ? words.some((w) => cleanExample.includes(w)) : true;
  };

  // ── Save / Delete ─────────────────────────────────────────────────────────
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedChunk = chunkText.trim();
    const trimmedMeaning = meaning.trim();

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

    let finalChunkIpa = chunkIpa.trim();
    if (!finalChunkIpa && trimmedChunk) finalChunkIpa = getPhraseIpa(trimmedChunk);

    const validExamples: ChunkExample[] = examples
      .map((ex, idx) => {
        const s = ex.sentence.trim();
        const cleanS = s ? s.replace(/[*_`]/g, "") : "";
        let ipa = ex.sentenceIpa.trim();
        if (!ipa && s) ipa = getPhraseIpa(s);
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

    const primary = validExamples[0] || {
      sentence: "",
      cleanSentence: "",
      sentenceIpa: "",
      translation: "",
      context: ""
    };

    const updatedChunk: SpeakingChunk = {
      id: chunkToEdit?.id || `custom_chunk_${Date.now()}`,
      topicId,
      topicName: resolvedTopicName,
      topicIcon: resolvedTopicIcon,
      sectionTitle: chunkToEdit?.sectionTitle || resolvedTopicName,
      number: chunkToEdit?.number || 999,
      chunk: trimmedChunk,
      meaning: trimmedMeaning,
      level: level || "B1",
      exampleSentence: primary.sentence,
      cleanExample: primary.cleanSentence || primary.sentence,
      ipa: finalChunkIpa,
      chunkIpa: finalChunkIpa,
      sentenceIpa: primary.sentenceIpa,
      translation: primary.translation || "",
      context: primary.context || "",
      tags: tags.length > 0 ? tags : ["custom", "speaking"],
      isCustom: true,
      ...(validExamples.length > 0 && { examples: validExamples })
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

  // ── Derived values ────────────────────────────────────────────────────────
  const currentSelectedTopic =
    topicId === "CUSTOM"
      ? { topicId: "CUSTOM", topicName: customTopicName || "Từ vựng tự tạo / Khác", icon: "⭐" }
      : existingTopics.find((t) => t.topicId === topicId) || {
          topicId: "CUSTOM",
          topicName: "Từ vựng tự tạo",
          icon: "⭐"
        };

  return {
    // State
    isEditing,
    chunkText,
    meaning,
    setMeaning,
    chunkIpa,
    level,
    setLevel,
    topicId,
    setTopicId,
    customTopicName,
    setCustomTopicName,
    tags,
    examples,
    errorMessage,
    showAdvanced,
    setShowAdvanced,
    isTopicMenuOpen,
    setIsTopicMenuOpen,
    // Refs
    topicDropdownRef,
    textareaRefs,
    // Derived
    currentSelectedTopic,
    // Handlers
    handleChunkTextChange,
    handleChunkIpaChange,
    handleForceGenerateChunkIpa,
    handleExampleSentenceChange,
    handleExampleIpaChange,
    handleForceGenerateExampleIpa,
    handleExampleTranslationChange,
    handleExampleContextChange,
    handleAddExample,
    handleRemoveExample,
    handleTestAudio,
    handleToggleHighlight,
    handleAutoHighlightChunk,
    handleClearHighlight,
    isChunkInSentence,
    handleSave,
    handleDelete
  };
}
