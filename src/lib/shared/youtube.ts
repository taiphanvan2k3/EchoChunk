/**
 * 🎬 YouTube Shared Utilities
 * Shared between client and server components safely.
 */

const RE_YOUTUBE = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
const RE_RAW_ID = /^[a-zA-Z0-9_-]{11}$/;

/**
 * Trích xuất video ID từ URL YouTube hoặc chuỗi ID trực tiếp
 */
export function extractVideoId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  const clean = urlOrId.trim();
  if (RE_RAW_ID.test(clean)) {
    return clean;
  }
  const match = clean.match(RE_YOUTUBE);
  return match ? match[1] : null;
}
