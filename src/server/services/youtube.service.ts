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

import { HttpsProxyAgent } from 'https-proxy-agent';
import { YouTubeLessonData, YouTubeSentence, YouTubeWord } from '@/types/youtube';
import { getCachedTranscript, saveCachedTranscript } from '@/lib/firebase/firestore/youtubeTranscript';

const INNERTUBE_API_URL = 'https://www.youtube.com/youtubei/v1/player?prettyPrint=false';
const INNERTUBE_CLIENT_VERSION = '20.10.38';
const INNERTUBE_USER_AGENT = `com.google.android.youtube/${INNERTUBE_CLIENT_VERSION} (Linux; U; Android 14)`;

const RE_YOUTUBE = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
const RE_RAW_ID = /^[a-zA-Z0-9_-]{11}$/;

const YTRANSCRIPT_API_URL = 'https://ytranscript.com/api/v1/transcript';
const YTRANSCRIPT_API_KEY = process.env.YTRANSCRIPT_API_KEY;

/**
 * Proxy agent tùy chọn — inject vào tất cả fetch() calls để bypass YouTube IP block.
 * Nếu WEBSHARE_PROXY_URL chưa được cấu hình, service vẫn hoạt động bình thường (không proxy).
 */
const PROXY_URL = process.env.WEBSHARE_PROXY_URL;
const proxyAgent = PROXY_URL ? new HttpsProxyAgent(PROXY_URL) : undefined;

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
  // Thử lần lượt các client context:
  // 1. WEB_EMBEDDED — giả lập embedded player (iframe), YouTube cho phép từ datacenter IP
  // 2. TVHTML5_SIMPLY_EMBEDDED_PLAYER — embedded TV client, thường bypass LOGIN_REQUIRED
  // 3. WEB — browser thường, với embedUrl để signal embedded context
  // 4. ANDROID — mobile client, fallback cuối cùng
  const clients: {
    clientName: string;
    clientVersion: string;
    userAgent: string;
    embedUrl?: string;
  }[] = [
    // ANDROID đứng đầu: client duy nhất bypass được YouTube bot-detection
    // trên datacenter IP và rotating proxy (test xác nhận 2026-09-20)
    {
      clientName: 'ANDROID',
      clientVersion: INNERTUBE_CLIENT_VERSION,
      userAgent: INNERTUBE_USER_AGENT,
    },
    {
      clientName: 'WEB_EMBEDDED_PLAYER',
      clientVersion: '1.20250915.01.00',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
    },
    {
      clientName: 'TVHTML5_SIMPLY_EMBEDDED_PLAYER',
      clientVersion: '2.0',
      userAgent: 'Mozilla/5.0 (SMART-TV; Linux; Tizen 6.0) AppleWebKit/538.1 (KHTML, like Gecko) Version/6.0 TV Safari/538.1',
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
    },
    {
      clientName: 'WEB',
      clientVersion: '2.20250915.01.00',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
    },
  ];

  for (const client of clients) {
    try {
      // Xây dựng request body — nếu có embedUrl thì thêm thirdParty context
      // để YouTube biết đây là embedded player (hợp lệ từ datacenter IP)
      const requestBody: Record<string, unknown> = {
        context: {
          client: {
            clientName: client.clientName,
            clientVersion: client.clientVersion,
            hl: 'en',
            gl: 'US',
          },
          ...(client.embedUrl
            ? {
                thirdParty: {
                  embedUrl: client.embedUrl,
                },
              }
            : {}),
        },
        videoId,
      };

      const res = await fetch(INNERTUBE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': client.userAgent,
          'Accept-Language': 'en-US,en;q=0.9',
          'Origin': 'https://www.youtube.com',
          'Referer': client.embedUrl || `https://www.youtube.com/watch?v=${videoId}`,
        },
        body: JSON.stringify(requestBody),
        cache: 'no-store',
        ...(proxyAgent ? { agent: proxyAgent } : {}),
      });

      if (!res.ok) {
        console.log(`[YT:${videoId}] ${client.clientName}: HTTP ${res.status}`);
        continue;
      }
      const data = await res.json();
      const status = data?.playabilityStatus?.status;
      const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

      console.log(`[YT:${videoId}] ${client.clientName}: status=${status}, tracks=${tracks?.length ?? 0}`);

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
      ...(proxyAgent ? { agent: proxyAgent } : {}),
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
      });

      cIndex++;
    }
  }

  return { sentences };
}

/**
 * Lấy tiêu đề video từ YouTube oEmbed (hoạt động ổn định trên cả Vercel / Datacenter IP)
 */
async function fetchVideoTitle(videoId: string): Promise<string> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) return 'YouTube Speaking Practice';
    const json = (await res.json()) as { title?: string };
    return json.title || 'YouTube Speaking Practice';
  } catch {
    return 'YouTube Speaking Practice';
  }
}

interface YTranscriptSegment {
  text: string;
  offset: number; // ms
  duration: number; // ms
}

interface YTranscriptResponse {
  video_id: string;
  lang: string;
  whisper?: boolean;
  cached?: boolean;
  units_charged?: number;
  segments?: YTranscriptSegment[];
  error?: {
    code?: string;
    message?: string;
  } | string;
  message?: string;
}

/**
 * Cơ chế Fallback: Lấy phụ đề từ dịch vụ ytranscript.com khi YouTube chặn IP server
 */
async function fetchFromYTranscript(
  videoId: string,
  fallbackTitle?: string
): Promise<YouTubeLessonData> {
  console.log(`[YT:${videoId}] Initiating ytranscript.com fallback...`);

  if (!YTRANSCRIPT_API_KEY) {
    console.error(`[YT:${videoId}] YTRANSCRIPT_API_KEY chưa được cấu hình trong biến môi trường.`);
    throw new Error('Chưa cấu hình YTRANSCRIPT_API_KEY trong biến môi trường.');
  }

  const [videoTitle, apiRes] = await Promise.all([
    fallbackTitle && fallbackTitle !== 'YouTube Speaking Practice'
      ? Promise.resolve(fallbackTitle)
      : fetchVideoTitle(videoId),
    fetch(`${YTRANSCRIPT_API_URL}?videoId=${videoId}`, {
      headers: {
        Authorization: `Bearer ${YTRANSCRIPT_API_KEY}`,
      },
      cache: 'no-store',
    }),
  ]);

  if (!apiRes.ok) {
    console.error(`[YT:${videoId}] ytranscript.com responded with HTTP ${apiRes.status}`);
    throw new Error(`Dịch vụ phụ đề trả về lỗi (${apiRes.status}). Vui lòng thử lại sau.`);
  }

  const data = (await apiRes.json()) as YTranscriptResponse;

  if (data.error) {
    const errorMsg = typeof data.error === 'string' ? data.error : data.error.message;
    console.error(`[YT:${videoId}] ytranscript.com API error:`, errorMsg);
    throw new Error(errorMsg || 'Không tìm thấy phụ đề cho video này.');
  }

  const rawSegments = data.segments;
  if (!rawSegments || !Array.isArray(rawSegments) || rawSegments.length === 0) {
    throw new Error('Video này không có phụ đề tiếng Anh có sẵn.');
  }

  const sentences: YouTubeSentence[] = [];
  let index = 1;

  for (const seg of rawSegments) {
    const rawText = decodeEntities(seg.text || '')
      .replace(/^>>\s*/, '')
      .replace(/\r?\n|\r/g, ' ')
      .trim();

    if (!rawText) continue;

    const sentenceStartSec = Number((seg.offset / 1000).toFixed(3));
    const sentenceDurSec = Number((seg.duration / 1000).toFixed(3));
    const sentenceEndSec = Number((sentenceStartSec + sentenceDurSec).toFixed(3));

    const splittedWords = rawText.split(/\s+/).filter(Boolean);
    const totalChars = splittedWords.reduce((acc, w) => acc + w.length, 0);
    let curWordStart = sentenceStartSec;

    // Phân rã từ & tính mốc thời gian từng từ để phục vụ Karaoke Word Highlighting
    const words: YouTubeWord[] = splittedWords.map((w, i) => {
      const ratio = totalChars > 0 ? w.length / totalChars : 1 / splittedWords.length;
      const wDur = Math.max(0.08, sentenceDurSec * ratio);
      const wStart = curWordStart;
      let wEnd =
        i === splittedWords.length - 1
          ? sentenceEndSec
          : Number((wStart + wDur).toFixed(3));

      if (wEnd <= wStart) {
        wEnd = Number((wStart + 0.15).toFixed(3));
      }
      curWordStart = wEnd;

      return {
        word: w,
        start: Number(wStart.toFixed(3)),
        end: Number(wEnd.toFixed(3)),
      };
    });

    sentences.push({
      id: `sent-${index}`,
      index,
      text: rawText,
      start: sentenceStartSec,
      duration: sentenceDurSec,
      words,
    });

    index++;
  }

  if (sentences.length === 0) {
    throw new Error('Phụ đề của video này trống hoặc không đọc được nội dung.');
  }

  return {
    videoId,
    videoTitle,
    sentences,
    totalSentences: sentences.length,
    completedCount: 0,
  };
}

/**
 * Thử lấy phụ đề trực tiếp từ YouTube (InnerTube API / Web Scrape srv3)
 */
async function tryFetchNativeYouTube(videoId: string): Promise<YouTubeLessonData | null> {
  // 1. Thử qua InnerTube
  let playerResponse = await fetchPlayerResponse(videoId);
  let captionTracks: RawCaptionTrack[] | undefined =
    playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

  console.log(`[YT:${videoId}] Native InnerTube captionTracks:`, captionTracks?.length ?? 'null');

  // 2. Nếu InnerTube không có captionTracks, fallback sang cào HTML
  if (!captionTracks || !Array.isArray(captionTracks) || captionTracks.length === 0) {
    console.log(`[YT:${videoId}] Trying native HTML scrape fallback...`);
    const fallbackResponse = await fetchPlayerResponseFallback(videoId);
    if (fallbackResponse) {
      playerResponse = { ...playerResponse, ...fallbackResponse };
      captionTracks = fallbackResponse.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    }
    console.log(`[YT:${videoId}] Native HTML scrape captionTracks:`, captionTracks?.length ?? 'null');
  }

  // 3. Nếu vẫn không tìm thấy captionTracks
  if (!captionTracks || !Array.isArray(captionTracks) || captionTracks.length === 0) {
    const status = playerResponse?.playabilityStatus?.status;
    console.warn(`[YT:${videoId}] Native YouTube no tracks found. Status: ${status}`);
    return null;
  }

  // Ưu tiên phụ đề tiếng Anh
  let track = captionTracks.find(
    (t) =>
      t.languageCode === 'en' ||
      t.languageCode === 'en-US' ||
      t.languageCode === 'en-GB' ||
      t.languageCode?.startsWith('en')
  );

  if (!track) {
    track = captionTracks[0];
  }

  if (!track || !track.baseUrl) {
    return null;
  }

  // 4. Tải XML phụ đề (ưu tiên srv3 để có mốc từng từ)
  let xmlUrl = track.baseUrl;
  if (!xmlUrl.includes('fmt=')) {
    xmlUrl += '&fmt=srv3';
  }

  let xmlRes = await fetch(xmlUrl, {
    headers: {
      'User-Agent': BROWSER_USER_AGENT,
      'Accept-Language': 'en-US,en;q=0.9',
    },
    ...(proxyAgent ? { agent: proxyAgent } : {}),
  });

  if (!xmlRes.ok && xmlUrl !== track.baseUrl) {
    xmlRes = await fetch(track.baseUrl, {
      headers: {
        'User-Agent': BROWSER_USER_AGENT,
        'Accept-Language': 'en-US,en;q=0.9',
      },
      ...(proxyAgent ? { agent: proxyAgent } : {}),
    });
  }

  if (!xmlRes.ok) {
    console.warn(`[YT:${videoId}] Failed to download native caption XML (${xmlRes.status})`);
    return null;
  }

  const xmlBuffer = await xmlRes.arrayBuffer();
  const xmlContent = new TextDecoder('utf-8').decode(xmlBuffer);

  const { sentences } = parseTranscriptXml(xmlContent);

  if (sentences.length === 0) {
    return null;
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

/**
 * Lấy danh sách câu và mốc thời gian từng từ của video YouTube.
 * Tự động thử native YouTube trước, nếu lỗi hoặc bị chặn IP thì chuyển sang ytranscript.com.
 */
export async function getYouTubeTranscript(urlOrId: string): Promise<YouTubeLessonData> {
  const videoId = extractVideoId(urlOrId);
  if (!videoId) {
    console.error('[YouTubeService] Invalid YouTube URL or ID:', urlOrId);
    throw new Error('Đường dẫn YouTube không hợp lệ. Vui lòng kiểm tra lại link video.');
  }

  // Bước 0: Kiểm tra Cache Firestore (tránh gọi API lặp lại, tiết kiệm chi phí & tải tức thì)
  try {
    const cached = await getCachedTranscript(videoId);
    if (cached && cached.sentences.length > 0) {
      console.log(`[YT:${videoId}] Cache HIT in Firestore (${cached.sentences.length} câu)`);
      return cached;
    }
  } catch (cacheErr) {
    console.warn(`[YT:${videoId}] Lỗi khi kiểm tra cache Firestore:`, cacheErr);
  }

  // Bước 1: Thử lấy trực tiếp từ YouTube (srv3 XML gốc)
  let result: YouTubeLessonData | null = null;
  let source: 'native' | 'ytranscript' = 'native';

  try {
    const nativeResult = await tryFetchNativeYouTube(videoId);
    if (nativeResult && nativeResult.sentences.length > 0) {
      console.log(`[YT:${videoId}] Lấy thành công từ native YouTube (${nativeResult.sentences.length} câu)`);
      result = nativeResult;
      source = 'native';
    }
  } catch (nativeErr) {
    console.warn(`[YT:${videoId}] Native YouTube fetch error:`, (nativeErr as Error).message);
  }

  // Bước 2: Fallback sang provider ytranscript.com khi YouTube chặn hoặc không có phụ đề trực tiếp
  if (!result) {
    console.log(`[YT:${videoId}] Native YouTube không khả dụng, đang chuyển sang Fallback (ytranscript.com)...`);
    result = await fetchFromYTranscript(videoId);
    source = 'ytranscript';
  }

  // Bước 3: Tự động lưu kết quả vào Firestore Cache (bất đồng bộ để không chặn kết quả trả về)
  if (result && result.sentences.length > 0) {
    saveCachedTranscript(result, source).catch((saveErr) => {
      console.warn(`[YT:${videoId}] Không thể lưu cache Firestore:`, saveErr);
    });
  }

  return result;
}

