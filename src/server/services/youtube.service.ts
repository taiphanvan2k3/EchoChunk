/**
 * 🎬 YouTube Transcript & Timing Extraction Service
 * 
 * Nguồn gốc & Kiến trúc:
 * - Được kế thừa và phát triển dựa trên giải pháp cốt lõi của thư viện mã nguồn mở `youtube-transcript` (MIT License).
 * - Cải tiến & Nâng cấp độc quyền cho EchoChunk:
 *   1. Nâng cấp bộ phân tích cú pháp XML `srv3` để bóc tách mốc thời gian của TỪNG TỪ (`<s t="ms">`),
 *      phục vụ tính năng Karaoke Word Highlighting theo thời gian thực (điều mà thư viện gốc đã lược bỏ).
 *   2. Hỗ trợ cơ chế phân rã từ tự động cho định dạng `classic` XML đối với phụ đề upload thủ công.
 *   3. Hỗ trợ bóc tách linh hoạt mọi định dạng link YouTube (watch, youtu.be, shorts, embed, raw ID).
 *   4. Tự chủ 100% mã nguồn trong `src/server/services`, loại bỏ sự phụ thuộc vào package ngoài.
 */

import { YouTubeLessonData, YouTubeSentence, YouTubeWord } from '@/types/youtube';

const INNERTUBE_API_URL = 'https://www.youtube.com/youtubei/v1/player?prettyPrint=false';
const INNERTUBE_CLIENT_VERSION = '20.10.38';
const INNERTUBE_USER_AGENT = `com.google.android.youtube/${INNERTUBE_CLIENT_VERSION} (Linux; U; Android 14)`;

const RE_YOUTUBE = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
const RE_RAW_ID = /^[a-zA-Z0-9_-]{11}$/;

/**
 * Trích xuất video ID từ URL YouTube hoặc chuỗi ID trực tiếp
 */
export function extractVideoId(urlOrId: string): string | null {
  const clean = urlOrId.trim();
  if (RE_RAW_ID.test(clean)) {
    return clean;
  }
  const match = clean.match(RE_YOUTUBE);
  return match ? match[1] : null;
}

/**
 * Giải mã các HTML entities thông dụng trong phụ đề
 */
function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/\s+/g, ' ')
    .trim();
}

interface RawCaptionTrack {
  baseUrl: string;
  name?: { simpleText?: string };
  vssId?: string;
  languageCode: string;
  kind?: string;
}

/**
 * Gọi YouTube InnerTube API để lấy thông tin video và danh sách captionTracks
 */
async function fetchPlayerResponse(videoId: string) {
  // Thử lần lượt các client context — TVHTML5 hoạt động tốt hơn từ datacenter IP (Vercel)
  const clients = [
    {
      clientName: 'TVHTML5',
      clientVersion: '7.20250101.00.00',
      userAgent: 'Mozilla/5.0 (SMART-TV; Linux; Tizen 6.0) AppleWebKit/538.1 (KHTML, like Gecko) Version/6.0 TV Safari/538.1',
    },
    {
      clientName: 'ANDROID',
      clientVersion: INNERTUBE_CLIENT_VERSION,
      userAgent: INNERTUBE_USER_AGENT,
    },
  ];

  for (const client of clients) {
    try {
      const res = await fetch(INNERTUBE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': client.userAgent,
          'Accept-Language': 'en-US,en;q=0.9',
          'Origin': 'https://www.youtube.com',
          'Referer': `https://www.youtube.com/watch?v=${videoId}`,
        },
        body: JSON.stringify({
          context: {
            client: {
              clientName: client.clientName,
              clientVersion: client.clientVersion,
              hl: 'en',
              gl: 'US',
            },
          },
          videoId,
        }),
        cache: 'no-store',
      });

      if (!res.ok) continue;
      const data = await res.json();
      const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      // Chỉ return nếu response thực sự có captionTracks
      if (tracks && Array.isArray(tracks) && tracks.length > 0) {
        return data;
      }
    } catch (err) {
      console.error(`[YouTubeService] InnerTube fetch error (${client.clientName}):`, err);
    }
  }

  return null;
}

const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

interface InnerTubePlayerResponse {
  playabilityStatus?: { status?: string };
  videoDetails?: { title?: string; lengthSeconds?: string };
  captions?: {
    playerCaptionsTracklistRenderer?: {
      captionTracks?: RawCaptionTrack[];
    };
  };
}

/**
 * Trích xuất JSON gán cho biến toàn cục trong các thẻ script inline
 */
function parseInlineJson(html: string, globalName: string): InnerTubePlayerResponse | null {
  const startToken = `var ${globalName} = `;
  let startIndex = html.indexOf(startToken);
  if (startIndex === -1) {
    const altToken = `${globalName} = `;
    startIndex = html.indexOf(altToken);
    if (startIndex === -1) return null;
    startIndex += altToken.length;
  } else {
    startIndex += startToken.length;
  }
  let depth = 0;
  for (let i = startIndex; i < html.length; i++) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}') {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(startIndex, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

/**
 * Fallback: cào web nếu InnerTube không trả về phụ đề
 */
async function fetchPlayerResponseFallback(videoId: string) {
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': BROWSER_USER_AGENT,
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    if (!res.ok) return null;
    const html = await res.text();
    return parseInlineJson(html, 'ytInitialPlayerResponse');
  } catch (err) {
    console.error('[YouTubeService] Fallback scraping error:', err);
    return null;
  }
}

/**
 * Phân tích cú pháp XML phụ đề YouTube (hỗ trợ cả srv3 có mốc từ và classic)
 */
function parseTranscriptXml(xml: string): { sentences: YouTubeSentence[] } {
  const sentences: YouTubeSentence[] = [];

  // 1. Thử phân tích định dạng srv3: <p t="ms" d="ms">...<s>word</s>...</p>
  const pRegex = /<p\s+t="(\d+)"\s+d="(\d+)"[^>]*>([\s\S]*?)<\/p>/g;
  let pMatch;
  let index = 1;

  while ((pMatch = pRegex.exec(xml)) !== null) {
    const pStartMs = parseInt(pMatch[1], 10);
    const pDurMs = parseInt(pMatch[2], 10);
    const inner = pMatch[3];

    const sRegex = /<s(?:\s+t="(\d+)")?[^>]*>([^<]*)<\/s>/g;
    let sMatch;
    const rawWords: { text: string; startOffsetMs: number }[] = [];
    let fullText = '';

    while ((sMatch = sRegex.exec(inner)) !== null) {
      const offsetMs = sMatch[1] ? parseInt(sMatch[1], 10) : 0;
      const wordText = decodeEntities(sMatch[2]);
      if (wordText) {
        rawWords.push({ text: wordText, startOffsetMs: offsetMs });
        fullText += (fullText ? ' ' : '') + wordText;
      }
    }

    // Nếu không có thẻ <s>, lấy trực tiếp nội dung chữ trong <p>
    if (rawWords.length === 0) {
      const stripped = decodeEntities(inner.replace(/<[^>]+>/g, ''));
      if (stripped) {
        fullText = stripped;
        // Chia đều thời gian cho các từ
        const splitted = stripped.split(/\s+/).filter(Boolean);
        const wordDur = splitted.length > 0 ? pDurMs / splitted.length : pDurMs;
        splitted.forEach((w, i) => {
          rawWords.push({ text: w, startOffsetMs: Math.round(i * wordDur) });
        });
      }
    }

    if (fullText) {
      const sentenceStartSec = pStartMs / 1000;
      const sentenceDurSec = pDurMs / 1000;
      const sentenceEndSec = sentenceStartSec + sentenceDurSec;

      // Xây dựng mảng words có start và end
      const words: YouTubeWord[] = rawWords.map((rw, i) => {
        const wStart = (pStartMs + rw.startOffsetMs) / 1000;
        let wEnd: number;
        if (i < rawWords.length - 1) {
          // Từ giữa: end = start của từ tiếp theo
          wEnd = (pStartMs + rawWords[i + 1].startOffsetMs) / 1000;
        } else {
          // Từ cuối: giữ đến hết sentence.
          // Từ chỉ sáng khi câu CỦA NÓ đang active,
          // nên kéo dài đến sentenceEnd là an toàn và tránh khoảng trống không có từ nào sáng.
          wEnd = sentenceEndSec;
        }
        // Đảm bảo wEnd > wStart
        if (wEnd <= wStart) wEnd = wStart + 0.15;

        return {
          word: rw.text,
          start: Number(wStart.toFixed(3)),
          end: Number(wEnd.toFixed(3)),
        };
      });

      sentences.push({
        id: `sent-${index}`,
        index,
        text: fullText,
        start: Number(sentenceStartSec.toFixed(3)),
        duration: Number(sentenceDurSec.toFixed(3)),
        words,
        isCompleted: false,
      });

      index++;
    }
  }

  if (sentences.length > 0) {
    return { sentences };
  }

  // 2. Fallback định dạng classic: <text start="s" dur="s">content</text>
  const textRegex = /<text\s+start="([\d.]+)"\s+dur="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g;
  let tMatch;
  let cIndex = 1;

  while ((tMatch = textRegex.exec(xml)) !== null) {
    const startSec = parseFloat(tMatch[1]);
    const durSec = parseFloat(tMatch[2]);
    const content = decodeEntities(tMatch[3]);

    if (content) {
      const splitted = content.split(/\s+/).filter(Boolean);
      const wordDur = splitted.length > 0 ? durSec / splitted.length : durSec;

      const words: YouTubeWord[] = splitted.map((w, i) => {
        const wStart = startSec + i * wordDur;
        const wEnd = wStart + wordDur;
        return {
          word: w,
          start: Number(wStart.toFixed(3)),
          end: Number(wEnd.toFixed(3)),
        };
      });

      sentences.push({
        id: `sent-${cIndex}`,
        index: cIndex,
        text: content,
        start: Number(startSec.toFixed(3)),
        duration: Number(durSec.toFixed(3)),
        words,
        isCompleted: false,
      });

      cIndex++;
    }
  }

  return { sentences };
}

/**
 * Lấy danh sách câu và mốc thời gian từng từ của video YouTube
 */
export async function getYouTubeTranscript(urlOrId: string): Promise<YouTubeLessonData> {
  const videoId = extractVideoId(urlOrId);
  if (!videoId) {
    throw new Error('Đường dẫn YouTube không hợp lệ. Vui lòng kiểm tra lại link video.');
  }

  // 1. Thử lấy dữ liệu qua InnerTube Android Client
  let playerResponse = await fetchPlayerResponse(videoId);
  let captionTracks: RawCaptionTrack[] | undefined =
    playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

  // 2. Nếu InnerTube không có captionTracks, fallback sang cào HTML Web Page
  if (!captionTracks || !Array.isArray(captionTracks) || captionTracks.length === 0) {
    const fallbackResponse = await fetchPlayerResponseFallback(videoId);
    if (fallbackResponse) {
      playerResponse = { ...playerResponse, ...fallbackResponse };
      captionTracks = fallbackResponse.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    }
  }

  // 3. Nếu vẫn không tìm thấy captionTracks nào
  if (!captionTracks || !Array.isArray(captionTracks) || captionTracks.length === 0) {
    const playabilityStatus = playerResponse?.playabilityStatus?.status;
    if (playabilityStatus === 'UNPLAYABLE') {
      throw new Error('Video này không khả dụng hoặc đã bị gỡ khỏi YouTube.');
    }
    throw new Error('Video này không có phụ đề tiếng Anh có sẵn trên YouTube.');
  }

  // Ưu tiên phụ đề tiếng Anh: en, en-US, en-GB, hoặc bất kỳ phụ đề tiếng Anh nào
  let track = captionTracks.find(
    (t) =>
      t.languageCode === 'en' ||
      t.languageCode === 'en-US' ||
      t.languageCode === 'en-GB' ||
      t.languageCode?.startsWith('en')
  );

  // Nếu không có tiếng Anh, chọn track đầu tiên có sẵn
  if (!track) {
    track = captionTracks[0];
  }

  if (!track || !track.baseUrl) {
    throw new Error('Không tìm thấy đường dẫn phụ đề của video.');
  }

  // 4. Tải XML phụ đề (yêu cầu srv3 để bóc tách word-level timings)
  let xmlUrl = track.baseUrl;
  if (!xmlUrl.includes('fmt=')) {
    xmlUrl += '&fmt=srv3';
  }

  let xmlRes = await fetch(xmlUrl, {
    headers: {
      'User-Agent': BROWSER_USER_AGENT,
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  // Nếu fetch srv3 không thành công, thử lại bằng link gốc (classic format)
  if (!xmlRes.ok && xmlUrl !== track.baseUrl) {
    xmlRes = await fetch(track.baseUrl, {
      headers: {
        'User-Agent': BROWSER_USER_AGENT,
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
  }

  if (!xmlRes.ok) {
    throw new Error('Không thể tải dữ liệu phụ đề từ YouTube.');
  }

  const xmlBuffer = await xmlRes.arrayBuffer();
  const xmlContent = new TextDecoder('utf-8').decode(xmlBuffer);

  const { sentences } = parseTranscriptXml(xmlContent);

  if (sentences.length === 0) {
    throw new Error('Phụ đề của video này trống hoặc không đọc được nội dung.');
  }

  const videoTitle = playerResponse?.videoDetails?.title || 'YouTube Speaking Practice';

  return {
    videoId,
    videoTitle,
    sentences,
    totalSentences: sentences.length,
    completedCount: 0,
  };
}
