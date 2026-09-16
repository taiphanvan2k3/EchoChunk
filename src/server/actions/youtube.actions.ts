'use server';

import { getYouTubeTranscript } from '@/server/services/youtube.service';
import { GetTranscriptResponse } from '@/types/youtube';

/**
 * Server Action: Lấy phụ đề và mốc thời gian từng từ từ YouTube
 * Hàm này chạy 100% trên server Node.js, an toàn và bảo mật.
 */
export async function getYoutubeTranscriptAction(urlOrId: string): Promise<GetTranscriptResponse> {
  try {
    const data = await getYouTubeTranscript(urlOrId);
    return {
      success: true,
      data,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Đã có lỗi xảy ra khi tải video.';
    return {
      success: false,
      error: message,
    };
  }
}
