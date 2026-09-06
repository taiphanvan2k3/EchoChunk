'use client';

import React, { useState, useMemo } from 'react';
import { SpeakingChunk, SRSRating } from '@/types';
import { soundManager } from '@/lib/sound';
import { speechService } from '@/lib/speech';
import { Volume2, CheckCircle2, HelpCircle, Edit2, Lightbulb, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatMarkdown } from '@/lib/formatMarkdown';

interface ChunkBlanksModeProps {
  chunk: SpeakingChunk;
  onRate: (rating: SRSRating, accuracy: number) => void;
  currentIndex: number;
  totalInQueue: number;
  onEditChunk?: (chunk: SpeakingChunk) => void;
}

interface MaskedParts {
  before: string;
  targetInSentence: string;
  after: string;
}

export const ChunkBlanksMode: React.FC<ChunkBlanksModeProps> = ({
  chunk,
  onRate,
  currentIndex,
  totalInQueue,
  onEditChunk,
}) => {
  const [prevChunkId, setPrevChunkId] = useState(chunk.id);
  const [userAnswer, setUserAnswer] = useState('');
  const [isRevealed, setIsRevealed] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showLettersHint, setShowLettersHint] = useState(false);

  // Reset state synchronously when chunk prop changes (React recommended pattern)
  if (prevChunkId !== chunk.id) {
    setPrevChunkId(chunk.id);
    setUserAnswer('');
    setIsRevealed(false);
    setIsCorrect(null);
    setShowLettersHint(false);
  }

  // Extract masked parts cleanly from exampleSentence
  const maskedParts = useMemo<MaskedParts>(() => {
    const rawExample = chunk.exampleSentence || chunk.cleanExample || '';

    // 1. Primary: Match **`chunk`** or **chunk** markers in exampleSentence
    const boldMatch = rawExample.match(/^([\s\S]*?)\*\*`?([\s\S]+?)`?\*\*([\s\S]*)$/);
    if (boldMatch) {
      return {
        before: boldMatch[1].replace(/`/g, '').trimStart(),
        targetInSentence: boldMatch[2].replace(/`/g, '').trim(),
        after: boldMatch[3].replace(/`/g, '').trimEnd(),
      };
    }

    // 2. Secondary: Direct substring match with chunk.chunk (case-insensitive)
    const clean = chunk.cleanExample || rawExample.replace(/[\*`]/g, '');
    const escaped = chunk.chunk.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const directMatch = clean.match(new RegExp(`^(.*?)(?:${escaped})(.*)$`, 'i'));
    if (directMatch) {
      return {
        before: directMatch[1],
        targetInSentence: chunk.chunk,
        after: directMatch[2],
      };
    }

    // 3. Fallback: Word by word smart pronoun replacement
    const words = chunk.chunk.trim().replace(/[\.\?\!\,\:\;]+$/, '').split(/\s+/);
    const patternParts = words.map((w) => {
      const wl = w.toLowerCase();
      if (["one's", "someone's", "sb's"].includes(wl)) return "(?:my|your|his|her|its|our|their|one's|someone's|[a-zA-Z]+\'s)";
      if (["someone", "somebody", "sb"].includes(wl)) return "(?:me|you|him|her|us|them|someone|somebody|[a-zA-Z]+)";
      if (["something", "sth"].includes(wl)) return "(?:something|sth|[\\w\\s]{1,30}?)";
      if (wl === "oneself") return "(?:myself|yourself|himself|herself|ourselves|themselves|oneself)";
      return w.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    });

    try {
      const smartRegex = new RegExp(`^(.*?)\\b(${patternParts.join('\\s+')})\\b(.*)$`, 'i');
      const smartMatch = clean.match(smartRegex);
      if (smartMatch) {
        return {
          before: smartMatch[1],
          targetInSentence: smartMatch[2],
          after: smartMatch[3],
        };
      }
    } catch {
      // Ignore regex syntax errors
    }

    // 4. Absolute fallback
    return {
      before: clean,
      targetInSentence: chunk.chunk,
      after: '',
    };
  }, [chunk]);

  // Meaning to display: Prefer detailMeaning (specific) over general deck name
  const effectiveMeaning = useMemo(() => {
    return chunk.detailMeaning && chunk.detailMeaning.trim().length > 0
      ? chunk.detailMeaning.trim()
      : chunk.meaning;
  }, [chunk]);

  // Valid answer candidates
  const validTargets = useMemo(() => {
    const set = new Set<string>();
    const norm = (s: string) =>
      s
        .toLowerCase()
        .replace(/['"\.,/#!$%^&*;:{}=\-_`~()?]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    set.add(norm(chunk.chunk));
    if (maskedParts.targetInSentence) {
      set.add(norm(maskedParts.targetInSentence));
    }

    const strippedChunk = norm(chunk.chunk).replace(/\b(ones|someones|someone|something|sth|sb)\b/g, '').replace(/\s+/g, ' ').trim();
    if (strippedChunk.length > 2) set.add(strippedChunk);

    const strippedSentenceTarget = norm(maskedParts.targetInSentence).replace(/\b(my|your|his|her|its|our|their)\b/g, '').replace(/\s+/g, ' ').trim();
    if (strippedSentenceTarget.length > 2) set.add(strippedSentenceTarget);

    return Array.from(set);
  }, [chunk.chunk, maskedParts.targetInSentence]);

  // Word count of the blank phrase
  const targetPhrase = maskedParts.targetInSentence || chunk.chunk;
  const wordCount = useMemo(() => {
    return targetPhrase.trim().split(/\s+/).filter(Boolean).length;
  }, [targetPhrase]);

  // First letter hint
  const hintText = useMemo(() => {
    const firstWord = targetPhrase.trim().split(/\s+/)[0] || targetPhrase;
    const letters = firstWord.slice(0, Math.min(3, firstWord.length));
    return `${letters}... (${wordCount} từ)`;
  }, [targetPhrase, wordCount]);

  const handleCheck = () => {
    setIsRevealed(true);
    const cleanUser = userAnswer
      .toLowerCase()
      .replace(/['"\.,/#!$%^&*;:{}=\-_`~()?]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanUser) {
      setIsCorrect(false);
      soundManager.playError();
      speechService.speak(chunk.cleanExample);
      return;
    }

    const matched = validTargets.some(
      (target) =>
        cleanUser === target ||
        (cleanUser.length >= 4 && target.includes(cleanUser)) ||
        (target.length >= 4 && cleanUser.includes(target))
    );

    if (matched) {
      setIsCorrect(true);
      soundManager.playSuccess();
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.65 } });
    } else {
      setIsCorrect(false);
      soundManager.playError();
    }

    speechService.speak(chunk.cleanExample);
  };

  const handleRevealDirectly = () => {
    setIsRevealed(true);
    setIsCorrect(false);
    soundManager.playClick();
    speechService.speak(chunk.cleanExample);
  };

  return (
    <div className="practice-card">
      {/* Top Meta Bar */}
      <div className="card-top-bar">
        <div className="meta-badges">
          <span className="badge topic-badge">
            {chunk.topicIcon} {chunk.topicName}
          </span>
          <span className="badge level-badge">{chunk.level}</span>
          <span className="badge number-badge">#{chunk.number}</span>
        </div>

        <div className="card-top-actions">
          {onEditChunk && (
            <button
              className="card-quick-edit-btn"
              onClick={() => onEditChunk(chunk)}
              title="Chỉnh sửa chunk này"
            >
              <Edit2 size={13} />
              <span>Sửa</span>
            </button>
          )}
          <span className="queue-indicator">
            {currentIndex + 1} / {totalInQueue}
          </span>
        </div>
      </div>

      {/* Challenge Title & Detailed Vietnamese Meaning */}
      <div className="blanks-challenge-header">
        <span className="challenge-tag">🧩 Active Recall: Điền cụm từ vào ô trống</span>

        {/* Highlighted Vietnamese Meaning of the Blank */}
        <div className="target-meaning-highlight">
          <span className="meaning-label-pill">Cụm từ tiếng Anh cần điền có nghĩa là:</span>
          <h3 className="vietnamese-prompt">&ldquo;{effectiveMeaning}&rdquo;</h3>
        </div>

        {/* Full Vietnamese Translation of the Sentence */}
        {chunk.translation && (
          <div className="sentence-translation-hint-box">
            <span className="translation-hint-label">🇻🇳 Dịch nghĩa câu:</span>
            <p className="translation-hint-text">&ldquo;{chunk.translation}&rdquo;</p>
          </div>
        )}

        {/* Smart Hint Chips Row */}
        <div className="hints-chips-row">
          <span className="hint-chip word-count-chip">
            📝 Cần điền <strong>{wordCount} từ</strong>
          </span>

          {!showLettersHint ? (
            <button
              type="button"
              className="hint-chip toggle-letters-chip"
              onClick={() => setShowLettersHint(true)}
              title="Xem gợi ý các chữ cái đầu của cụm từ"
            >
              <Lightbulb size={13} />
              <span>Gợi ý chữ cái đầu?</span>
            </button>
          ) : (
            <span className="hint-chip active-letters-chip">
              💡 Bắt đầu bằng: <strong>{hintText}</strong>
            </span>
          )}

          {chunk.context && (
            <span className="hint-chip context-chip" title="Gợi ý ngữ cảnh sử dụng">
              💡 {chunk.context}
            </span>
          )}
        </div>
      </div>

      {/* Masked Sentence Display with Prominent [ ? ] Blank */}
      <div className={`masked-sentence-card ${isRevealed ? 'is-revealed' : ''}`}>
        <p className="masked-text">
          &ldquo;{formatMarkdown(maskedParts.before)}
          {!isRevealed ? (
            <span className="cloze-blank-box" title="Vị trí cụm từ cần điền">
              [ ? ]
            </span>
          ) : (
            <span className="cloze-revealed-box">
              {maskedParts.targetInSentence}
            </span>
          )}
          {formatMarkdown(maskedParts.after)}&rdquo;
        </p>
      </div>

      {/* Interactive Input or Revealed Solution */}
      {!isRevealed ? (
        <div className="blanks-interaction-area">
          <div className="answer-input-zone">
            <input
              type="text"
              className="chunk-input"
              placeholder={`Gõ cụm từ tiếng Anh (${wordCount} từ)...`}
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
              autoFocus
            />
            <button className="submit-answer-btn" onClick={handleCheck}>
              <span>Kiểm tra & Mở khóa (Enter)</span>
            </button>
          </div>

          <div className="blanks-assist-row">
            <span className="assist-tip-text">
              Nhấn <strong>Enter</strong> để kiểm tra hoặc nghe đáp án
            </span>
            <button className="assist-btn text-muted-btn" onClick={handleRevealDirectly}>
              <span>Chưa nhớ ra? Xem đáp án ngay</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      ) : (
        <div className="revealed-answer-box">
          <div className="answer-status-row">
            {isCorrect ? (
              <div className="result-tag success">
                <CheckCircle2 size={18} />
                <span>Xuất sắc! Bạn nhớ và điền rất chính xác.</span>
              </div>
            ) : (
              <div className="result-tag error">
                <HelpCircle size={18} />
                <span>Đáp án đúng bên dưới, hãy nghe và nhại lại nhé:</span>
              </div>
            )}
            <button className="play-audio-btn small" onClick={() => speechService.speak(chunk.cleanExample)}>
              <Volume2 size={16} />
              <span>Nghe câu mẫu</span>
            </button>
          </div>

          <div className="revealed-chunk-display">
            <span className="revealed-chunk-name">{chunk.chunk}</span>
            {chunk.ipa && <span className="revealed-chunk-ipa">{chunk.ipa}</span>}
          </div>

          <p className="full-revealed-sentence">&ldquo;{formatMarkdown(chunk.exampleSentence || chunk.cleanExample)}&rdquo;</p>
          {chunk.translation && (
            <p className="revealed-sentence-translation">➜ {chunk.translation}</p>
          )}

          {/* SRS Rating Bar */}
          <div className="srs-rating-container" style={{ marginTop: '1.5rem' }}>
            <span className="srs-label">Đánh giá để lên lịch ôn tập (SRS):</span>
            <div className="srs-buttons-grid">
              <button className="srs-btn srs-again" onClick={() => onRate(1, isCorrect ? 100 : 30)}>
                <span className="srs-num">1</span>
                <span className="srs-text">Chưa thuộc</span>
                <span className="srs-sub">Ôn lại sớm</span>
              </button>
              <button className="srs-btn srs-hard" onClick={() => onRate(2, isCorrect ? 100 : 60)}>
                <span className="srs-num">2</span>
                <span className="srs-text">Hơi khó</span>
                <span className="srs-sub">2 ngày sau</span>
              </button>
              <button className="srs-btn srs-good" onClick={() => onRate(3, isCorrect ? 100 : 85)}>
                <span className="srs-num">3</span>
                <span className="srs-text">Nhớ tốt</span>
                <span className="srs-sub">4 ngày sau</span>
              </button>
              <button className="srs-btn srs-easy" onClick={() => onRate(4, 100)}>
                <span className="srs-num">4</span>
                <span className="srs-text">Rất dễ</span>
                <span className="srs-sub">7+ ngày sau</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
