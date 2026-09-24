# ERRORS.md — Nhật ký Lỗi, Nguyên nhân Gốc rễ & Giải pháp (EchoChunk)

> **Dự án:** EchoChunk  
> **Cập nhật lần cuối:** 2026-09-25  
> **Phạm vi:** YouTube Transcript, Player, React 19 Lifecycle, SSR Hydration, ESLint Rules, TTS Audio Engine, Phonetics IPA, Webshare Rotating Proxy, Firestore Quota Optimization, NoSQL Data Modeling, Next.js 16 Auth & Jose Overrides

---

## Mục lục
1. [Lỗi `LOGIN_REQUIRED` khi fetch transcript InnerTube](#1-lỗi-login_required-khi-fetch-transcript-innertube)
2. [`fetchPlayerResponseFallback` parse sai JSON `ytInitialPlayerResponse`](#2-fetchplayerresponsefallback-parse-sai-json-ytinitialplayerresponse)
3. [Transcript XML trả về rỗng khi dùng `INNERTUBE_USER_AGENT`](#3-transcript-xml-trả-về-rỗng-khi-dùng-innertube_user_agent)
4. [Duyệt câu `sentences.find()` bị kẹt do phụ đề ASR chồng thời gian](#4-duyệt-câu-sentencesfind-bị-kẹt-do-phụ-đề-asr-chồng-thời-gian)
5. [Khảo sát kiến trúc xử lý từ ShadowingEnglish.com](#5-khảo-sát-kiến-trúc-xử-lý-từ-shadowingenglishcom)
6. [Lỗi ESLint `Cannot access refs during render` (`react-hooks/refs`) trong React 19](#6-lỗi-eslint-cannot-access-refs-during-render-react-hooksrefs-trong-react-19)
7. [Lỗi Cascading Render & `react-hooks/set-state-in-effect` khi đọc LocalStorage](#7-lỗi-cascading-render--react-hooksset-state-in-effect-khi-đọc-localstorage)
8. [Lỗi thư viện `@travisvn/edge-tts` bị treo vô hạn (hang/freeze) trên Node.js runtime](#8-lỗi-thư-viện-travisvnedge-tts-bị-treo-vô-hạn-hangfreeze-trên-nodejs-runtime)
9. [Bộ từ điển `american-ipa.json` bị cắt cụt (truncated) và sự cố nghẽn mạng từ `api.dictionaryapi.dev`](#9-bộ-từ-điển-american-ipajson-bị-cắt-cụt-truncated-và-sự-cố-nghẽn-mạng-từ-apidictionaryapidev)
10. [YouTube chặn IP Datacenter/Server khi lấy Transcript & Giải pháp Webshare Rotating Proxy kết hợp Android InnerTube Client](#10-youtube-chặn-ip-datacenterserver-khi-lấy-transcript--giải-pháp-webshare-rotating-proxy-kết-hợp-android-innertube-client)
11. [Xung đột phiên bản `jose` với `firebase-admin` trong môi trường Next.js 16](#11-xung-đột-phiên-bản-jose-với-firebase-admin-trong-môi-trường-nextjs-16)
12. [Cạn kiệt Quota đọc Firestore & Chiến lược Single Document Summary + Client Cache-First](#12-cạn-kiệt-quota-đọc-firestore--chiến-lược-single-document-summary--client-cache-first)
13. [Khắc phục Overfetching danh mục YouTube bằng Cursor-based Pagination & Infinite Scroll](#13-khắc-phục-overfetching-danh-mục-youtube-bằng-cursor-based-pagination--infinite-scroll)
14. [Lỗi Hydration Mismatch, Cascading Refresh trong `AuthContext` & Chập chờn giao diện SSR vs Client](#14-lỗi-hydration-mismatch-cascading-refresh-trong-authcontext--chập-chờn-giao-diện-ssr-vs-client)
15. [Lỗi logic gán nhầm `topicId: 'STUDIED'` cho từ vựng mới trong modal thêm chunk](#15-lỗi-logic-gán-nhầm-topicid-studied-cho-từ-vựng-mới-trong-modal-thêm-chunk)

---

## 1. Lỗi `LOGIN_REQUIRED` khi fetch transcript InnerTube

### Triệu chứng
```json
{ "success": false, "error": "Video không khả dụng hoặc bị giới hạn quyền truy cập (LOGIN_REQUIRED)." }
```
Nhiều video công khai (ví dụ `_iSIt9pLUfE`) báo lỗi này dù khi mở trực tiếp trên trình duyệt bằng tab ẩn danh hoàn toàn xem được bình thường.

### Nguyên nhân gốc rễ
YouTube InnerTube API (`/youtubei/v1/player`) trả về `playabilityStatus.status = "LOGIN_REQUIRED"` khi request không đính kèm session cookie. Tuy nhiên, điều này **không có nghĩa là phụ đề bị chặn**.

YouTube vẫn đính kèm đầy đủ `captionTracks` trong cùng response payload đó. Đoạn code cũ kiểm tra `playabilityStatus` trước khi đọc `captionTracks` và tự ném Exception:
```ts
// ❌ SAI: Check status trước, throw sớm làm mất captionTracks có sẵn
const playabilityStatus = playerResponse.playabilityStatus?.status;
if (playabilityStatus && playabilityStatus !== 'OK') {
  throw new Error(`Video không khả dụng ... (${playabilityStatus}).`);
}
```

### Cách khắc phục
Đọc `captionTracks` trước. Chỉ ném lỗi nếu thực sự không có `captionTracks` nào trong payload:
```ts
// ✅ ĐÚNG: Ưu tiên trích xuất captionTracks
const captionTracks = playerResponse.captions?.playerCaptionsTracklistRenderer?.captionTracks;
if (!captionTracks || captionTracks.length === 0) {
  if (playerResponse.playabilityStatus?.status === 'UNPLAYABLE') {
    throw new Error('Video đã bị gỡ khỏi YouTube.');
  }
  throw new Error('Video này không có phụ đề tiếng Anh.');
}
```

---

## 2. `fetchPlayerResponseFallback` parse sai JSON `ytInitialPlayerResponse`

### Triệu chứng
Hàm fallback cào web HTML trả về `null` dù trong mã nguồn trang có chứa biến `ytInitialPlayerResponse`.

### Nguyên nhân gốc rễ
Dùng Regular Expression non-greedy để cắt khối JSON:
```ts
// ❌ SAI: Non-greedy dừng ở dấu '}' đầu tiên bên trong object lồng nhau
const match = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
```
Payload JSON của YouTube lồng nhau hàng chục cấp và dài hàng trăm KB. Regex dừng ở dấu `}` đầu tiên khiến chuỗi JSON bị cắt cụt, dẫn đến `JSON.parse()` ném `SyntaxError`.

### Cách khắc phục
Sử dụng thuật toán **đếm ngoặc (bracket counter)**:
```ts
// ✅ ĐÚNG: Đếm độ sâu {} cho đến khi depth == 0
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
```

---

## 3. Transcript XML trả về rỗng khi dùng `INNERTUBE_USER_AGENT`

### Triệu chứng
`captionTracks[0].baseUrl` lấy được hợp lệ, nhưng khi `fetch(track.baseUrl)` thì response XML trả về 0 byte hoặc 403 Forbidden.

### Nguyên nhân gốc rễ
URL trong `baseUrl` là **Signed URL** do YouTube cấp phát. Khi InnerTube POST request dùng Android User-Agent, nhưng khi fetch XML lại tiếp tục dùng Android UA thì server phụ đề từ chối stream nội dung dạng web.

### Cách khắc phục
Dùng **Browser User-Agent** chuẩn khi fetch XML, đồng thời thêm tham số `&fmt=srv3` để nhận định dạng phụ đề có **word-level timing** (`<s t="offsetMs">`):
```ts
// ✅ ĐÚNG: Dùng Browser UA + &fmt=srv3
const BROWSER_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ... Chrome/120.0.0.0 Safari/537.36';

const xmlRes = await fetch(`${track.baseUrl}&fmt=srv3`, {
  headers: {
    'User-Agent': BROWSER_USER_AGENT,
    'Accept-Language': 'en-US,en;q=0.9',
  },
});
```

---

## 4. Duyệt câu `sentences.find()` bị kẹt do phụ đề ASR chồng thời gian

### Triệu chứng
Trong lúc phát video, highlight câu không nhảy sang câu mới mà bị kẹt ở câu cũ vài giây.

### Nguyên nhân gốc rễ
Hệ thống nhận dạng giọng nói tự động (ASR) của YouTube tạo ra các đoạn `<p>` có khoảng thời gian **chồng lấn (overlap)**:
```text
Câu 1: start = 0.08s, duration = 3.28s  -> Phủ từ 0.08s đến 3.36s
Câu 2: start = 1.60s, duration = 4.00s  -> Phủ từ 1.60s đến 5.60s
```
Tại `currentTime = 2.0s`, cả hai câu đều thoả mãn điều kiện `currentTime >= start && currentTime < start + duration`. Nếu dùng `find()` duyệt từ đầu mảng:
```ts
// ❌ SAI: Luôn bắt dính Câu 1 cho tới tận 3.36s, dù Câu 2 đã nói từ 1.60s
const current = sentences.find(s => currentTime >= s.start && currentTime < s.start + s.duration);
```

### Cách khắc phục
Duyệt từ **cuối mảng ngược về đầu (reverse loop)** để ưu tiên câu mới nhất vừa bắt đầu:
```ts
// ✅ ĐÚNG: Lấy câu có thời điểm bắt đầu gần nhất với currentTime
for (let i = sentences.length - 1; i >= 0; i--) {
  const s = sentences[i];
  if (currentTime >= s.start && currentTime < s.start + s.duration) {
    return s;
  }
}
```

---

## 5. Khảo sát kiến trúc xử lý từ ShadowingEnglish.com

| Tiêu chí | ShadowingEnglish.com | EchoChunk |
| :--- | :--- | :--- |
| **Nguồn dữ liệu** | InnerTube / Scrape | InnerTube Android API + Web Scrape fallback |
| **Gom nhóm câu** | LLM gom các mẩu ASR ngắn thành câu ngữ nghĩa (~10s) | Giai đoạn 1: Parse srv3 giữ nguyên mốc từ; Giai đoạn 2: Tích hợp Gemini AI chunking |
| **Phân loại cấp độ** | Gán nhãn CEFR (A1-C1) | Đã chuẩn bị sẵn metadata trong spec |
| **Bảo vệ API** | Cloudflare WAF chặn request phi trình duyệt | Xử lý hoàn toàn tại Next.js Server Route Handler |

---

## 6. Lỗi ESLint `Cannot access refs during render` (`react-hooks/refs`) trong React 19

### Triệu chứng
Chạy ESLint báo lỗi tại component [YouTubePlayer.tsx](file:///d:/SelfLearning/EchoChunk/src/components/youtube/YouTubePlayer.tsx):
```text
error  Error: Cannot access refs during render
Accessing a ref value (the `current` property) during render can cause your component not to update as expected.
react-hooks/refs
```

### Mã nguồn gây lỗi
```tsx
// ❌ SAI trong React 19:
const onTimeUpdateRef = useRef(onTimeUpdate);
onTimeUpdateRef.current = onTimeUpdate; // <--- mutate ref trong render phase

const onReadyRef = useRef(onReady);
onReadyRef.current = onReady;
```

### Nguyên nhân gốc rễ
Trong mô hình **Concurrent Rendering** của React 19:
- Một component có thể được thực thi render thử nghiệm (speculative render) rồi bị hủy bỏ hoặc render lại nhiều lần trước khi thực sự commit ra DOM.
- Mutate hoặc đọc `ref.current` trong thân component (Render Phase) là một **Side-effect** không thuần khiết. Nó phá vỡ tính idempotent của hàm component và dẫn đến trạng thái không đồng bộ giữa các lần render.

### Cách khắc phục
Chuyển toàn bộ thao tác gán ref vào `useEffect` (chạy trong Commit Phase, sau khi render xong):
```tsx
// ✅ ĐÚNG: Cập nhật ref trong Commit Phase thông qua useEffect
const onTimeUpdateRef = useRef(onTimeUpdate);
const onReadyRef = useRef(onReady);
const onSeekHandledRef = useRef(onSeekHandled);

useEffect(() => {
  onTimeUpdateRef.current = onTimeUpdate;
  onReadyRef.current = onReady;
  onSeekHandledRef.current = onSeekHandled;
}, [onTimeUpdate, onReady, onSeekHandled]);
```

---

## 7. Lỗi Cascading Render & `react-hooks/set-state-in-effect` khi đọc LocalStorage

### Triệu chứng
Khi đọc dữ liệu từ `localStorage` để khởi tạo state cho component (ví dụ nạp lịch sử học YouTube):
```text
ESLint error: Calling setState synchronously in useEffect causes cascading renders
```

### Mã nguồn gây lỗi
```tsx
// ❌ SAI:
const [history, setHistory] = useState<YouTubeHistoryItem[]>([]);

useEffect(() => {
  const data = getYouTubeHistory(user?.uid);
  setHistory(data); // <--- Kích hoạt thêm 1 lần re-render ngay sau mount
}, [user?.uid]);
```

### Nguyên nhân gốc rễ
1. **Cascading Render**: Component render lần 1 với state rỗng `[]` ➔ Browser vẽ HTML ➔ `useEffect` chạy ➔ gọi `setHistory(data)` ➔ Kích hoạt render lần 2 ngay lập tức.
2. Gây hiện tượng giật giao diện (layout shift/flicker) và làm chậm TTI (Time to Interactive).

### Cách khắc phục
1. Tách riêng custom hook [useIsClient.ts](file:///d:/SelfLearning/EchoChunk/src/hooks/useIsClient.ts) sử dụng `useSyncExternalStore`:
```typescript
// src/hooks/useIsClient.ts
'use client';
import { useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {};

export function useIsClient(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,  // Client: true ngay khi hydrate
    () => false  // Server (SSR): false
  );
}
```

2. Tính toán trực tiếp bằng `useMemo` kết hợp với `storeVersion`:
```tsx
// ✅ ĐÚNG: Zero-render-waste, không cần useEffect setState
const isClient = useIsClient();
const [storeVersion, setStoreVersion] = useState(0);

const history = useMemo<YouTubeHistoryItem[]>(() => {
  void storeVersion;
  if (!isClient) return [];
  return getYouTubeHistory(user?.uid);
}, [isClient, storeVersion, user?.uid]);
```
- Phía Server: `isClient = false` ➔ render mảng rỗng an toàn, khớp với SSR HTML.
- Phía Client: `isClient = true` ➔ render ngay dữ liệu từ LocalStorage trong 1 lượt duy nhất, không cascading render, 0 cảnh báo ESLint.

---

## 8. Lỗi thư viện `@travisvn/edge-tts` bị treo vô hạn (hang/freeze) trên Node.js runtime

### Triệu chứng
Khi triển khai tính năng Microsoft Edge Neural TTS cho backend Route Handler bằng gói npm `@travisvn/edge-tts`:
```js
import { EdgeTTS } from '@travisvn/edge-tts';

const tts = new EdgeTTS('Hello world', 'en-US-JennyNeural');
const res = await tts.synthesize(); // <--- Treo vô hạn ở đây
```
- Process in ra `Synthesizing...` rồi bị đơ hoàn toàn (hang/freeze).
- Không trả về mảng dữ liệu âm thanh, không timeout và không ném ra bất kỳ Exception hay Error nào.
- Request gọi tới `/api/tts` bị pending vĩnh viễn dẫn tới timeout phía client.

### Nguyên nhân gốc rễ
1. **Kiến trúc client-centric**: Thư viện `@travisvn/edge-tts` được thiết kế chủ yếu cho môi trường trình duyệt (Browser), sử dụng các API Web Socket/Fetch không tương thích tốt với Node.js runtime stream lifecycle.
2. **Ngậm WebSocket handshake vô hạn**: Khi khởi tạo kết nối WebSocket với máy chủ TTS của Microsoft trên Node.js, socket handshake không bắt được event stream closure và không resolve Promise `synthesize()`, làm treo luồng thực thi.

### Cách khắc phục
1. Gỡ bỏ hoàn toàn `@travisvn/edge-tts`:
   ```bash
   pnpm remove @travisvn/edge-tts
   ```
2. Cài đặt thư viện chuyên dụng, chuẩn hóa cho Node.js backend: **`msedge-tts`** (v2.0.7):
   ```bash
   pnpm add msedge-tts
   ```
3. Chuyển đổi sang luồng xử lý **Node.js Readable Stream** chuẩn:
   ```ts
   import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

   const tts = new MsEdgeTTS();
   await tts.setMetadata('en-US-JennyNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

   const { audioStream } = await tts.toStream(text, {
     rate: rateStr,
     pitch: '+0Hz',
   });

   const chunks: Buffer[] = [];
   await new Promise<void>((resolve, reject) => {
     audioStream.on('data', (chunk: Buffer) => chunks.push(chunk));
     audioStream.on('end', () => resolve());
     audioStream.on('error', (err: Error) => reject(err));
   });

   const buffer = Buffer.concat(chunks);
   ```
4. **Kết quả**:
   - Âm thanh MP3 chất lượng cao (24kHz Mono 48kbps) trả về sau **chưa đầy 0.8 giây**.
   - Tương thích 100% với Next.js Route Handler trên Vercel Serverless Function (`export const runtime = 'nodejs';`).

---

## 9. Bộ từ điển `american-ipa.json` bị cắt cụt (truncated) và sự cố nghẽn mạng từ `api.dictionaryapi.dev`

### Triệu chứng
1. Khi người dùng nhập các câu tiếng Anh thông dụng (ví dụ: *"Shall I open the window?"*), hệ thống phát âm IPA hiển thị rớt lại các từ gốc tiếng Anh chưa được phiên âm:
   ```text
   /shall ˈaɪ open ðə ˈwɪndoʊ/
   ```
   Các từ như `shall`, `open`, `door`, `water`, `pen` hoàn toàn không có phiên âm.
2. Đồng thời, trình duyệt gặp hiện tượng lag, đơ, phản hồi cực kỳ chậm từ API ngoài `api.dictionaryapi.dev` (Free Dictionary API).

### Nguyên nhân gốc rễ
1. **Từ điển offline bị cắt cụt (Truncated dataset)**:
   - Tệp `src/data/american-ipa.json` trước đây ghi nhận có 25,681 từ. Tuy nhiên, khi phân tích phân bố theo chữ cái:
     - `A`: 6,245 từ
     - `B`: 8,602 từ
     - `C`: 9,282 từ (riêng A, B, C chiếm **24,129 từ ~ 94% toàn bộ từ điển**)
     - `D`: 401 từ (bị dừng đột ngột ngay ở từ `dana`)
     - `E – Z`: Hầu như trống rỗng (`O` chỉ có 36 từ, `S` có 186 từ, `Z` có 0 từ).
   - Tệp JSON ban đầu được xuất theo bảng chữ cái nhưng bị ngắt quãng giữa chừng khi mới đến chữ D, khiến gần như toàn bộ từ vựng thông dụng từ D đến Z bị thiếu.
2. **Nghẽn mạng do gọi API dự phòng dồn dập**:
   - Hàm `getPhraseIpa` là hàm **đồng bộ (synchronous)** để render tức thì lên giao diện. Khi gặp từ thiếu, code kích hoạt `fetchMissingAmericanIpa` dạng fire-and-forget đến `api.dictionaryapi.dev`.
   - Vì thiếu đến 90% từ vựng từ D–Z, mỗi câu người dùng gõ vào bắn dồn dập 3–5 request đồng thời lên `api.dictionaryapi.dev` (vốn là dịch vụ miễn phí của cộng đồng, thường xuyên rate-limit, timeout hoặc chặn IP).
   - Hàm đồng bộ không đợi API và trả về ngay từ gốc làm fallback (`shall`, `open`), trong khi background network request treo đơ trình duyệt.

### Cách khắc phục
1. **Nâng cấp từ điển offline toàn diện từ CMUdict IPA**:
   - Sử dụng bộ dữ liệu chuẩn hoá [menelik3/cmudict-ipa](https://github.com/menelik3/cmudict-ipa) (dựa trên **CMU Pronouncing Dictionary v0.7b** của Đại học Carnegie Mellon).
   - Chuẩn hoá sang chuẩn **Broad General American IPA** (`r` thay vì `ɹ`, `l` thay vì `ɫ`) và gộp toàn bộ từ vựng thuật ngữ công nghệ hiện có của EchoChunk (`api`, `llm`, `tsx`, `codebase`,...).
   - Quy mô từ điển tăng từ 25,681 từ lên **124,895 từ vựng** trải đều 100% từ A đến Z, dung lượng file JSON ~3.1MB (gzip ~700KB), tra cứu $O(1)$ tức thì 0ms.
2. **Xoá bỏ hoàn toàn lời gọi phụ thuộc tới `api.dictionaryapi.dev`**:
   - Trong [`src/lib/ipa.ts`](file:///d:/SelfLearning/EchoChunk/src/lib/ipa.ts), loại bỏ hoàn toàn lệnh `fetch` đến `api.dictionaryapi.dev`.
   - Xóa bỏ việc kích hoạt background request ngầm khi không tìm thấy từ.
   - Chuyển `fetchMissingAmericanIpa` thành hàm tra cứu offline từ bộ từ điển 124,895 từ.
3. **Kết quả**:
   - Câu *"Shall I open the window?"* được phiên âm chính xác ngay lập tức:
     ```text
     /ˈʃæl ˈaɪ ˈoʊpən ðə ˈwɪndoʊ/
     ```
   - Hệ thống vận hành **offline 100%**, triệt tiêu hoàn toàn độ trễ mạng và tình trạng treo đơ do API bên ngoài.

---

## 10. YouTube chặn IP Datacenter/Server khi lấy Transcript & Giải pháp Webshare Rotating Proxy kết hợp Android InnerTube Client

### Triệu chứng
1. Khi triển khai trên môi trường cloud/serverless (Vercel, AWS, VPS...) hoặc trên môi trường local với các video YouTube khắt khe (ví dụ video `ABJMp1n8TfE` — *"Listen and Speak English at Native Speed"*), API lấy phụ đề InnerTube thất bại hoàn toàn:
   ```text
   [YT:ABJMp1n8TfE] Native InnerTube captionTracks: null
   [YT:ABJMp1n8TfE] Native YouTube no tracks found. Status: LOGIN_REQUIRED / UNPLAYABLE / ERROR
   ```
2. Các nỗ lực cào HTML dự phòng (`fetchPlayerResponseFallback` qua `https://www.youtube.com/watch?v=...`) cũng bị YouTube chặn hoặc điều hướng sang trang xác minh Captcha/Sign-in consent.
3. Người dùng trên giao diện web nhận thông báo lỗi không lấy được phụ đề video.

### Nguyên nhân gốc rễ
1. **Cơ chế chống bot và phân loại IP của YouTube**:
   - YouTube sử dụng hệ thống tường lửa đánh giá độ tin cậy của IP (IP Reputation / Datacenter IP Detection).
   - Các request xuất phát từ datacenter IP không có cookie session người dùng thật sẽ bị coi là automated bot scraper và bị trả về `LOGIN_REQUIRED` hoặc `status: "ERROR"`.
2. **Sự khác biệt rõ rệt giữa các InnerTube Client Context**:
   - Khi kiểm thử thực nghiệm trên proxy/datacenter IP với các client context phổ biến của YouTube InnerTube:

     | Client Context | Qua Proxy / Datacenter IP | Gọi Trực Tiếp (Direct) | Kết quả & Ghi chú |
     |---|---|---|---|
     | `WEB_EMBEDDED_PLAYER` | ❌ `ERROR` (`UNPLAYABLE`) | ❌ `ERROR` | YouTube đã siết chặt iframe embed với IP lạ |
     | `TVHTML5_SIMPLY_EMBEDDED_PLAYER` | ❌ `ERROR` | ❌ `ERROR` | Không cấp phát `captionTracks` |
     | `WEB` | ❌ `LOGIN_REQUIRED` | ❌ `LOGIN_REQUIRED` | Bắt buộc phải có đầy đủ Cookie & Sign-in session |
     | **`ANDROID`** (`com.google.android.youtube/...`) | ✅ **`OK` (Trả về đủ `captionTracks`)** | ⚠️ `OK` (dễ bị rate-limit nếu IP bẩn) | **Client DUY NHẤT vượt qua bot-detection** |

   - YouTube cho phép ứng dụng Android YouTube hoạt động trong nhiều điều kiện mạng khác nhau (kể cả mạng di động CGNAT hoặc proxy) mà không yêu cầu cookie trình duyệt phức tạp.
3. **Lỗ hổng silently-ignored của native `fetch` trong Node.js / Next.js**:
   - Node.js (v18+) và Next.js sử dụng chuẩn WHATWG `fetch`.
   - Trong chuẩn WHATWG `fetch`, **hoàn toàn không có thuộc tính `agent`** trong `RequestInit` (chỉ có trong `http.request` hoặc thư viện cũ `node-fetch`).
   - Do đó, khi truyền `{ agent: proxyAgent }` vào native `fetch`, Node.js **lặng lẽ bỏ qua (silently ignored)** và vẫn gọi HTTP trực tiếp bằng IP của máy / server!
   - Kết quả: Khi chạy local máy cá nhân thì tưởng đã chạy qua proxy, nhưng thực chất vẫn dùng IP mạng nhà. Khi deploy lên Vercel, request đi thẳng bằng IP Datacenter của Vercel và bị YouTube chặn ngay lập tức (`LOGIN_REQUIRED`).

### Cách khắc phục
1. **Sử dụng `undici.fetch` kết hợp `ProxyAgent`**:
   - Thư viện HTTP chuẩn hiện đại của Node.js là `undici`. `undici` hỗ trợ cơ chế `dispatcher` để ép luồng mạng đi qua proxy:
     ```bash
     pnpm add undici
     ```
   - Trong [`src/server/services/youtube.service.ts`](file:///d:/SelfLearning/EchoChunk/src/server/services/youtube.service.ts), khởi tạo `proxyDispatcher` và wrapper `fetchWithProxy`:
     ```ts
     import { fetch as undiciFetch, ProxyAgent } from 'undici';

     const PROXY_URL = process.env.WEBSHARE_PROXY_URL;
     const proxyDispatcher = PROXY_URL ? new ProxyAgent(PROXY_URL) : undefined;

     async function fetchWithProxy(url: string | URL, init: RequestInit = {}): Promise<Response> {
       if (proxyDispatcher) {
         return (await undiciFetch(url.toString(), {
           ...init,
           dispatcher: proxyDispatcher,
         } as any)) as unknown as Response;
       }
       return fetch(url, init);
     }
     ```
   - **Cơ chế Graceful Degradation**: Nếu `WEBSHARE_PROXY_URL` không được cấu hình, service tự động dùng `fetch` thông thường mà không cần proxy.

2. **Thêm hệ thống Console Logging trực quan**:
   - Mỗi khi gọi lấy phụ đề, hệ thống in log rõ ràng để kiểm tra trên runtime (đặc biệt là Vercel):
     ```text
     [YT:videoId] ----------------------------------------------------
     [YT:videoId] 🔍 Starting native transcript fetch
     [YT:videoId] 🌐 Proxy Status: 🟢 ENABLED (http://quom***:***@p.webshare.io)
     [YT:videoId] [ANDROID] status=OK, reason="OK", tracks=6
     ```
   - Nếu Vercel chưa được cấu hình biến môi trường, log sẽ cảnh báo ngay:
     ```text
     [YT:videoId] 🌐 Proxy Status: 🔴 DISABLED (WEBSHARE_PROXY_URL is undefined - Direct Server IP)
     ```

3. **Cơ chế tải XML phụ đề 2 lớp (Proxy + Direct Fallback)**:
   - YouTube CDN đôi khi trả về HTTP `429 Too Many Requests` với IP proxy khi tải XML phụ đề.
   - Code tự động fallback sang tải direct nếu proxy gặp 429:
     ```ts
     if (!xmlRes.ok && proxyDispatcher) {
       console.log(`[YT:${videoId}] ⚠️ Proxy caption XML returned HTTP ${xmlRes.status}. Retrying direct download fallback...`);
       xmlRes = await fetch(xmlUrl, { headers: ... });
     }
     ```

4. **Ưu tiên Client `ANDROID` lên vị trí số 1**:
   - Đưa cấu hình `ANDROID` lên đầu mảng `clients` trong `fetchPlayerResponse()`:
     ```ts
     const clients = [
       // ANDROID đứng đầu: client duy nhất bypass được YouTube bot-detection
       // trên datacenter IP và rotating proxy (đã kiểm chứng qua thực nghiệm)
       {
         clientName: 'ANDROID',
         clientVersion: INNERTUBE_CLIENT_VERSION, // '20.10.38'
         userAgent: INNERTUBE_USER_AGENT, // 'com.google.android.youtube/20.10.38 (Linux; U; Android 14)'
       },
       // Các client fallback khác: WEB_EMBEDDED_PLAYER, TVHTML5_SIMPLY_EMBEDDED_PLAYER, WEB
     ];
     ```
   - Nhờ đó, request thành công ngay ở lần thử đầu tiên (0 lần retry), tối ưu tốc độ phản hồi xuống mức thấp nhất (~1.2s - 1.5s).

5. **Cấu hình môi trường (`.env.local` và Vercel Project Settings)**:
   ```bash
   # Webshare Rotating Proxy (định dạng http://username-rotate:password@p.webshare.io:80)
   WEBSHARE_PROXY_URL=http://quomavrt-rotate:8x9pyh5q2q9v@p.webshare.io:80
   ```

5. **Kết quả kiểm thử thực tế**:
   - Kiểm thử thành công với video `ABJMp1n8TfE` qua API `/api/youtube/transcript?v=ABJMp1n8TfE`:
     ```json
     {
       "success": true,
       "totalSentences": 346,
       "videoTitle": "Listen and Speak English at Native Speed (ft. Volka)",
       "sampleWord": { "word": "Hello", "start": 0, "end": 0.32 }
     }
     ```
   - 100% các câu có đầy đủ mốc thời gian từng từ (`srv3`), sẵn sàng cho tính năng phát sáng Karaoke theo thời gian thực.
   - Mỗi lần gọi API, Webshare tự động phân luồng qua một IP sạch mới (Mỹ, Châu Âu...), triệt tiêu hoàn toàn nguy cơ bị gắn cờ bot.

---

## 11. Xung đột phiên bản `jose` với `firebase-admin` trong môi trường Next.js 16

### Triệu chứng
Khi build hoặc khởi chạy môi trường phát triển `next dev` (Next.js 16.3.4 với Turbopack) có tích hợp `firebase-admin` (v14.4.0), ứng dụng văng lỗi phân giải module hoặc sập runtime:
```text
TypeError: Cannot read properties of undefined (reading 'importJWK')
// Hoặc:
Attempted import error: 'jwtVerify' is not exported from 'jose'
```

### Nguyên nhân gốc rễ
1. `firebase-admin` phụ thuộc vào thư viện `jose` để thực hiện xác thực và phân giải JWT (`verifySessionCookie`, `verifyIdToken`).
2. Gói `jose` từ phiên bản v5.x và v6.x có các thay đổi phá vỡ tương thích (breaking changes) về cấu trúc export ESM/CJS và signature hàm so với chuẩn mà `firebase-admin` và Turbopack runtime trong Next.js 16 mong đợi.
3. Khi `pnpm` hoặc `npm` giải quyết cây phụ thuộc (dependency resolution), các phiên bản `jose` mới hơn bị lồng vào, gây xung đột định dạng runtime giữa Next.js SSR và Firebase Admin SDK.

### Cách khắc phục
Cấu hình khóa cứng (override) phiên bản `jose` tương thích cao nhất đã được kiểm chứng ổn định (`4.15.9`) trong file [`package.json`](file:///d:/SelfLearning/EchoChunk/package.json):
```json
{
  "pnpm": {
    "overrides": {
      "jose": "4.15.9"
    }
  },
  "overrides": {
    "jose": "4.15.9"
  }
}
```
Sau đó thực hiện cài đặt lại phụ thuộc:
```bash
pnpm install
```
Việc này đảm bảo 100% các package con trong toàn bộ dự án đồng nhất sử dụng bản `jose@4.15.9`, triệt tiêu hoàn toàn lỗi import JWT trên Next.js 16.

---

## 12. Cạn kiệt Quota đọc Firestore & Chiến lược Single Document Summary + Client Cache-First

### Triệu chứng
- Dự án chạm trần 50,000 lượt đọc/ngày của gói Free Tier Firebase Spark chỉ sau một vài phiên thử nghiệm.
- Mỗi lần người dùng F5 hoặc điều hướng qua lại giữa các tab chế độ học, Firestore ngốn từ 200–500 lượt Read cho mỗi người dùng.

### Cơ chế tính Quota Read của Cloud Firestore & Dẫn chứng chính thức

Trong tài liệu chính thức của Google Firebase, Firestore định nghĩa mô hình tính phí dựa trên **Document Operations (Các thao tác trên tài liệu)**:

#### 1. Trích dẫn nguyên văn từ tài liệu Firebase:
- 🔗 **Mục [Operations Pricing](https://firebase.google.com/docs/firestore/pricing#operations) (hoặc [Google Cloud Firestore Pricing](https://cloud.google.com/firestore/pricing#operations)):**
  > *"When you use Cloud Firestore, you are charged for the following:*
  > *- **Document operations:** The number of documents you read, write, and delete.*
  > *- **When you perform a query, you are charged for a read for each document that is retrieved.**"*
  > 
  > *(Dịch: Khi bạn thực hiện một câu truy vấn (query/getDocs), bạn bị tính phí 1 lượt đọc cho MỖI tài liệu được lấy về.)*

- 🔗 **Mục [Minimum charge for queries](https://firebase.google.com/docs/firestore/pricing#minimum_charge_for_queries):**
  > *"There is a minimum charge of one document read for each query that you perform, even if the query returns no results."*
  > 
  > *(Dịch: Luôn có một khoản phí tối thiểu là 1 lượt đọc cho mỗi query bạn thực hiện, kể cả khi query đó không trả về document nào.)*

- 🔗 **Mục [Offsets in queries](https://firebase.google.com/docs/firestore/pricing#offsets):**
  > *"You are charged for document reads skipped by an offset. For example, if your query has an offset of 10, and the query returns 1 document, you are charged for 11 document reads."*
  > 
  > *(Dịch: Bạn bị tính phí cho tất cả các tài liệu bị bỏ qua bởi `offset`. Ví dụ: nếu query có `offset(10)` và trả về 1 document, bạn bị tính tổng cộng 11 lượt đọc!)*

- 🔗 **Mục [Aggregation Queries Pricing (count)](https://firebase.google.com/docs/firestore/query-data/aggregation-queries#pricing_for_count_queries):**
  > *"For aggregation queries such as `count()`, you are charged one document read for each batch of up to 1,000 index entries matched by the query."*
  > 
  > *(Dịch: Đối với các truy vấn tổng hợp như `count()`, bạn chỉ bị tính 1 lượt đọc cho mỗi lô tối đa 1.000 mục index khớp với truy vấn.)*

- 🔗 **Mục [Spark Free Tier Quota](https://firebase.google.com/docs/firestore/quotas#free-quota):**
  > *"Document reads: 50,000 per day"*
  > 
  > *(Dịch: Hạn mức miễn phí gói Spark là 50.000 lượt đọc tài liệu mỗi ngày, reset lúc 00:00 PST / 14:00 giờ Việt Nam.)*

#### 2. Bảng đối chiếu thực tế:

| Loại thao tác | Quy tắc tính phí Read | Hệ quả thực tế với EchoChunk |
|---|---|---|
| **Lấy 1 tài liệu (`getDoc`)** | 1 Document Read cho mỗi tài liệu (kể cả khi doc không tồn tại) | Đọc doc `stats/current` = **1 Read** |
| **Truy vấn danh sách (`getDocs`)** | **1 Read cho MỖI document được trả về** trong kết quả | 193 custom chunks $\rightarrow$ `getDocs()` ngốn **193 Reads** mỗi lần F5! |
| **Truy vấn không có kết quả (Empty Query)** | Tối thiểu **1 Read** cho bản thân câu truy vấn | Query tìm kiếm không khớp dòng nào $\rightarrow$ Vẫn tính **1 Read** |
| **Phân trang bằng `offset(n)`** | **Tính phí TOÀN BỘ số document bị bỏ qua** | `offset(100).limit(10)` sẽ bị tính **110 Reads**! Do đó bắt buộc phải dùng cursor (`startAfter`). |
| **Truy vấn tổng hợp đếm (`count()`)** | **1 Read cho mỗi tối đa 1,000 index entries** được quét | Đếm 193 custom chunks chỉ tốn đúng **1 Read** (thay vì 193 Reads) |
| **Giới hạn dung lượng 1 Document** | **Tối đa 1 MiB (1,048,576 bytes)** cho mỗi document | Vượt 1MB sẽ văng lỗi `Document exceeds maximum size limit` |
| **Định mức gói Free (Spark Plan)** | **50,000 Reads / ngày** | 250 reads/lượt tải $\rightarrow$ Chỉ 200 lượt F5 là cạn sạch 50k reads của ngày |

### Nguyên nhân gốc rễ
1. **Mô hình Subcollection phân mảnh cho `progress`**:
   - Trước đây, mỗi câu học được lưu thành 1 document riêng trong `users/{uid}/progress/{chunkId}`.
   - Khi người dùng vào trang, client gọi `getDocs(collection(db, 'users', uid, 'progress'))`. Nếu người dùng đã học 100 câu, 1 lần F5 = 100 Reads.
2. **Kéo toàn bộ Subcollection `customChunks` khi vào trang**:
   - 193 từ vựng cá nhân được kéo về bằng `getDocs(collection(db, 'users', uid, 'customChunks'))` ở mỗi lần vào trang hoặc chuyển tài khoản. 1 lần F5 = 193 Reads.
3. **Hiểm họa giới hạn 1MB/doc nếu gộp toàn bộ `customChunks` vào 1 document**:
   - Nếu nhét toàn bộ 193 custom chunks (chứa nhiều ví dụ, ngữ cảnh, IPA tùy biến) vào chung 1 tài liệu Firestore, kích thước tài liệu sẽ nhanh chóng vượt quá trần 1MB của Firestore (`Document exceeds maximum size limit: 1048576 bytes`), làm sập toàn bộ tính năng lưu dữ liệu.

### Cách khắc phục (Kiến trúc Zero-Read / Single Document Pattern)

1. **Single Document Summary Pattern cho `progress`**:
   - `progress` là các entity rất nhẹ (chỉ gồm `repetitions`, `intervalDays`, `dueDate`, `confidenceScore`...). 500 progress chỉ chiếm ~30KB (dưới 3% giới hạn 1MB).
   - Gom toàn bộ tiến độ vào 1 document duy nhất: `users/{uid}/progress_summary/current`.
   - **Hiệu quả**: 1 lần vào trang = đúng **1 Read duy nhất** (tiết kiệm 99% lượt đọc cho tiến độ).

2. **Bảo tồn Subcollection NoSQL cho `customChunks` + Chiến lược Client Cache-First**:
   - Giữ nguyên cấu trúc NoSQL chuẩn: `users/{uid}/customChunks/{chunkId}` để không bao giờ lo chạm trần 1MB document limit.
   - Áp dụng nguyên tắc **Client Cache-First**: Khi vào trang, client kiểm tra LocalStorage (`loadCustomChunks(user.uid)`). Nếu thiết bị đã có sẵn dữ liệu từ trước, sử dụng luôn và **KHÔNG** gọi Firestore Cloud $\rightarrow$ **0 Read** khi reload trang hoặc chuyển tab.
   - Chỉ gọi Cloud khi thiết bị mới / trình duyệt mới chưa có cache.

3. **Lưu trường đếm `customChunksCount` trong `stats/current` & Aggregation Query**:
   - Thêm trường `customChunksCount` vào document `users/{uid}/stats/current`. Khi người dùng tạo hoặc xóa từ vựng, client cập nhật trực tiếp biến đếm này cùng với stats.
   - Phía Server SSR (`practiceData.ts`), khi pre-fetch chỉ cần đọc `stats` và chạy truy vấn tổng hợp `collection('customChunks').count().get()` (chỉ tính 1 Read cho 1,000 index entries) để lấy số lượng hiển thị tab mà không cần tải nội dung 193 tài liệu.

---

## 13. Khắc phục Overfetching danh mục YouTube bằng Cursor-based Pagination & Infinite Scroll

### Triệu chứng
- Tab Khám phá video YouTube (`/api/youtube/explore`) và Lịch sử xem (`YouTubeRecentVideos`) tải toàn bộ danh mục từ Cloud mỗi khi người dùng truy cập.
- Khi kho video mở rộng, lượng Firestore Read tăng đột biến theo cấp số nhân và gây giật lag DOM khi render quá nhiều video cùng lúc.

### Nguyên nhân gốc rễ
- Thiếu cơ chế phân trang cursor-based trên Firestore.
- Nếu dùng phân trang truyền thống bằng `offset(n)` trong Firestore thì không hiệu quả vì Firestore vẫn tính phí đọc cho toàn bộ $n$ documents bị bỏ qua.

### Cách khắc phục
1. **Cursor-based Pagination trên Firestore**:
   - Phía backend Firestore ([`youtubeTranscript.ts`](file:///d:/SelfLearning/EchoChunk/src/lib/client/firebase/firestore/youtubeTranscript.ts) & [`route.ts`](file:///d:/SelfLearning/EchoChunk/src/app/api/youtube/explore/route.ts)), áp dụng:
     ```ts
     let q = query(collection(db, 'youtube_transcripts'), orderBy('updatedAt', 'desc'), limit(12));
     if (cursor) {
       q = query(..., startAfter(Timestamp.fromMillis(cursor)), limit(12));
     }
     ```
   - Trả về `nextCursor` là `updatedAt` của phần tử cuối cùng để client làm mốc tiếp tục.
2. **Infinite Scroll mượt mà bằng `IntersectionObserver`**:
   - Trong [`YouTubeExploreLibrary.tsx`](file:///d:/SelfLearning/EchoChunk/src/components/youtube/YouTubeExploreLibrary.tsx), đặt thẻ sentinel ở cuối danh sách với `rootMargin: '300px'`. Khi người dùng cuộn gần tới đáy, request batch tiếp theo tự động được kích hoạt ngầm, hiển thị hàng skeleton tạm thời mà không chặn thao tác người dùng.
3. **Giới hạn dung lượng Lịch sử xem**:
   - Giới hạn tải tối đa 30 video từ Cloud ([`youtubeHistory.ts`](file:///d:/SelfLearning/EchoChunk/src/lib/client/firebase/firestore/youtubeHistory.ts)), lưu trữ tối đa 50 video trên Local Storage ([`youtubeHistoryStore.ts`](file:///d:/SelfLearning/EchoChunk/src/stores/youtubeHistoryStore.ts)).
   - Tại component hiển thị ([`YouTubeRecentVideos.tsx`](file:///d:/SelfLearning/EchoChunk/src/components/youtube/YouTubeRecentVideos.tsx)), áp dụng phân trang batch 6 video/lượt cuộn kèm theo sentinel observer.

---

## 14. Lỗi Hydration Mismatch, Cascading Refresh trong `AuthContext` & Chập chờn giao diện SSR vs Client

### Triệu chứng
1. Console trình duyệt xuất hiện cảnh báo đỏ:
   ```text
   Can't perform a React state update on a component that hasn't mounted yet...
   Hydration failed because the server rendered HTML didn't match the client.
   ```
2. Thẻ bao ngoài `<div className="app-layout">` bị Next.js tạm thời thay thế bằng `<div hidden="">` (Suspense transition) khi tải trang.
3. Terminal ghi nhận `GET /luyen-noi` bị gọi lại 3 lần liên tiếp trong chưa đầy 1 giây.
4. Giao diện bị chập chờn / nhảy vọt (flicker):
   - Tab *"⭐ Từ vựng của tôi"* không hiển thị lúc đầu (SSR), sau khi client mount xong mới bất ngờ chèn vào làm xô lệch toàn bộ thanh tab sang phải.
   - Thẻ thống kê hiển thị *"8 cần ôn"*, sau khi client mount xong nhảy vọt lên *"13 cần ôn"*.
   - Thẻ học bài bị ép hiển thị Skeleton chập chờn 1 nhịp dù server đã có sẵn dữ liệu.

### Nguyên nhân gốc rễ
1. **Side-effect trong hàm updater của `setUser`**:
   - Trong [`AuthContext.tsx`](file:///d:/SelfLearning/EchoChunk/src/context/AuthContext.tsx), `router.refresh()` bị đặt bên trong callback updater:
     ```tsx
     // ❌ SAI: Side-effect bên trong pure updater function
     setUser((prev) => {
       if (!prev && currentUser) {
         router.refresh();
       }
       return currentUser;
     });
     ```
   - Khi Firebase Auth khởi tạo lúc client chưa mount xong, callback này chạy và gọi `router.refresh()`, ép Next.js refetch server components ngay giữa lúc React đang hydrate dở cây DOM $\rightarrow$ Gây lỗi Hydration Mismatch và DevTools panic.
2. **Tính toán `dynamicTopics` phụ thuộc `allChunks`**:
   - Ở SSR, `allChunks` chỉ có 361 câu mặc định. Thuộc tính `c.isCustom` đều bằng false $\rightarrow$ `customCount = 0` $\rightarrow$ Tab *"⭐ Từ vựng của tôi"* không được sinh ra. Khi client mount xong, LocalStorage nạp 193 custom chunks $\rightarrow$ Tab bị chèn bất ngờ vào vị trí số 1.
3. **Tính `reviewDueCount` bằng cách lọc `allChunks`**:
   - Code cũ: `allChunks.filter(c => progressMap[c.id] && isDue)`. Vì `allChunks` ở SSR chỉ có 361 câu, nó chỉ lọc được 8 câu mặc định đến hạn. Khi sang client có thêm 193 custom chunks, nó lọc thêm 5 câu custom đến hạn $\rightarrow$ Con số nhảy từ 8 lên 13.
4. **Ép buộc Skeleton `!isClient` trong các trang học**:
   - Điều kiện `{!isClient ? <Skeleton /> : ...}` tại `shadowing`, `reflex`, `blanks` ép buộc trình duyệt luôn phải hiển thị khung xám Skeleton dù `initialPracticeData` từ SSR đã có sẵn `currentChunk`.

### Cách khắc phục
1. **Chuẩn hóa `AuthContext.tsx`**:
   - Loại bỏ hoàn toàn `router.refresh()` khỏi hàm updater `setUser`.
   - Sử dụng `isMountedRef` và chỉ gọi `router.refresh()` trong `useEffect` khi phiên người dùng thực sự thay đổi so với SSR:
     ```tsx
     if (isMountedRef.current && currentUser?.uid !== initialUser?.uid) {
       router.refresh();
     }
     ```
2. **Đồng bộ hóa `dynamicTopics` từ SSR**:
   - Trong [`PracticeContext.tsx`](file:///d:/SelfLearning/EchoChunk/src/context/PracticeContext.tsx), khi `!isClient`, ưu tiên giữ nguyên `initialData.dynamicTopics` từ server.
   - Tính toán `customCount` với fallback sang `userStats.customChunksCount` để tab "Từ vựng của tôi (193)" luôn hiển thị ngay từ HTML đầu tiên.
3. **Tính `reviewDueCount` trực tiếp từ `progressMap`**:
   - Thay vì lặp qua `allChunks`, lọc trực tiếp trên `Object.values(progressMap)`:
     ```typescript
     const reviewDueCount = Object.values(progressMap).filter((prog) => {
       if (!prog || prog.repetitions === 0) return false;
       return new Date(prog.dueDate).getTime() <= todayTimestamp;
     }).length;
     ```
   - Cả Server và Client đều đếm đúng **13 câu cần ôn** ngay từ đầu.
4. **Gỡ bỏ Skeleton ép buộc**:
   - Chỉ hiển thị Skeleton khi thực sự không có `currentChunk` (`if (!isClient && !currentChunk)`). Dữ liệu có sẵn từ SSR được render thẳng vào DOM ngay lập tức.

---

## 15. Lỗi logic gán nhầm `topicId: 'STUDIED'` cho từ vựng mới trong modal thêm chunk

### Triệu chứng
- Khi người dùng bấm "+ Thêm Chunk", ô "Chủ đề" mặc định hiển thị "🧠 Đã luyện tập".
- Trong Firestore, có tới 173/193 custom chunks của người dùng bị gán nhầm `topicId: "STUDIED"`.
- Menu dropdown chọn chủ đề xuất hiện cả mục "🧠 Đã luyện tập" như một chủ đề nội dung.

### Nguyên nhân gốc rễ
1. Trong [`PracticeModals.tsx`](file:///d:/SelfLearning/EchoChunk/src/components/PracticeModals.tsx), modal nhận danh sách `existingTopics` lấy từ `dynamicTopics`.
2. Do tab "🧠 Đã luyện tập" (`topicId: 'STUDIED'`) nằm ở vị trí đầu tiên (index 0) của `dynamicTopics`, hook [`useChunkEditor.ts`](file:///d:/SelfLearning/EchoChunk/src/hooks/useChunkEditor.ts) trước đó khởi tạo:
   ```ts
   // ❌ Lấy trúng topicId: 'STUDIED' ở index 0
   const [topicId, setTopicId] = useState(existingTopics[0]?.topicId || "CUSTOM");
   ```
3. Component [`TopicDropdown.tsx`](file:///d:/SelfLearning/EchoChunk/src/components/ChunkModal/TopicDropdown.tsx) chỉ lọc bỏ `CUSTOM`, chưa lọc bỏ `STUDIED`. Trong khi đó, "Đã luyện tập" là trạng thái ôn tập (learning status), không phải chủ đề nội dung.

### Cách khắc phục
1. **Đặt mặc định chuẩn khi thêm mới**:
   Trong [`useChunkEditor.ts`](file:///d:/SelfLearning/EchoChunk/src/hooks/useChunkEditor.ts), luôn gán mặc định `topicId: "CUSTOM"` và `customTopicName: "Từ vựng của tôi"`.
2. **Lọc sạch danh sách chủ đề**:
   Cả ở `PracticeModals` và `TopicDropdown`, lọc bỏ hoàn toàn các mục trạng thái:
   ```tsx
   existingTopics.filter((t) => t.topicId !== "CUSTOM" && t.topicId !== "STUDIED" && t.topicId !== "ALL")
   ```
3. **Tự động chuẩn hóa dữ liệu cũ**:
   Khi nạp chunk để sửa hoặc khi lưu, nếu phát hiện `topicId === "STUDIED"` hoặc `"ALL"`, hệ thống tự động đưa về `"CUSTOM"`.
4. **Đơn giản hóa giao diện**:
   Xóa bỏ dòng nhập "Tên chủ đề riêng" dư thừa trong modal theo yêu cầu của người dùng, đặt nhãn thống nhất là **"⭐ Từ vựng của tôi"**.

