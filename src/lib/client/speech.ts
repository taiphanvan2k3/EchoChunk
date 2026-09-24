// Speech Synthesis (TTS) & Web Speech Recognition (STT) + Mobile-Optimized Deduplication
import { SpeechEvalResult, WordMatchToken } from '@/types';

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: { transcript: string };
}

interface SpeechRecognitionResultListLike {
  length: number;
  [index: number]: SpeechRecognitionResultLike;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: SpeechRecognitionResultListLike;
}

interface SpeechRecognitionErrorEventLike {
  error: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface CustomWindow extends Window {
  SpeechRecognition?: new () => SpeechRecognitionInstance;
  webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
}

/**
 * Remove consecutive identical words caused by mobile STT stutter
 */
function cleanDuplicateWords(text: string): string {
  if (!text) return '';
  const words = text.trim().split(/\s+/);
  const cleaned: string[] = [];
  for (let i = 0; i < words.length; i++) {
    if (i > 0 && words[i].toLowerCase() === words[i - 1].toLowerCase()) {
      continue;
    }
    cleaned.push(words[i]);
  }
  return cleaned.join(' ');
}

/**
 * Process event.results from Web Speech API.
 * Solves:
 * 1. Android Chrome cumulative results where each final result contains the previous phrase.
 * 2. Desktop discrete results where each final result is a separate chunk.
 * 3. Overlapping interim and final transcripts.
 */
function processSpeechResults(results: SpeechRecognitionResultListLike): string {
  const finalPieces: string[] = [];
  const interimPieces: string[] = [];

  for (let i = 0; i < results.length; i++) {
    const res = results[i];
    const text = res[0]?.transcript?.trim() || '';
    if (!text) continue;
    if (res.isFinal) {
      finalPieces.push(text);
    } else {
      interimPieces.push(text);
    }
  }

  // 1. Merge final pieces intelligently to handle Android cumulative results
  let mergedFinal = '';
  if (finalPieces.length > 0) {
    mergedFinal = finalPieces[0];
    for (let j = 1; j < finalPieces.length; j++) {
      const piece = finalPieces[j];
      if (piece.toLowerCase().startsWith(mergedFinal.toLowerCase())) {
        mergedFinal = piece;
      } else if (mergedFinal.toLowerCase().endsWith(piece.toLowerCase())) {
        continue;
      } else {
        const mWords = mergedFinal.split(/\s+/);
        const pWords = piece.split(/\s+/);
        let overlap = 0;
        const maxCheck = Math.min(mWords.length, pWords.length);
        for (let k = maxCheck; k >= 1; k--) {
          const mSub = mWords.slice(-k).join(' ').toLowerCase();
          const pSub = pWords.slice(0, k).join(' ').toLowerCase();
          if (mSub === pSub) {
            overlap = k;
            break;
          }
        }
        if (overlap > 0) {
          mergedFinal = `${mergedFinal} ${pWords.slice(overlap).join(' ')}`;
        } else {
          mergedFinal = `${mergedFinal} ${piece}`;
        }
      }
    }
  }

  // 2. Latest interim piece
  let mergedInterim = '';
  if (interimPieces.length > 0) {
    mergedInterim = interimPieces[interimPieces.length - 1];
  }

  // 3. Combine final + interim
  let combined = '';
  if (!mergedFinal) {
    combined = mergedInterim;
  } else if (!mergedInterim) {
    combined = mergedFinal;
  } else if (mergedInterim.toLowerCase().startsWith(mergedFinal.toLowerCase())) {
    combined = mergedInterim;
  } else if (mergedFinal.toLowerCase().endsWith(mergedInterim.toLowerCase())) {
    combined = mergedFinal;
  } else {
    const mWords = mergedFinal.split(/\s+/);
    const iWords = mergedInterim.split(/\s+/);
    let overlap = 0;
    const maxCheck = Math.min(mWords.length, iWords.length);
    for (let k = maxCheck; k >= 1; k--) {
      const mSub = mWords.slice(-k).join(' ').toLowerCase();
      const iSub = iWords.slice(0, k).join(' ').toLowerCase();
      if (mSub === iSub) {
        overlap = k;
        break;
      }
    }
    if (overlap > 0) {
      combined = `${mergedFinal} ${iWords.slice(overlap).join(' ')}`;
    } else {
      combined = `${mergedFinal} ${mergedInterim}`;
    }
  }

  return cleanDuplicateWords(combined);
}

class SpeechService {
  private recognition: SpeechRecognitionInstance | null = null;
  private isListening = false;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private lastCombinedTranscript = '';
  private silenceTimeoutMs = 2500; // 2.5s pause tolerance
  private hasFinalized = false;

  private onInterimCb: ((text: string) => void) | null = null;
  private onFinalCb: ((text: string) => void) | null = null;
  private onErrorCb: ((err: string) => void) | null = null;
  private onEndCb: (() => void) | null = null;

  private setupRecognitionHandlers() {
    if (!this.recognition) return;

    this.recognition.onresult = (event: SpeechRecognitionEventLike) => {
      const combined = processSpeechResults(event.results);
      if (!combined) return;

      this.lastCombinedTranscript = combined;

      if (this.onInterimCb) {
        this.onInterimCb(combined);
      }

      this.resetSilenceTimer();
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
      // 'no-speech' is a standard transient pause event in Web Speech API; ignore it
      if (event.error === 'no-speech') {
        return;
      }
      this.clearSilenceTimer();
      this.isListening = false;
      this.hasFinalized = true;

      let errorMsg = `Lỗi nhận diện âm thanh: ${event.error}`;
      if (event.error === 'not-allowed') {
        errorMsg = 'Quyền micro bị từ chối. Vui lòng cho phép quyền micro trên trình duyệt của bạn.';
      } else if (event.error === 'audio-capture') {
        errorMsg = 'Không tìm thấy hoặc không thể kết nối tới Micro.';
      } else if (event.error === 'network') {
        errorMsg = 'Lỗi kết nối mạng nhận diện giọng nói.';
      }

      if (this.onErrorCb) {
        this.onErrorCb(errorMsg);
      }
    };

    this.recognition.onend = () => {
      if (this.isListening) {
        this.finalizeRecognition();
      }
    };
  }

  private finalizeRecognition() {
    this.clearSilenceTimer();

    if (this.hasFinalized) {
      return;
    }
    this.hasFinalized = true;
    this.isListening = false;

    const finalResult = this.lastCombinedTranscript.trim();

    if (this.onFinalCb) {
      const cb = this.onFinalCb;
      this.onFinalCb = null;
      cb(finalResult);
    }

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // ignore
      }
    }

    if (this.onEndCb) {
      const endCb = this.onEndCb;
      this.onEndCb = null;
      endCb();
    }
  }

  private resetSilenceTimer() {
    this.clearSilenceTimer();
    const hasSpoken = this.lastCombinedTranscript.trim().length > 0;

    if (this.silenceTimeoutMs > 0 && hasSpoken) {
      this.silenceTimer = setTimeout(() => {
        if (this.isListening) {
          this.finalizeRecognition();
        }
      }, this.silenceTimeoutMs);
    }
  }

  private clearSilenceTimer() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  private currentAudio: HTMLAudioElement | null = null;
  private currentRequestId = 0;
  private audioUrlCache = new Map<string, string>();
  private readonly MAX_CLIENT_CACHE = 200;

  isRecognitionSupported(): boolean {
    if (typeof window === 'undefined') return false;
    const win = window as CustomWindow;
    return !!(win.SpeechRecognition || win.webkitSpeechRecognition);
  }

  private playAudioUrl(url: string, requestId: number, onEnd?: () => void, onError?: () => void) {
    if (requestId !== this.currentRequestId) return;

    try {
      const audio = new Audio(url);
      this.currentAudio = audio;

      audio.onended = () => {
        if (this.currentAudio === audio) {
          this.currentAudio = null;
        }
        onEnd?.();
      };

      audio.onerror = () => {
        if (this.currentAudio === audio) {
          this.currentAudio = null;
        }
        onError?.();
      };

      audio.play().catch(() => {
        if (this.currentAudio === audio) {
          this.currentAudio = null;
        }
        onError?.();
      });
    } catch {
      onError?.();
    }
  }

  private fallbackBrowserSpeak(text: string, rate: number = 1.0, onEnd?: () => void) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      onEnd?.();
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.lang = 'en-US';

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice =
      voices.find(
        (v) =>
          (v.lang.startsWith('en-US') || v.lang.startsWith('en-GB')) &&
          (v.name.includes('Natural') ||
            v.name.includes('Google') ||
            v.name.includes('Samantha') ||
            v.name.includes('Daniel'))
      ) || voices.find((v) => v.lang.startsWith('en'));

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    if (onEnd) {
      utterance.onend = onEnd;
    }

    window.speechSynthesis.speak(utterance);
  }

  /**
   * Speak English text using Microsoft Edge Neural TTS (en-US-JennyNeural)
   * with ultra-fast in-memory caching and automatic fallback to browser Web Speech API.
   */
  speak(text: string, rate: number = 1.0, onEnd?: () => void) {
    if (typeof window === 'undefined') return;

    // Increment request ID to cancel any in-flight previous audio/fetch
    const requestId = ++this.currentRequestId;
    this.stopSpeakingInternal();

    const cleanText = text.replace(/[*_`]/g, '').trim();
    if (!cleanText) {
      onEnd?.();
      return;
    }

    const cacheKey = `${cleanText}__${rate.toFixed(2)}`;

    // 1. Check client memory cache for instant playback (0ms latency)
    if (this.audioUrlCache.has(cacheKey)) {
      const cachedUrl = this.audioUrlCache.get(cacheKey)!;
      this.playAudioUrl(
        cachedUrl,
        requestId,
        onEnd,
        () => this.fallbackBrowserSpeak(cleanText, rate, onEnd)
      );
      return;
    }

    // 2. Fetch high-definition Neural TTS from /api/tts (Microsoft Edge Neural Voice)
    // Using GET enables Vercel Edge CDN caching globally
    const ttsUrl = `/api/tts?text=${encodeURIComponent(cleanText)}&rate=${rate.toFixed(2)}`;
    fetch(ttsUrl)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`TTS server responded with ${res.status}`);
        }
        if (requestId !== this.currentRequestId) {
          return;
        }
        const blob = await res.blob();
        if (requestId !== this.currentRequestId) return;

        const audioUrl = URL.createObjectURL(blob);

        // Evict oldest if cache gets too large
        if (this.audioUrlCache.size >= this.MAX_CLIENT_CACHE) {
          const oldestKey = this.audioUrlCache.keys().next().value;
          if (oldestKey) {
            const oldUrl = this.audioUrlCache.get(oldestKey);
            if (oldUrl) URL.revokeObjectURL(oldUrl);
            this.audioUrlCache.delete(oldestKey);
          }
        }
        this.audioUrlCache.set(cacheKey, audioUrl);

        this.playAudioUrl(
          audioUrl,
          requestId,
          onEnd,
          () => this.fallbackBrowserSpeak(cleanText, rate, onEnd)
        );
      })
      .catch((err) => {
        console.warn('Edge TTS request failed, falling back to browser speechSynthesis:', err);
        if (requestId === this.currentRequestId) {
          this.fallbackBrowserSpeak(cleanText, rate, onEnd);
        }
      });
  }

  private stopSpeakingInternal() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio.onended = null;
      this.currentAudio.onerror = null;
      this.currentAudio = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  stopSpeaking() {
    this.currentRequestId++;
    this.stopSpeakingInternal();
  }

  /**
   * Start listening synchronously within user gesture tick.
   * STRICTLY SYNCHRONOUS: Avoid any 'await' or async calls before recognition.start()
   * to guarantee Mobile Safari and Chrome do not drop user activation token or lock audio.
   */
  startListening(
    onInterimResult: (transcript: string) => void,
    onFinalResult: (transcript: string) => void,
    onError: (error: string) => void,
    onEnd: () => void,
    silenceTimeoutMs: number = 2500
  ) {
    if (typeof window === 'undefined') return;

    const win = window as CustomWindow;
    const SpeechRecognitionConstructor = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRecognitionConstructor) {
      onError('Trình duyệt không hỗ trợ nhận diện giọng nói (Web Speech API). Hãy dùng Google Chrome hoặc Safari.');
      return;
    }

    this.clearSilenceTimer();

    // Abort previous session if still running
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {
        // ignore
      }
    }

    this.lastCombinedTranscript = '';
    this.hasFinalized = false;
    this.silenceTimeoutMs = silenceTimeoutMs;
    this.onInterimCb = onInterimResult;
    this.onFinalCb = onFinalResult;
    this.onErrorCb = onError;
    this.onEndCb = onEnd;
    this.isListening = true;

    try {
      // Re-instantiate fresh instance to avoid stale state on mobile browsers
      this.recognition = new SpeechRecognitionConstructor();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
      this.recognition.maxAlternatives = 1;
      this.setupRecognitionHandlers();

      // Must be invoked synchronously inside user gesture!
      this.recognition.start();
    } catch (e: unknown) {
      this.isListening = false;
      this.hasFinalized = true;
      const msg = e instanceof Error ? e.message : 'Không thể mở micro.';
      onError(msg);
    }
  }

  stopListening(): string {
    const result = this.lastCombinedTranscript.trim();
    this.finalizeRecognition();
    return result;
  }

  evaluatePronunciation(targetSentence: string, spokenText: string): SpeechEvalResult {
    const normalize = (str: string) =>
      str
        .toLowerCase()
        .replace(/['’]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(Boolean);

    const targetWords = normalize(targetSentence);
    const spokenWords = normalize(spokenText);

    if (targetWords.length === 0) {
      return { transcript: spokenText, accuracy: 100, tokens: [] };
    }

    if (spokenWords.length === 0) {
      return {
        transcript: '',
        accuracy: 0,
        tokens: targetWords.map((w) => ({ word: w, status: 'missing' })),
      };
    }

    let matchCount = 0;
    const tokens: WordMatchToken[] = [];
    const targetSet = new Set(targetWords);

    targetWords.forEach((word) => {
      if (spokenWords.includes(word)) {
        matchCount++;
        tokens.push({ word, status: 'correct' });
      } else {
        tokens.push({ word: word, status: 'missing' });
      }
    });

    spokenWords.forEach((word) => {
      if (!targetSet.has(word)) {
        tokens.push({ word: `+${word}`, status: 'extra' });
      }
    });

    const accuracy = Math.min(100, Math.round((matchCount / targetWords.length) * 100));

    return {
      transcript: spokenText,
      accuracy,
      tokens,
    };
  }
}

export const speechService = new SpeechService();
