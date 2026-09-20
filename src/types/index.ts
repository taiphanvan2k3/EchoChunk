export type CEFRLevel = 'A2' | 'B1' | 'B2' | 'C1';

export interface ChunkExample {
  id: string;
  sentence: string;
  cleanSentence?: string;
  sentenceIpa?: string;
  translation?: string;
  context?: string;
}

export interface SpeakingChunk {
  id: string;
  topicId: string;
  topicName: string;
  topicIcon: string;
  sectionTitle: string;
  number: number;
  chunk: string;
  meaning: string;
  level: string;
  detailMeaning: string;
  exampleSentence: string;
  cleanExample: string;
  ipa: string;
  chunkIpa?: string;
  sentenceIpa?: string;
  translation: string;
  context: string;
  tags: string[];
  isCustom?: boolean;
  userId?: string;
  examples?: ChunkExample[];
}

export interface TopicMeta {
  topicId: string;
  topicName: string;
  icon: string;
  chunkCount: number;
}

export interface ChunksDataset {
  version: string;
  generatedAt: string;
  totalChunks: number;
  topics: TopicMeta[];
  chunks: SpeakingChunk[];
}

export type SRSRating = 1 | 2 | 3 | 4; // 1: Again, 2: Hard, 3: Good, 4: Easy

export interface ChunkProgress {
  chunkId: string;
  repetitions: number;
  intervalDays: number;
  easeFactor: number;
  dueDate: string; // ISO string
  lastReviewed: string; // ISO string
  confidenceScore: SRSRating;
  accuracyHistory: number[];
  bestAccuracy: number;
}

export interface UserStats {
  streakDays: number;
  lastActiveDate: string; // YYYY-MM-DD
  todayReviewedCount: number;
  totalPracticedCount: number;
  dailyGoal: number; // default 20
}

export type PracticeMode = 'shadowing' | 'blanks' | 'reflex' | 'browse' | 'analytics';

export interface WordMatchToken {
  word: string;
  status: 'correct' | 'missing' | 'extra';
}

export interface SpeechEvalResult {
  transcript: string;
  accuracy: number;
  tokens: WordMatchToken[];
}
