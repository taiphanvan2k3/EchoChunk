import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  startAfter,
  Timestamp,
} from "firebase/firestore";
import { db } from "../config";
import { YouTubeLessonData, YouTubeSentence } from "@/types/youtube";

const COLLECTION_NAME = "youtube_transcripts";

export interface TranscribedVideoSummary {
  videoId: string;
  videoTitle: string;
  totalSentences: number;
  thumbnailUrl: string;
  source: "native" | "ytranscript";
  updatedAt?: number;
}

export interface TranscribedVideosPage {
  videos: TranscribedVideoSummary[];
  nextCursor: number | null;
  hasMore: boolean;
}

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
      videoTitle: data.videoTitle || "YouTube Speaking Practice",
      sentences,
      totalSentences: data.totalSentences || sentences.length,
      completedCount: 0,
      source: (data.source as "native" | "ytranscript") || "native"
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
  source: "native" | "ytranscript" = "native"
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
        end: w.end
      }))
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
        videoTitle: data.videoTitle || "YouTube Speaking Practice",
        totalSentences: data.totalSentences || cleanSentences.length,
        sentences: cleanSentences,
        source,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp()
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

/**
 * Lấy danh sách video đã transcript theo từng trang (cursor-based pagination).
 * Giảm thiểu số lượt đọc Firestore, hỗ trợ tải cuộn vô hạn mượt mà.
 */
export async function getTranscribedVideosList(
  limitCount: number = 12,
  cursor?: number | null
): Promise<TranscribedVideosPage> {
  try {
    const colRef = collection(db, COLLECTION_NAME);
    const fetchLimit = limitCount + 1; // Lấy dư 1 doc để biết còn trang tiếp theo hay không
    let snap;

    try {
      if (cursor && !isNaN(cursor) && cursor > 0) {
        const q = query(
          colRef,
          orderBy("updatedAt", "desc"),
          startAfter(Timestamp.fromMillis(cursor)),
          limit(fetchLimit)
        );
        snap = await getDocs(q);
      } else {
        const q = query(
          colRef,
          orderBy("updatedAt", "desc"),
          limit(fetchLimit)
        );
        snap = await getDocs(q);
      }
    } catch (err) {
      console.warn("[FirestoreCache] Fallback simple query for explore list:", err);
      const q = query(colRef, limit(fetchLimit));
      snap = await getDocs(q);
    }

    const firestoreList: TranscribedVideoSummary[] = [];
    const seenIds = new Set<string>();

    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const videoId = data.videoId || docSnap.id;
      if (!videoId || seenIds.has(videoId)) return;
      seenIds.add(videoId);

      const title = data.videoTitle || "YouTube Speaking Practice";
      const updatedAtMillis =
        data.updatedAt?.toMillis?.() ||
        (typeof data.updatedAt === "number" ? data.updatedAt : undefined);

      firestoreList.push({
        videoId,
        videoTitle: title,
        totalSentences: data.totalSentences || (Array.isArray(data.sentences) ? data.sentences.length : 0),
        thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
        source: (data.source as "native" | "ytranscript") || "native",
        updatedAt: updatedAtMillis
      });
    });

    const hasMore = firestoreList.length > limitCount;
    const pagedVideos = hasMore ? firestoreList.slice(0, limitCount) : firestoreList;
    const lastItem = pagedVideos[pagedVideos.length - 1];
    const nextCursor = hasMore && lastItem?.updatedAt ? lastItem.updatedAt : null;

    return {
      videos: pagedVideos,
      nextCursor,
      hasMore
    };
  } catch (error) {
    console.warn("[FirestoreCache] Lỗi khi lấy danh sách video explore:", error);
    return {
      videos: [],
      nextCursor: null,
      hasMore: false
    };
  }
}
