'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
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

export function QuickReflexMode({
  chunk,
  onRate,
  onShuffle,
  currentIndex,
  totalInQueue,
  onEditChunk,
}: QuickReflexModeProps) {
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
        .replace(/['']/g, '')
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
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
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
    <div className="w-full bg-white border border-notion-border rounded-2xl p-3.5 sm:p-7 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.02)] flex flex-col gap-4 sm:gap-5 relative">
      {/* Card Header Meta */}
      <div className="flex items-center justify-between gap-2 pb-2.5 sm:pb-3.5 border-b border-notion-border">
        <div className="flex items-center gap-1.5 min-w-0 max-w-[65%] sm:max-w-none">
          <span className="inline-flex items-center gap-1 bg-notion-red-bg text-notion-red-text border border-notion-red-border font-bold text-[0.66rem] sm:text-xs py-1 px-1.5 sm:px-2 rounded-md shrink-0">
            <Languages size={12} />
            <span className="hidden sm:inline">Phản xạ:</span>
            <span>VN➔EN</span>
          </span>
          <div className="inline-flex items-center gap-1.5 py-1 px-2 sm:px-2.5 rounded-lg bg-notion-surface-subtle border border-notion-border text-notion-text min-w-0 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <span className="shrink-0 text-xs sm:text-sm leading-none">{chunk.topicIcon}</span>
            <span className="text-[0.74rem] sm:text-xs font-semibold text-notion-text truncate max-w-[90px] xs:max-w-[160px] sm:max-w-none" title={chunk.topicName}>
              {chunk.topicName}
            </span>
            <span className="w-px h-3 bg-notion-border shrink-0" />
            <span
              className={`text-[0.66rem] sm:text-[0.7rem] font-bold tracking-wider uppercase shrink-0 font-mono ${
                chunk.level === 'A2'
                  ? 'text-notion-green-text'
                  : chunk.level === 'B2'
                  ? 'text-notion-purple-text'
                  : 'text-notion-blue-text'
              }`}
            >
              {chunk.level}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {onShuffle && (
            <button
              type="button"
              className="inline-flex items-center gap-1 py-1 px-1.5 sm:px-2.5 rounded-md text-[0.72rem] sm:text-xs font-semibold text-notion-secondary hover:text-notion-text hover:bg-notion-hover transition-colors border border-notion-border bg-white cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
              onClick={onShuffle}
              title="Xáo trộn ngẫu nhiên thứ tự các câu trong chủ đề này"
            >
              <Shuffle size={12} className="shrink-0" />
              <span className="hidden sm:inline">Xáo trộn</span>
            </button>
          )}
          {onEditChunk && (
            <button
              type="button"
              className="inline-flex items-center gap-1 py-1 px-1.5 sm:px-2.5 rounded-md text-[0.72rem] sm:text-xs font-semibold text-notion-secondary hover:text-notion-text hover:bg-notion-hover transition-colors border border-notion-border bg-white cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
              onClick={() => onEditChunk(chunk)}
              title="Chỉnh sửa chunk này"
            >
              <Edit2 size={12} className="shrink-0" />
              <span className="hidden sm:inline">Sửa</span>
            </button>
          )}
          <span className="text-[0.7rem] sm:text-xs text-notion-muted font-mono ml-0.5 sm:ml-1 whitespace-nowrap bg-notion-surface-subtle px-1.5 py-0.5 rounded border border-notion-border">
            {currentIndex + 1} / {totalInQueue}
          </span>
        </div>
      </div>

      {/* Reflex Speed & Timer Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3 p-[0.6rem_0.85rem] bg-notion-surface border border-notion-border rounded-lg">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-notion-secondary mr-1">⏱️ Giới hạn phản xạ:</span>
          <button
            type="button"
            className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all cursor-pointer ${
              speedOption === 5
                ? 'bg-notion-primary text-white border-notion-primary font-semibold'
                : 'bg-white border-notion-border-medium text-notion-secondary hover:bg-notion-hover hover:text-notion-text'
            }`}
            onClick={() => handleSelectSpeed(5)}
            title="Thử thách phản xạ nhanh 5 giây"
          >
            ⚡ 5 giây
          </button>
          <button
            type="button"
            className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all cursor-pointer ${
              speedOption === 10
                ? 'bg-notion-primary text-white border-notion-primary font-semibold'
                : 'bg-white border-notion-border-medium text-notion-secondary hover:bg-notion-hover hover:text-notion-text'
            }`}
            onClick={() => handleSelectSpeed(10)}
            title="Thời gian chuẩn 10 giây"
          >
            ⏱️ 10 giây
          </button>
          <button
            type="button"
            className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all cursor-pointer ${
              speedOption === 0
                ? 'bg-notion-primary text-white border-notion-primary font-semibold'
                : 'bg-white border-notion-border-medium text-notion-secondary hover:bg-notion-hover hover:text-notion-text'
            }`}
            onClick={() => handleSelectSpeed(0)}
            title="Thư thả suy nghĩ không giới hạn thời gian"
          >
            🧘 Thư thả
          </button>
        </div>

        {/* Input Method Switcher */}
        <div className="flex items-center bg-notion-active rounded-md p-0.5 gap-0.5">
          <button
            type="button"
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[5px] text-xs font-medium border-none transition-all cursor-pointer ${
              inputMethod === 'voice'
                ? 'bg-white text-notion-text font-semibold shadow-sm'
                : 'bg-transparent text-notion-secondary hover:text-notion-text'
            }`}
            onClick={() => setInputMethod('voice')}
            title="Luyện phản xạ bằng cách nói qua Micro"
          >
            <Mic size={14} />
            <span>Nói qua Mic</span>
          </button>
          <button
            type="button"
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[5px] text-xs font-medium border-none transition-all cursor-pointer ${
              inputMethod === 'text'
                ? 'bg-white text-notion-text font-semibold shadow-sm'
                : 'bg-transparent text-notion-secondary hover:text-notion-text'
            }`}
            onClick={() => setInputMethod('text')}
            title="Luyện phản xạ bằng cách gõ phím"
          >
            <Keyboard size={14} />
            <span>Gõ phím</span>
          </button>
        </div>
      </div>

      {/* Main Vietnamese Prompt Challenge */}
      <div className="bg-white border border-notion-border border-l-4 border-l-notion-red rounded-lg p-3.5 sm:p-5 flex flex-col gap-2.5 sm:gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-[0.72rem] sm:text-xs font-semibold uppercase tracking-wider text-notion-red-text">
            🇻🇳 Tình huống bạn cần diễn đạt bằng tiếng Anh:
          </span>
          {speedOption > 0 && !isRevealed && (
            <div
              className={`inline-flex items-center gap-1 py-0.5 sm:py-1 px-2 sm:px-2.5 rounded-full font-bold text-xs sm:text-sm font-mono border transition-all ${
                timeLeft <= 3
                  ? 'bg-notion-red text-white border-notion-red animate-pulse'
                  : 'bg-notion-hover text-notion-text border-notion-border'
              }`}
            >
              <span className="text-sm sm:text-base font-extrabold">{timeLeft}</span>
              <span className="text-[0.66rem] font-medium opacity-90">giây</span>
            </div>
          )}
        </div>

        {/* Multi-example switcher if chunk has multiple examples */}
        {chunk.examples && chunk.examples.length > 1 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[0.72rem] sm:text-xs font-semibold text-notion-secondary">Ngữ cảnh ví dụ ({chunk.examples.length}):</span>
            <div className="flex items-center gap-1 flex-wrap">
              {chunk.examples.map((ex, idx) => (
                <button
                  key={ex.id || idx}
                  type="button"
                  className={`px-2 py-0.5 text-[0.72rem] sm:text-xs font-semibold rounded-md border transition-all cursor-pointer ${
                    activeExampleIndex === idx
                      ? 'bg-notion-blue-bg border-notion-primary text-notion-blue-text shadow-sm'
                      : 'bg-white border-notion-border-medium text-notion-secondary hover:bg-notion-btn-secondary hover:text-notion-text'
                  }`}
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

        <h2 className="text-lg sm:text-2xl font-bold text-notion-text leading-[1.45] m-0">
          &ldquo;{targetTranslation}&rdquo;
        </h2>

        {/* Optional Context & Chunk Hint */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {targetContext && (
            <span className="text-xs bg-notion-surface border border-notion-border px-2 py-1 rounded text-notion-secondary">
              💡 <strong>Ngữ cảnh:</strong> {targetContext}
            </span>
          )}

          <button
            type="button"
            className="inline-flex items-center gap-1.5 bg-transparent border-none text-xs text-notion-primary hover:bg-notion-blue-bg cursor-pointer py-1 px-2 rounded transition-colors"
            onClick={() => setShowChunkHint(!showChunkHint)}
            title="Xem gợi ý cụm từ tiếng Anh cốt lõi cần dùng"
          >
            {showChunkHint ? <EyeOff size={13} /> : <Eye size={13} />}
            <span>{showChunkHint ? 'Ẩn gợi ý cụm từ' : 'Gợi ý cụm từ cốt lõi?'}</span>
          </button>

          {showChunkHint && (
            <div className="w-full flex items-center gap-3 text-xs text-notion-secondary bg-notion-surface border border-dashed border-notion-primary p-2.5 px-3 rounded-md flex-wrap">
              <span>Cụm cần dùng nghĩa là: <strong>{chunk.meaning}</strong></span>
              <span className="inline-flex items-center gap-1">
                ➔ Bắt đầu bằng:{' '}
                <code className="bg-white border border-notion-border px-1.5 py-0.5 rounded font-semibold text-notion-primary">
                  {chunk.chunk.slice(0, 3)}...
                </code>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Reflex Interaction Area (Before Revelation) */}
      {!isRevealed ? (
        <div className="flex flex-col items-center gap-4 py-4 w-full">
          {inputMethod === 'voice' ? (
            /* Voice Reflex Input */
            <div className="flex flex-col items-center gap-3 w-full">
              <button
                type="button"
                className={`w-[72px] h-[72px] rounded-full text-white flex items-center justify-center border-none cursor-pointer shadow-[0_4px_16px_rgba(235,87,87,0.4)] hover:scale-105 hover:shadow-[0_6px_20px_rgba(235,87,87,0.5)] transition-all relative ${
                  isRecording ? 'bg-notion-red animate-pulse' : 'bg-notion-red hover:bg-notion-red-hover'
                }`}
                onClick={toggleRecording}
                title={isRecording ? 'Dừng & Chấm điểm phản xạ' : 'Bật Mic & Nói to câu tiếng Anh'}
              >
                {isRecording ? <MicOff size={32} /> : <Mic size={32} />}
              </button>

              <div className="flex flex-col items-center gap-1 text-center">
                <span className="text-sm font-semibold text-notion-text">
                  {isRecording ? '🔴 Đang nghe câu dịch của bạn...' : 'Bấm Micro và nói to câu tiếng Anh tương ứng'}
                </span>
                <span className="text-xs text-notion-secondary">
                  {isRecording ? 'Nói xong bấm lại Mic hoặc dừng 2.5s để chấm phản xạ.' : 'Tập thói quen bật ra câu tiếng Anh ngay lập tức.'}
                </span>
              </div>

              {/* Live speech feedback */}
              {spokenTranscript && (
                <div className="max-w-[540px] mt-2 bg-notion-surface border border-notion-border rounded-lg p-3 text-center">
                  <p className="text-sm font-medium text-notion-text italic">&ldquo;{spokenTranscript}&rdquo;</p>
                </div>
              )}
            </div>
          ) : (
            /* Text Typing Reflex Input */
            <div className="w-full">
              <div className="flex gap-2.5 w-full">
                <input
                  type="text"
                  className="flex-1 px-4 py-3 text-base rounded-lg border border-notion-border-medium bg-white text-notion-text outline-none focus:border-notion-red focus:ring-2 focus:ring-notion-red/20 transition-all shadow-sm"
                  placeholder="Gõ câu dịch tiếng Anh của bạn và nhấn Enter..."
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  autoFocus
                />
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-5 bg-notion-red hover:bg-notion-red-hover text-white rounded-lg border-none font-semibold text-sm cursor-pointer shadow-[0_3px_10px_rgba(235,87,87,0.35)] transition-all shrink-0 hover:-translate-y-px"
                  onClick={handleCheckAnswer}
                >
                  <span>Kiểm tra</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Quick skip / reveal helper */}
          <div className="flex items-center justify-center w-full">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 bg-transparent border-none text-xs text-notion-secondary hover:text-notion-text hover:bg-notion-hover cursor-pointer py-1.5 px-3 rounded-md transition-all"
              onClick={handleRevealDirectly}
            >
              <span>Chưa nhớ ra? Xem đáp án bản xứ ngay</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      ) : (
        /* Revealed Answer & Bilingual Comparison */
        <div className="flex flex-col gap-5 animate-fadeIn">
          <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-notion-border">
            <div className="flex items-center gap-2">
              {reflexAccuracy !== null && reflexAccuracy >= 70 ? (
                <div className="inline-flex items-center gap-2 text-sm font-semibold py-1.5 px-3 rounded-md bg-notion-green-bg text-notion-green-text border border-notion-green-border">
                  <CheckCircle2 size={18} />
                  <span>Phản xạ xuất sắc! ({reflexAccuracy}% khớp bản xứ)</span>
                </div>
              ) : reflexAccuracy !== null && reflexAccuracy > 0 ? (
                <div className="inline-flex items-center gap-2 text-sm font-semibold py-1.5 px-3 rounded-md bg-notion-orange-bg text-notion-orange-text border border-notion-orange-border">
                  <Sparkles size={18} />
                  <span>Khá tốt! Đã nắm được ý chính ({reflexAccuracy}% khớp)</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 text-sm font-semibold py-1.5 px-3 rounded-md bg-notion-hover text-notion-secondary border border-notion-border">
                  <HelpCircle size={18} />
                  <span>Đáp án chuẩn người bản xứ bên dưới:</span>
                </div>
              )}
            </div>

            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-notion-primary hover:bg-notion-primary-hover text-white cursor-pointer transition-colors shadow-sm"
              onClick={() => playAudio(1.0)}
              title="Phím tắt: Space"
            >
              <Volume2 size={16} />
              <span>Nghe câu mẫu (Space)</span>
            </button>
          </div>

          {/* Your Attempt vs Native English Comparison */}
          <div className="grid grid-cols-1 gap-4">
            {/* Native Speaker Model Sentence */}
            <div className="bg-notion-surface border border-notion-border border-l-4 border-l-notion-green rounded-lg p-5 shadow-sm">
              <span className="block text-xs font-semibold text-notion-secondary uppercase tracking-wider mb-2">
                🇬🇧🇺🇸 Câu chuẩn người bản xứ nói:
              </span>
              <p className="text-lg sm:text-xl font-semibold text-notion-text leading-[1.45] mb-3">
                &ldquo;{formatMarkdown(targetSentenceRaw)}&rdquo;
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs bg-notion-green-bg text-notion-green-text border border-notion-green-border py-1 px-2.5 rounded-md font-medium">
                  🔑 Cụm cốt lõi: <strong>{chunk.chunk}</strong>
                </span>
                {chunkAmericanIpa && (
                  <span className="font-ipa text-xs font-semibold text-notion-blue-text bg-notion-blue-bg border border-notion-blue-border py-1 px-2 rounded tracking-[0.015em]">
                    🇺🇸 {chunkAmericanIpa}
                  </span>
                )}
                <span className="text-xs text-notion-secondary">
                  ➜ {chunk.meaning}
                </span>
              </div>
            </div>

            {/* What you said or typed */}
            {(spokenTranscript || textInput) && (
              <div className="bg-white border border-notion-border border-l-4 border-l-notion-primary rounded-lg p-5 shadow-sm">
                <span className="block text-xs font-semibold text-notion-secondary uppercase tracking-wider mb-2">
                  👤 Câu bạn vừa diễn đạt:
                </span>
                <p className="text-base font-medium text-notion-text leading-[1.4] mb-2 italic">
                  &ldquo;{spokenTranscript || textInput}&rdquo;
                </p>
                <div className="flex items-center justify-end">
                  <span className="text-xs text-notion-secondary">
                    Độ tương đồng: <strong>{reflexAccuracy}%</strong>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Streamlined Binary SRS Rating Bar */}
          <div className="flex flex-col gap-2 mt-4 sm:mt-6">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-bold text-notion-blue-text tracking-tight">
                Đánh giá độ phản xạ (SRS):
              </span>
              <span className="text-[0.72rem] text-notion-secondary">
                Bấm &ldquo;Tiếp tục&rdquo; để tự động tăng độ khó & khoảng cách ôn tập
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 items-stretch">
              <button
                type="button"
                className="flex flex-col items-start justify-center p-2.5 sm:p-3.5 rounded-lg border border-notion-border-medium bg-white hover:bg-notion-red-bg hover:border-notion-red-border hover:-translate-y-px hover:shadow-[0_3px_10px_rgba(235,87,87,0.1)] transition-all cursor-pointer group text-left shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
                onClick={() => onRate(1, reflexAccuracy || 30)}
                title="Chưa kịp phản xạ hoặc còn vấp (Phím tắt: 1)"
              >
                <div className="flex items-center justify-between w-full mb-0.5">
                  <span className="text-notion-text group-hover:text-notion-red-text font-bold text-xs sm:text-sm transition-colors">
                    Chưa kịp
                  </span>
                  <span className="font-mono text-[0.66rem] font-semibold px-1.5 py-0.5 rounded bg-notion-surface-subtle text-notion-secondary">
                    Phím 1
                  </span>
                </div>
                <span className="text-notion-muted text-[0.7rem] sm:text-xs mt-0.5">Luyện lại sớm (&lt; 1 ngày)</span>
              </button>

              <button
                type="button"
                className="flex flex-col items-start justify-center p-2.5 sm:p-3.5 rounded-lg border border-notion-primary bg-notion-primary hover:bg-notion-primary-hover hover:border-notion-primary-hover hover:-translate-y-px hover:shadow-[0_4px_14px_rgba(35,131,226,0.35)] transition-all cursor-pointer text-left shadow-[0_2px_8px_rgba(35,131,226,0.22)]"
                onClick={() => onRate(3, reflexAccuracy || 85)}
                title="Phản xạ tốt, chuyển tiếp tục (Phím tắt: Enter hoặc 2)"
              >
                <div className="flex items-center justify-between w-full mb-0.5">
                  <span className="text-white font-bold text-xs sm:text-sm">Tiếp tục ➔</span>
                  <span className="font-mono text-[0.66rem] font-semibold px-1.5 py-0.5 rounded bg-white/20 text-white border border-white/30">
                    Enter ↵
                  </span>
                </div>
                <span className="text-white/85 text-[0.7rem] sm:text-xs mt-0.5">
                  Phản xạ mượt • Tự động tăng chu kỳ SRS
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
