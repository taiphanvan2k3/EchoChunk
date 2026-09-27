'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { SpeakingChunk, SRSRating } from '@/types';
import { soundManager } from '@/lib/client/sound';
import { speechService } from '@/lib/client/speech';
import { getPhraseIpa } from '@/lib/shared/ipa';
import {
  Volume2,
  Mic,
  MicOff,
  CheckCircle2,
  HelpCircle,
  Edit2,
  Languages,
  ArrowRight,
  Keyboard,
  Sparkles,
  Eye,
  EyeOff,
  Shuffle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatMarkdown } from '@/lib/shared/formatMarkdown';

interface QuickReflexModeProps {
  chunk: SpeakingChunk;
  onRate: (rating: SRSRating, accuracy: number) => void;
  onShuffle?: () => void;
  currentIndex: number;
  totalInQueue: number;
  onEditChunk?: (chunk: SpeakingChunk) => void;
}

type ReflexSpeedOption = 5 | 10 | 0; // 0 = untimed/zen mode
type InputMethod = 'voice' | 'text';

export const QuickReflexMode: React.FC<QuickReflexModeProps> = ({
  chunk,
  onRate,
  onShuffle,
  currentIndex,
  totalInQueue,
  onEditChunk,
}) => {
  // Config state
  const [speedOption, setSpeedOption] = useState<ReflexSpeedOption>(10);
  const [inputMethod, setInputMethod] = useState<InputMethod>('voice');
  const [showChunkHint, setShowChunkHint] = useState(false);

  // Challenge execution state
  const [prevChunkId, setPrevChunkId] = useState(chunk.id);
  const [activeExampleIndex, setActiveExampleIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [isRevealed, setIsRevealed] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [spokenTranscript, setSpokenTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [reflexAccuracy, setReflexAccuracy] = useState<number | null>(null);

  // Synchronous state reset on chunk change (React recommended pattern)
  if (prevChunkId !== chunk.id) {
    setPrevChunkId(chunk.id);
    setActiveExampleIndex(0);
    setTimeLeft(speedOption === 0 ? 0 : speedOption);
    setIsTimerRunning(speedOption > 0);
    setIsRevealed(false);
    setTextInput('');
    setSpokenTranscript('');
    setIsRecording(false);
    setShowChunkHint(false);
    setReflexAccuracy(null);
  }

  // Active example resolution
  const activeExample = useMemo(() => {
    if (chunk.examples && chunk.examples.length > 0) {
      const idx = Math.min(activeExampleIndex, chunk.examples.length - 1);
      return chunk.examples[idx] || chunk.examples[0];
    }
    return {
      id: 'primary',
      sentence: chunk.exampleSentence || chunk.cleanExample || '',
      cleanSentence: chunk.cleanExample || chunk.exampleSentence || '',
      sentenceIpa: chunk.sentenceIpa || '',
      translation: chunk.translation || '',
      context: chunk.context || '',
    };
  }, [chunk, activeExampleIndex]);

  const targetSentenceClean = useMemo(() => {
    const s = activeExample.cleanSentence || activeExample.sentence || chunk.cleanExample || chunk.chunk;
    return s.replace(/[*_`]/g, '');
  }, [activeExample, chunk.cleanExample, chunk.chunk]);

  const targetSentenceRaw = useMemo(() => {
    return activeExample.sentence || activeExample.cleanSentence || chunk.exampleSentence || chunk.cleanExample || chunk.chunk;
  }, [activeExample, chunk.exampleSentence, chunk.cleanExample, chunk.chunk]);

  const targetTranslation = activeExample.translation || chunk.translation || chunk.meaning;
  const targetContext = activeExample.context || chunk.context;

  const playAudio = useCallback((rate: number = 1.0) => {
    soundManager.playClick();
    speechService.speak(targetSentenceClean || chunk.chunk, rate);
  }, [targetSentenceClean, chunk.chunk]);

  // Evaluate translation match against target sentence and core chunk
  const calculateMatch = useCallback((userInput: string): number => {
    const normalize = (str: string) =>
      str
        .toLowerCase()
        .replace(/[\'’]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(Boolean);

    const userWords = normalize(userInput);
    const targetWords = normalize(targetSentenceClean || chunk.chunk);
    const chunkWords = normalize(chunk.chunk);

    if (userWords.length === 0) return 0;

    // Check if the essential chunk phrase is included
    const userStr = userWords.join(' ');
    const chunkStr = chunkWords.join(' ');
    const chunkFound = userStr.includes(chunkStr);

    let matchCount = 0;
    const targetSet = new Set(targetWords);
    userWords.forEach((w) => {
      if (targetSet.has(w)) matchCount++;
    });

    let score = Math.round((matchCount / Math.max(targetWords.length, 1)) * 100);

    // Give high score boost if the user remembered the key speaking chunk
    if (chunkFound) {
      score = Math.max(score, 80);
    }

    return Math.min(100, Math.max(0, score));
  }, [targetSentenceClean, chunk.chunk]);

  const revealSolution = useCallback((score: number) => {
    setIsTimerRunning(false);
    setIsRevealed(true);
    speechService.stopListening();
    setIsRecording(false);
    setReflexAccuracy(score);

    if (score >= 70) {
      soundManager.playSuccess();
      confetti({ particleCount: 35, spread: 55, origin: { y: 0.65 } });
    } else if (score > 0) {
      soundManager.playSuccess();
    } else {
      soundManager.playError();
    }

    playAudio();
  }, [playAudio]);

  const handleCheckAnswer = useCallback(() => {
    const candidate = inputMethod === 'voice' ? (spokenTranscript || textInput) : (textInput || spokenTranscript);
    const score = calculateMatch(candidate);
    revealSolution(score);
  }, [inputMethod, spokenTranscript, textInput, calculateMatch, revealSolution]);

  const handleTimeUp = useCallback(() => {
    soundManager.playBuzzer();
    const candidate = textInput || spokenTranscript;
    revealSolution(calculateMatch(candidate));
  }, [textInput, spokenTranscript, calculateMatch, revealSolution]);

  // Timer countdown effect
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isTimerRunning && speedOption > 0 && timeLeft > 0 && !isRevealed) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            handleTimeUp();
            return 0;
          }
          if (prev <= 3) {
            soundManager.playTick();
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isTimerRunning, speedOption, timeLeft, isRevealed, handleTimeUp]);

  // Keyboard shortcut listener (Space = audio, 1 = Chưa kịp, 2/Enter/ArrowRight = Tiếp tục)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleCheckAnswer();
        }
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        playAudio();
      } else if (isRevealed) {
        if (e.key === '1') onRate(1, reflexAccuracy || 40);
        else if (e.key === '2' || e.key === 'Enter' || e.key === 'ArrowRight') onRate(3, reflexAccuracy || 85);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRevealed, reflexAccuracy, playAudio, handleCheckAnswer, onRate]);

  const handleRevealDirectly = () => {
    revealSolution(0);
  };

  const toggleRecording = () => {
    if (isRecording) {
      speechService.stopListening();
      setIsRecording(false);
      if (spokenTranscript.trim()) {
        handleCheckAnswer();
      }
    } else {
      setSpokenTranscript('');
      setIsRecording(true);

      speechService.startListening(
        (interim) => {
          setSpokenTranscript(interim);
        },
        (final) => {
          setIsRecording(false);
          if (final.trim()) {
            const score = calculateMatch(final);
            revealSolution(score);
          }
        },
        () => {
          setIsRecording(false);
          soundManager.playError();
        },
        () => {
          setIsRecording(false);
        },
        2800 // 2.8s pause auto-evaluates translation reflex
      );
    }
  };

  const handleSelectSpeed = (speed: ReflexSpeedOption) => {
    setSpeedOption(speed);
    setTimeLeft(speed);
    setIsTimerRunning(speed > 0 && !isRevealed);
  };

  const chunkAmericanIpa = useMemo(() => {
    return chunk.chunkIpa || chunk.ipa || (chunk.chunk ? getPhraseIpa(chunk.chunk) : '');
  }, [chunk]);

  return (
    <div className="practice-card reflex-card">
      {/* Card Header Meta */}
      <div className="card-top-bar">
        <div className="meta-badges">
          <span className="badge reflex-mode-badge">
            <Languages size={13} />
            <span>Phản xạ Dịch: Việt ➔ Anh</span>
          </span>
          <span className="badge topic-badge">
            {chunk.topicIcon} {chunk.topicName}
          </span>
          <span className="badge level-badge">{chunk.level}</span>
        </div>

        <div className="card-top-actions">
          {onShuffle && (
            <button
              type="button"
              className="card-quick-edit-btn card-shuffle-btn"
              onClick={onShuffle}
              title="Xáo trộn ngẫu nhiên thứ tự các câu trong chủ đề này"
            >
              <Shuffle size={13} />
              <span>Xáo trộn</span>
            </button>
          )}
          {onEditChunk && (
            <button
              type="button"
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

      {/* Reflex Speed & Timer Bar */}
      <div className="reflex-controls-bar">
        <div className="speed-pills-group">
          <span className="speed-label">⏱️ Giới hạn phản xạ:</span>
          <button
            type="button"
            className={`speed-option-btn ${speedOption === 5 ? 'active' : ''}`}
            onClick={() => handleSelectSpeed(5)}
            title="Thử thách phản xạ nhanh 5 giây"
          >
            ⚡ 5 giây
          </button>
          <button
            type="button"
            className={`speed-option-btn ${speedOption === 10 ? 'active' : ''}`}
            onClick={() => handleSelectSpeed(10)}
            title="Thời gian chuẩn 10 giây"
          >
            ⏱️ 10 giây
          </button>
          <button
            type="button"
            className={`speed-option-btn ${speedOption === 0 ? 'active' : ''}`}
            onClick={() => handleSelectSpeed(0)}
            title="Thư thả suy nghĩ không giới hạn thời gian"
          >
            🧘 Thư thả
          </button>
        </div>

        {/* Input Method Switcher */}
        <div className="input-method-switch">
          <button
            type="button"
            className={`method-btn ${inputMethod === 'voice' ? 'active' : ''}`}
            onClick={() => setInputMethod('voice')}
            title="Luyện phản xạ bằng cách nói qua Micro"
          >
            <Mic size={14} />
            <span>Nói qua Mic</span>
          </button>
          <button
            type="button"
            className={`method-btn ${inputMethod === 'text' ? 'active' : ''}`}
            onClick={() => setInputMethod('text')}
            title="Luyện phản xạ bằng cách gõ phím"
          >
            <Keyboard size={14} />
            <span>Gõ phím</span>
          </button>
        </div>
      </div>

      {/* Main Vietnamese Prompt Challenge */}
      <div className="vietnamese-reflex-hero">
        <div className="vn-prompt-header">
          <span className="vn-flag-badge">🇻🇳 Tình huống bạn cần diễn đạt bằng tiếng Anh:</span>
          {speedOption > 0 && !isRevealed && (
            <div className={`countdown-chip ${timeLeft <= 3 ? 'urgent' : ''}`}>
              <span className="countdown-number">{timeLeft}</span>
              <span className="countdown-unit">giây</span>
            </div>
          )}
        </div>

        {/* Multi-example switcher if chunk has multiple examples */}
        {chunk.examples && chunk.examples.length > 1 && (
          <div className="example-selector-bar reflex-selector-bar">
            <span className="example-selector-label">Ngữ cảnh ví dụ ({chunk.examples.length}):</span>
            <div className="example-selector-pills">
              {chunk.examples.map((ex, idx) => (
                <button
                  key={ex.id || idx}
                  type="button"
                  className={`example-selector-pill ${activeExampleIndex === idx ? 'active' : ''}`}
                  onClick={() => {
                    setActiveExampleIndex(idx);
                    setIsRevealed(false);
                    setTextInput('');
                    setSpokenTranscript('');
                    setIsRecording(false);
                    setReflexAccuracy(null);
                    setTimeLeft(speedOption === 0 ? 0 : speedOption);
                    soundManager.playClick();
                  }}
                >
                  Ví dụ #{idx + 1}
                </button>
              ))}
            </div>
          </div>
        )}

        <h2 className="vietnamese-sentence-prompt">
          &ldquo;{targetTranslation}&rdquo;
        </h2>

        {/* Optional Context & Chunk Hint */}
        <div className="reflex-hint-row">
          {targetContext && (
            <span className="reflex-context-pill">
              💡 <strong>Ngữ cảnh:</strong> {targetContext}
            </span>
          )}

          <button
            type="button"
            className="toggle-chunk-hint-btn"
            onClick={() => setShowChunkHint(!showChunkHint)}
            title="Xem gợi ý cụm từ tiếng Anh cốt lõi cần dùng"
          >
            {showChunkHint ? <EyeOff size={13} /> : <Eye size={13} />}
            <span>{showChunkHint ? 'Ẩn gợi ý cụm từ' : 'Gợi ý cụm từ cốt lõi?'}</span>
          </button>

          {showChunkHint && (
            <div className="revealed-chunk-hint-box">
              <span>Cụm cần dùng nghĩa là: <strong>{chunk.meaning}</strong></span>
              <span className="hint-chunk-start">➔ Bắt đầu bằng: <code>{chunk.chunk.slice(0, 3)}...</code></span>
            </div>
          )}
        </div>
      </div>

      {/* Reflex Interaction Area (Before Revelation) */}
      {!isRevealed ? (
        <div className="reflex-action-container">
          {inputMethod === 'voice' ? (
            /* Voice Reflex Input */
            <div className="voice-reflex-box">
              <button
                type="button"
                className={`reflex-mic-btn ${isRecording ? 'recording' : ''}`}
                onClick={toggleRecording}
                title={isRecording ? 'Dừng & Chấm điểm phản xạ' : 'Bật Mic & Nói to câu tiếng Anh'}
              >
                {isRecording ? <MicOff size={32} /> : <Mic size={32} />}
                <span className="mic-glow-ring"></span>
              </button>

              <div className="voice-reflex-hint">
                <span className="voice-hint-title">
                  {isRecording ? '🔴 Đang nghe câu dịch của bạn...' : 'Bấm Micro và nói to câu tiếng Anh tương ứng'}
                </span>
                <span className="voice-hint-sub">
                  {isRecording ? 'Nói xong bấm lại Mic hoặc dừng 2.5s để chấm phản xạ.' : 'Tập thói quen bật ra câu tiếng Anh ngay lập tức.'}
                </span>
              </div>

              {/* Live speech feedback */}
              {spokenTranscript && (
                <div className="live-speech-card reflex-live-card">
                  <p className="live-speech-text">&ldquo;{spokenTranscript}&rdquo;</p>
                </div>
              )}
            </div>
          ) : (
            /* Text Typing Reflex Input */
            <div className="text-reflex-box">
              <div className="text-input-group">
                <input
                  type="text"
                  className="reflex-input-field"
                  placeholder="Gõ câu dịch tiếng Anh của bạn và nhấn Enter..."
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  autoFocus
                />
                <button
                  type="button"
                  className="submit-reflex-btn"
                  onClick={handleCheckAnswer}
                >
                  <span>Kiểm tra</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Quick skip / reveal helper */}
          <div className="reflex-footer-helpers">
            <button
              type="button"
              className="reveal-solution-btn"
              onClick={handleRevealDirectly}
            >
              <span>Chưa nhớ ra? Xem đáp án bản xứ ngay</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      ) : (
        /* Revealed Answer & Bilingual Comparison */
        <div className="revealed-reflex-solution">
          <div className="solution-status-banner">
            <div className="status-left">
              {reflexAccuracy !== null && reflexAccuracy >= 70 ? (
                <div className="status-badge-chip success">
                  <CheckCircle2 size={18} />
                  <span>Phản xạ xuất sắc! ({reflexAccuracy}% khớp bản xứ)</span>
                </div>
              ) : reflexAccuracy !== null && reflexAccuracy > 0 ? (
                <div className="status-badge-chip warning">
                  <Sparkles size={18} />
                  <span>Khá tốt! Đã nắm được ý chính ({reflexAccuracy}% khớp)</span>
                </div>
              ) : (
                <div className="status-badge-chip missed">
                  <HelpCircle size={18} />
                  <span>Đáp án chuẩn người bản xứ bên dưới:</span>
                </div>
              )}
            </div>

            <button
              type="button"
              className="play-audio-btn small"
              onClick={() => playAudio(1.0)}
              title="Phím tắt: Space"
            >
              <Volume2 size={16} />
              <span>Nghe câu mẫu (Space)</span>
            </button>
          </div>

          {/* Your Attempt vs Native English Comparison */}
          <div className="bilingual-comparison-grid">
            {/* Native Speaker Model Sentence */}
            <div className="comparison-card native-card">
              <span className="card-sub-label">🇬🇧🇺🇸 Câu chuẩn người bản xứ nói:</span>
              <p className="native-sentence-text">
                &ldquo;{formatMarkdown(targetSentenceRaw)}&rdquo;
              </p>
              <div className="native-chunk-meta">
                <span className="chunk-pill-highlight">
                  🔑 Cụm cốt lõi: <strong>{chunk.chunk}</strong>
                </span>
                {chunkAmericanIpa && (
                  <span className="chunk-ipa-pill">
                    🇺🇸 {chunkAmericanIpa}
                  </span>
                )}
                <span className="chunk-meaning-pill">
                  ➜ {chunk.meaning}
                </span>
              </div>
            </div>

            {/* What you said or typed */}
            {(spokenTranscript || textInput) && (
              <div className="comparison-card user-attempt-card">
                <span className="card-sub-label">👤 Câu bạn vừa diễn đạt:</span>
                <p className="user-attempt-text">
                  &ldquo;{spokenTranscript || textInput}&rdquo;
                </p>
                <div className="attempt-footer">
                  <span className="attempt-score">
                    Độ tương đồng: <strong>{reflexAccuracy}%</strong>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Streamlined Binary SRS Rating Bar */}
          <div className="srs-rating-container" style={{ marginTop: '1.5rem' }}>
            <div className="srs-header-row">
              <span className="srs-label">Đánh giá độ phản xạ (SRS):</span>
              <span className="srs-hint-text">Bấm &ldquo;Tiếp tục&rdquo; để tự động tăng độ khó & khoảng cách ôn tập</span>
            </div>
            <div className="srs-buttons-grid-binary">
              <button
                type="button"
                className="srs-btn srs-btn-forget"
                onClick={() => onRate(1, reflexAccuracy || 30)}
                title="Chưa kịp phản xạ hoặc còn vấp (Phím tắt: 1)"
              >
                <div className="srs-btn-top">
                  <span className="srs-text">Chưa kịp</span>
                  <span className="srs-shortcut-badge">Phím 1</span>
                </div>
                <span className="srs-sub">Luyện lại sớm (&lt; 1 ngày)</span>
              </button>

              <button
                type="button"
                className="srs-btn srs-btn-next"
                onClick={() => onRate(3, reflexAccuracy || 85)}
                title="Phản xạ tốt, chuyển tiếp tục (Phím tắt: Enter hoặc 2)"
              >
                <div className="srs-btn-top">
                  <span className="srs-text">Tiếp tục ➔</span>
                  <span className="srs-shortcut-badge srs-badge-primary">Enter ↵</span>
                </div>
                <span className="srs-sub">Phản xạ mượt • Tự động tăng chu kỳ SRS</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
