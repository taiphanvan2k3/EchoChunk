import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config';
import { YouTubeLessonData, YouTubeSentence } from '@/types/youtube';

const COLLECTION_NAME = 'youtube_transcripts';

/**
 * Lấy dữ liệu phụ đề đã được cache trong Cloud Firestore.
 * Trả về null nếu video chưa từng được transcript hoặc có lỗi xảy ra.
 */
export async function getCachedTranscript(videoId: string): Promise<YouTubeLessonData | null> {
  try {
    const docRef = doc(db, COLLECTION_NAME, videoId);
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      return null;
    }

    const data = snap.data();
    const sentences = data?.sentences as YouTubeSentence[] | undefined;

    if (!sentences || !Array.isArray(sentences) || sentences.length === 0) {
      return null;
    }

    return {
      videoId: data.videoId || videoId,
      videoTitle: data.videoTitle || 'YouTube Speaking Practice',
      sentences,
      totalSentences: data.totalSentences || sentences.length,
      completedCount: 0,
    };
  } catch (error) {
    console.warn(`[FirestoreCache] Lỗi khi đọc cache cho video ${videoId}:`, error);
    return null;
  }
}

/**
 * Lưu trữ phụ đề video vào Cloud Firestore để chia sẻ công khai cho tất cả người dùng,
 * tránh việc gọi lại YouTube hoặc third-party API tốn kém chi phí.
 */
export async function saveCachedTranscript(
  data: YouTubeLessonData,
  source: 'native' | 'ytranscript' = 'native'
): Promise<void> {
  try {
    if (!data.videoId || !data.sentences || data.sentences.length === 0) {
      return;
    }

    // Chuẩn hóa dữ liệu câu & từ, loại bỏ các giá trị undefined tránh Firestore báo lỗi serialization
    const cleanSentences = data.sentences.map((s) => ({
      id: s.id,
      index: s.index,
      text: s.text,
      start: s.start,
      duration: s.duration,
      words: (s.words || []).map((w) => ({
        word: w.word,
        start: w.start,
        end: w.end,
      })),
      isCompleted: false,
    }));

    // Kiểm tra giới hạn kích thước document Firestore (1MB limit)
    const estimatedSize = JSON.stringify(cleanSentences).length;
    if (estimatedSize > 950000) {
      console.warn(
        `[FirestoreCache] Video ${data.videoId} quá dài (~${Math.round(estimatedSize / 1024)}KB), vượt ngưỡng an toàn của document Firestore (1MB). Bỏ qua lưu cache.`
      );
      return;
    }

    const docRef = doc(db, COLLECTION_NAME, data.videoId);

    await setDoc(
      docRef,
      {
        videoId: data.videoId,
        videoTitle: data.videoTitle || 'YouTube Speaking Practice',
        totalSentences: data.totalSentences || cleanSentences.length,
        sentences: cleanSentences,
        source,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );

    console.log(
      `[FirestoreCache] Đã lưu cache thành công cho video ${data.videoId} (${cleanSentences.length} câu, nguồn: ${source})`
    );
  } catch (error) {
    console.warn(`[FirestoreCache] Không thể lưu cache cho video ${data.videoId}:`, error);
  }
}
