export interface YouTubeWord {
  word: string;
  start: number; // Thời điểm bắt đầu của từ (giây)
  end: number;   // Thời điểm kết thúc của từ (giây)
}

export interface YouTubeSentence {
  id: string;
  index: number;
  text: string;
  start: number;         // Thời điểm bắt đầu câu (giây)
  duration: number;      // Thời lượng câu (giây)
  words?: YouTubeWord[]; // Mốc thời gian chi tiết của từng từ (hỗ trợ Karaoke)
  isCompleted?: boolean; // Đã luyện tập câu này hay chưa
}

export interface YouTubeLessonData {
  videoId: string;
  videoTitle: string;
  sentences: YouTubeSentence[];
  totalSentences: number;
  completedCount: number;
  source?: 'native' | 'ytranscript';
}

export interface YouTubeHistoryItem {
  videoId: string;
  videoUrl: string;
  videoTitle: string;
  thumbnailUrl: string;
  totalSentences: number;
  completedSentencesCount: number;
  lastStudiedAt: number; // Unix timestamp
}

export interface GetTranscriptResponse {
  success: boolean;
  data?: YouTubeLessonData;
  error?: string;
}
