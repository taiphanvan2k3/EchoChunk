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

function getInitialChunkState(chunkToEdit?: SpeakingChunk | null) {
  if (!chunkToEdit) {
    return {
      chunkText: "",
      meaning: "",
      chunkIpa: "",
      isChunkIpaEdited: false,
      level: "B1",
      topicId: "CUSTOM",
      customTopicName: "Từ vựng của tôi",
      tags: ["custom", "speaking"],
      examples: [
        { id: "ex_default_1", sentence: "", translation: "", sentenceIpa: "", context: "" }
      ] as ModalExampleItem[],
      showAdvanced: false
    };
  }

  const resolved = resolveChunkIpas(chunkToEdit);
  const safeTopicId =
    !chunkToEdit.topicId || chunkToEdit.topicId === "STUDIED" || chunkToEdit.topicId === "ALL"
      ? "CUSTOM"
      : chunkToEdit.topicId;

  let initialExamples: ModalExampleItem[];
  if (chunkToEdit.examples && chunkToEdit.examples.length > 0) {
    initialExamples = chunkToEdit.examples.map((ex, idx) => ({
      id: ex.id || `ex_${idx + 1}`,
      sentence: ex.sentence || "",
      translation: ex.translation || "",
      sentenceIpa: ex.sentenceIpa || (ex.sentence ? getPhraseIpa(ex.sentence) : ""),
      context: ex.context || "",
      isIpaEdited: Boolean(ex.sentenceIpa)
    }));
  } else {
    const initialSentence = chunkToEdit.exampleSentence || chunkToEdit.cleanExample || "";
    initialExamples = [
      {
        id: "ex_init_1",
        sentence: initialSentence,
        translation: chunkToEdit.translation || "",
        sentenceIpa: resolved.sentenceIpa,
        context: chunkToEdit.context || "",
        isIpaEdited: Boolean(chunkToEdit.sentenceIpa)
      }
    ];
  }

  return {
    chunkText: chunkToEdit.chunk || "",
    meaning: chunkToEdit.meaning || "",
    chunkIpa: resolved.chunkIpa,
    isChunkIpaEdited: Boolean(chunkToEdit.chunkIpa || chunkToEdit.ipa),
    level: chunkToEdit.level || "B1",
    topicId: safeTopicId,
    customTopicName: chunkToEdit.topicName || "Từ vựng của tôi",
    tags: chunkToEdit.tags && chunkToEdit.tags.length > 0 ? chunkToEdit.tags : ["custom", "speaking"],
    examples: initialExamples,
    showAdvanced: true
  };
}

interface UseChunkEditorParams {
  chunkToEdit?: SpeakingChunk | null;
  existingTopics: TopicMeta[];
  onSave: (chunk: SpeakingChunk) => void;
  onDelete?: (chunkId: string) => void;
  onClose: () => void;
}

export function useChunkEditor({
  chunkToEdit,
  existingTopics,
  onSave,
  onDelete,
  onClose
}: UseChunkEditorParams) {
  const isEditing = Boolean(chunkToEdit);
  const initial = getInitialChunkState(chunkToEdit);

  // ── Core state ────────────────────────────────────────────────────────────
  const [chunkText, setChunkText] = useState(initial.chunkText);
  const [meaning, setMeaning] = useState(initial.meaning);
  const [chunkIpa, setChunkIpa] = useState(initial.chunkIpa);
  const [isChunkIpaEdited, setIsChunkIpaEdited] = useState(initial.isChunkIpaEdited);
  const [level, setLevel] = useState(initial.level);
  const [topicId, setTopicId] = useState(initial.topicId);
  const [customTopicName, setCustomTopicName] = useState(initial.customTopicName);
  const [tags, setTags] = useState<string[]>(initial.tags);
  const [examples, setExamples] = useState<ModalExampleItem[]>(initial.examples);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(initial.showAdvanced);

  // ── UI refs ───────────────────────────────────────────────────────────────
  const [isTopicMenuOpen, setIsTopicMenuOpen] = useState(false);
  const topicDropdownRef = useRef<HTMLDivElement>(null);
  const textareaRefs = useRef<{ [key: number]: HTMLTextAreaElement | null }>({});

  // ── Sync state when chunkToEdit changes (during-render pattern) ──
  const [prevChunkId, setPrevChunkId] = useState<string | undefined>(chunkToEdit?.id);

  if (prevChunkId !== chunkToEdit?.id) {
    setPrevChunkId(chunkToEdit?.id);
    const nextState = getInitialChunkState(chunkToEdit);
    setChunkText(nextState.chunkText);
    setMeaning(nextState.meaning);
    setChunkIpa(nextState.chunkIpa);
    setIsChunkIpaEdited(nextState.isChunkIpaEdited);
    setLevel(nextState.level);
    setTopicId(nextState.topicId);
    setCustomTopicName(nextState.customTopicName);
    setTags(nextState.tags);
    setExamples(nextState.examples);
    setShowAdvanced(nextState.showAdvanced);
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

    const cleanTopicId = (!topicId || topicId === "STUDIED" || topicId === "ALL") ? "CUSTOM" : topicId;

    const updatedChunk: SpeakingChunk = {
      id: chunkToEdit?.id || `custom_chunk_${Date.now()}`,
      topicId: cleanTopicId,
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
    topicId === "CUSTOM" || topicId === "STUDIED" || topicId === "ALL"
      ? { topicId: "CUSTOM", topicName: customTopicName || "Từ vựng tự tạo / Khác", icon: "⭐" }
      : existingTopics.find((t) => t.topicId === topicId && t.topicId !== "STUDIED" && t.topicId !== "ALL") || {
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
