# ERRORS.md — Nhật ký Lỗi, Nguyên nhân Gốc rễ & Giải pháp (EchoChunk)

> **Dự án:** EchoChunk  
> **Cập nhật lần cuối:** 2026-10-03  

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
16. [Thời gian LCP/TTFB quá lâu (3.6s - 6.34s) trên Vercel do Blocking Firestore SSR, Token CheckRevoked & Thiếu Region `sin1`](#16-thời-gian-lcpttfb-quá-lâu-36s---634s-trên-vercel-do-blocking-firestore-ssr-token-checkrevoked--thiếu-region-sin1)
17. [Google Search Console báo 'URL không xác định' do Trang chủ thiếu trong Sitemap & bị Redirect 307](#17-google-search-console-báo-url-không-xác-định-do-trang-chủ-thiếu-trong-sitemap--bị-redirect-307)
18. [Lỗi cuộn ngầm (Scroll Leaking) & Thanh cuộn xấu khi Modal mở trên Desktop/Mobile](#18-lỗi-cuộn-ngầm-scroll-leaking--thanh-cuộn-xấu-khi-modal-mở-trên-desktopmobile)
19. [Cảnh báo Next.js `next/image` về Aspect Ratio khi dùng Tailwind resize ảnh (`/icons/duo-turtle.png`)](#19-cảnh-báo-nextjs-nextimage-về-aspect-ratio-khi-dùng-tailwind-resize-ảnh-iconsduo-turtlepng)
20. [Lỗi Crash `IllegalStateException` khi mở Google OAuth Popup trong Android WebView](#20-lỗi-crash-illegalstateexception-khi-mở-google-oauth-popup-trong-android-webview)
21. [Lỗi Firebase Auth trắng màn hình & "missing initial state" do thiếu Multi-window & chặn Third-party Cookies trong Android WebView](#21-lỗi-firebase-auth-trắng-màn-hình--missing-initial-state-do-thiếu-multi-window--chặn-third-party-cookies-trong-android-webview)
22. [Lỗi Gradle Build fail với `Unsupported class file major version 69` khi build APK bằng Java 25](#22-lỗi-gradle-build-fail-với-unsupported-class-file-major-version-69-khi-build-apk-bằng-java-25)
23. [Lỗi Modal `position: fixed` bị cắt cụt do lồng bên trong thẻ cha có `backdrop-filter` hoặc `transform` (CSS Containing Block Gotcha)](#23-lỗi-modal-position-fixed-bị-cắt-cụt-do-lồng-bên-trong-thẻ-cha-có-backdrop-filter-hoặc-transform-css-containing-block-gotcha)
24. [Lỗi Flash/Nhấp nháy phiên âm IPA (hiển thị câu tiếng Anh thô rồi đổi sang IPA) & Cụt âm vị từ ghép có gạch nối](#24-lỗi-flashnhấp-nháy-phiên-âm-ipa-hiển-thị-câu-tiếng-anh-thô-rồi-đổi-sang-ipa--cụt-âm-vị-từ-ghép-có-gạch-nối)
25. [Lỗi lệch số lượng chunk giữa SSR và Client: Nhảy số 'Từ vựng của tôi' (244 -> 242) và Topic gốc bị trừ hụt (Work & Business 58 -> 57)](#25-lỗi-lệch-số-lượng-chunk-giữa-ssr-và-client-nhảy-số-từ-vựng-của-tôi-244---242-và-topic-gốc-bị-trừ-hụt-work--business-58---57)
26. [Lỗi bất đồng bộ dữ liệu giữa nhiều thiết bị/môi trường (Localhost vs Web Deployed): Hiện tượng 'Zombie Data' hồi sinh video/chunk đã xóa & Cache cũ đè dữ liệu mới](#26-lỗi-bất-đồng-bộ-dữ-liệu-giữa-nhiều-thiết-bịmôi-trường-localhost-vs-web-deployed-hiện-tượng-zombie-data-hồi-sinh-videochunk-đã-xóa--cache-cũ-đè-dữ-liệu-mới)

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

---

## 16. Thời gian LCP/TTFB quá lâu (3.6s - 6.34s) trên Vercel do Blocking Firestore SSR, Token CheckRevoked & Thiếu Region `sin1`

### Triệu chứng & Cách phát hiện bằng lệnh `curl`
- Khi truy cập lần đầu trang `/luyen-noi` (`https://speaking-english.taiphanvan.id.vn/luyen-noi`), thời gian phản hồi (TTFB/LCP) lên tới **3.6s – 6.34s**.
- **Cách phát hiện Vercel điều hướng request sang Mỹ**:
  Chạy lệnh kiểm tra HTTP Header phản hồi bằng `curl`:
  ```bash
  curl -sI https://speaking-english.taiphanvan.id.vn/luyen-noi
  ```
- **Kết quả Header thực tế trả về**:
  ```http
  HTTP/1.1 200 OK
  Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate
  X-Vercel-Cache: MISS
  X-Vercel-Id: hkg1::iad1::f5qg7-1790483944163-903cf3876698
  ```
- **Giải mã Header `X-Vercel-Id` theo chuẩn Vercel**:
  Theo tài liệu Vercel, định dạng của header này là `[Edge_Region]::[Compute_Region]::[Request_UUID]`:
  * `hkg1`: Trạm Vercel Edge tiếp nhận request đầu vào tại Hong Kong (gần Việt Nam).
  * `iad1`: Trạm máy chủ Serverless Function thực thi mã nguồn SSR tại **Washington D.C. (Bờ Đông nước Mỹ)**.
  * Dấu nối `hkg1::iad1` là bằng chứng rõ ràng cho thấy Edge tại châu Á buộc phải chuyển tiếp (forward) toàn bộ gói tin xuyên Thái Bình Dương sang Washington D.C. để chạy hàm Node.js SSR, khiến người dùng Việt Nam chịu độ trễ mạng vật lý **200ms – 250ms cho mỗi chiều**.

### Dẫn chứng Tài liệu Kỹ thuật (Official Documentation)
1. 🔗 [Vercel Serverless Functions Regional Configuration](https://vercel.com/docs/functions/configuring-functions/region):
   > *"By default, Serverless Functions execute in Washington, D.C., USA (iad1)... You can configure the region for your Serverless Functions by defining the `regions` property in `vercel.json`."*
2. 🔗 [Vercel Edge Network Regions & Codes](https://vercel.com/docs/concepts/edge-network/regions):
   > Danh mục mã vùng: `sin1` tương ứng với Singapore (`ap-southeast-1`), là khu vực tối ưu nhất cho người dùng khu vực Đông Nam Á / Việt Nam.
3. 🔗 [Vercel Diagnostic Headers (`x-vercel-id`)](https://vercel.com/docs/concepts/edge-network/headers#x-vercel-id):
   > Quy ước giải mã trạm Edge tiếp nhận và trạm Compute xử lý.

### Nguyên nhân gốc rễ
1. **Thiếu cấu hình Serverless Region (`vercel.json`)**: Vercel mặc định chạy Serverless Function ở `iad1` (US East). Khoảng cách địa lý ~12.000 km gây độ trễ mạng vật lý **200ms – 250ms/chiều** cho mỗi round-trip giữa Việt Nam, Vercel và Firebase.
2. **`verifySessionCookie` bật `checkRevoked: true`**: Phía server SSR gọi `auth.verifySessionCookie(cookie, true)`, bắt buộc Firebase Admin phải thực hiện thêm 1 HTTP call sang máy chủ Google Identity Toolkit để kiểm tra trạng thái thu hồi token (mất thêm 300ms – 600ms).
3. **Thừa truy vấn Firestore trên chu trình SSR**:
   - `getInitialServerData()` gọi song song cả 4 tài liệu: `progress_summary`, `stats`, `rootUserDoc` và truy vấn tổng hợp `customChunks.count()`. Trong đó `rootUserDoc` và `count()` là hoàn toàn dư thừa vì `stats` đã lưu sẵn trường đếm `customChunksCount`.
4. **Bloat RSC Payload (800KB chuỗi JSON thừa)**:
   - Server gửi mảng `allChunks` (515 chunks) và `practiceQueue` (thêm 515 chunks) qua `initialPracticeData`. Next.js serialize toàn bộ ~1.030 đối tượng JSON vào thẻ `<script>` RSC của HTML, trong khi client `PracticeContext` vốn đã import sẵn `speaking-chunks.json` từ bundle.

### Cách khắc phục (Đợt 1)
1. **Thêm `vercel.json` ép Region về Singapore (`sin1`)**:
   Tạo file `vercel.json` tại thư mục gốc:
   ```json
   {
     "$schema": "https://openapi.vercel.sh/vercel.json",
     "regions": ["sin1"]
   }
   ```
   Hoặc cấu hình trên Vercel Dashboard: **Settings > Functions > Function Region > Singapore (sin1)**.
   Sau khi đổi, header `X-Vercel-Id` sẽ chuyển từ `hkg1::iad1::...` sang `hkg1::sin1::...`, giảm ping từ Việt Nam sang máy chủ serverless từ **~220ms xuống còn ~30ms** (giảm 7 lần độ trễ mạng).
2. **Tối ưu xác thực token cục bộ**:
   Trong [`admin.ts`](file:///d:/SelfLearning/EchoChunk/src/lib/server/admin.ts), đổi `auth.verifySessionCookie(sessionCookie, false)`. Token được xác thực chữ ký số bằng Public Key cache trong bộ nhớ (thời gian thực thi < 1ms, không phát sinh HTTP request).
3. **Thu gọn truy vấn Firestore & Thêm SSR Fail-safe Timeout**:
   Trong [`practiceData.ts`](file:///d:/SelfLearning/EchoChunk/src/lib/server/practiceData.ts):
   - Chỉ đọc 2 tài liệu thiết yếu: `progress_summary` và `stats/current`.
   - Bọc `Promise.race` với timeout **1.200ms**. Nếu kết nối Firestore từ máy chủ vượt quá 1.2s, hệ thống tự động trả về dữ liệu mặc định để gửi HTML Shell ngay lập tức; client sẽ hydrate tiến độ thực tế qua LocalStorage (0ms) và background sync.
4. **Loại bỏ trùng lặp dữ liệu trong RSC Payload**:
   Bỏ việc truyền `allChunks` và `practiceQueue` từ `initialPracticeData`. Phía client `PracticeContext` tự động fallback về `data.chunks` có sẵn trong bundle, giảm ngay **~800KB** dung lượng tải về của tài liệu HTML ban đầu.

### Cách khắc phục (Đợt 2: Tách Bundle, Lazy-load IPA 3.26MB & Dynamic Modals)
1. **Dynamic Import & Idle Prefetch cho `american-ipa.json` (3.26MB)**:
   - Trong [`ipa.ts`](file:///d:/SelfLearning/EchoChunk/src/lib/shared/ipa.ts), chuyển `import ipaData from '@/data/american-ipa.json'` thành hàm `ensureIpaDict()` nạp động (`import('@/data/american-ipa.json')`).
   - Kết hợp `window.requestIdleCallback`: Chỉ tải file 3.26MB này trong background khi trình duyệt đã rảnh rỗi (idle), hoàn toàn không chiếm băng thông và không chặn thời điểm render LCP / FCP ban đầu.
2. **Code-splitting Modals với `next/dynamic`**:
   - Trong [`PracticeModals.tsx`](file:///d:/SelfLearning/EchoChunk/src/components/PracticeModals.tsx), nạp lười `AnalyticsModal` và `ChunkModal` bằng `dynamic(..., { ssr: false })` và chỉ render vào DOM khi `isAnalyticsOpen` hoặc `isChunkModalOpen` là `true`.
   - Giúp toàn bộ mã nguồn của Modal tạo/sửa chunk và thư viện biểu đồ không bị kéo vào bundle critical path của trang chính.
3. **Ưu tiên trường IPA có sẵn**:
   - Trong [`QuickReflexMode.tsx`](file:///d:/SelfLearning/EchoChunk/src/components/QuickReflexMode.tsx), ưu tiên đọc `chunk.chunkIpa || chunk.ipa` có sẵn trước khi gọi hàm phân tích, loại bỏ các lệnh import không sử dụng.

### Kết quả đo kiểm thực tế (Lần 1)
- **LCP**: Giảm từ **3.6s – 6.34s** xuống **0.70s** (🟢 Đạt chuẩn Xanh lá Core Web Vitals, nhanh hơn ~9 lần).
- **CLS**: Duy trì **0** tuyệt đối (Zero Layout Shift).
- **INP**: **8ms** (tương tác phản hồi tức thì).

---

## 17. Google Search Console báo 'URL không xác định' do Trang chủ thiếu trong Sitemap & bị Redirect 307

### Triệu chứng
- Khi dán URL trang chủ `https://speaking-english.taiphanvan.id.vn/` vào thanh kiểm tra URL (URL Inspection) của Google Search Console, nhận được thông báo:
  * *"Google không xác định được URL"* (URL is unknown to Google).
  * *"Không phát hiện sơ đồ trang web giới thiệu nào"*.
  * *"Không phát hiện được trang nào"*.
  * *"Không áp dụng"*.

### Nguyên nhân gốc rễ
1. **Thiếu khai báo URL gốc trong [`sitemap.ts`](file:///d:/SelfLearning/EchoChunk/src/app/sitemap.ts)**:
   - File `sitemap.ts` chỉ khai báo 6 URL con (`/luyen-noi`, `/phan-xa`, `/dien-tu`, `/kho-tu-vung`, `/youtube`, `/gioi-thieu`).
   - URL trang chủ `https://speaking-english.taiphanvan.id.vn` hoàn toàn bị bỏ sót, khiến Googlebot khi đọc sitemap không phát hiện được trang chủ.
2. **Trang chủ bị chuyển hướng tạm thời (HTTP 307 Temporary Redirect)**:
   - Trong file [`src/app/(main)/page.tsx`](file:///d:/SelfLearning/EchoChunk/src/app/%28main%29/page.tsx), code cũ thực hiện:
     ```ts
     export default function RootPage() {
       redirect('/luyen-noi'); // ❌ Trả về HTTP 307
     }
     ```
   - Khi Googlebot crawl `https://speaking-english.taiphanvan.id.vn/`, server không trả về mã `200 OK` chứa nội dung mà trả về `307 Temporary Redirect` sang `/luyen-noi`.
   - Google **không bao giờ lập chỉ mục (index)** một URL chuyển hướng tạm thời 307.
3. **Thẻ Canonical trong [`layout.tsx`](file:///d:/SelfLearning/EchoChunk/src/app/layout.tsx) trỏ nhầm**:
   - `alternates.canonical` ở layout gốc khai báo `canonical: "/luyen-noi"`, vô tình thông báo cho Google biết trang chủ `/` không phải là bản gốc.

### Cách khắc phục
1. **Biến trang chủ `/` thành trang 200 OK thực thụ (Server Component)**:
   - Trong [`src/app/(main)/page.tsx`](file:///d:/SelfLearning/EchoChunk/src/app/%28main%29/page.tsx), render trực tiếp component `<ShadowingPage />` để người dùng và bot truy cập `https://speaking-english.taiphanvan.id.vn/` sẽ nhận ngay mã `HTTP 200 OK` kèm đầy đủ nội dung bài học và thẻ meta SEO.
2. **Khai báo Canonical chuẩn cho trang chủ**:
   - Trong `src/app/layout.tsx`, đổi `canonical: "/"` (trỏ về chính domain gốc `https://speaking-english.taiphanvan.id.vn/`).
   - Trong `src/app/(main)/page.tsx`, bổ sung metadata với `alternates: { canonical: '/' }`.
3. **Bổ sung trang chủ vào Sitemap**:
   - Trong [`src/app/sitemap.ts`](file:///d:/SelfLearning/EchoChunk/src/app/sitemap.ts), thêm `${baseUrl}` vào vị trí đầu tiên với `priority: 1.0`, `changeFrequency: 'daily'`. Nâng tổng số URL trong sitemap lên **7 URL**.
4. **Cập nhật link Brand Logo trên Navbar**:
   - Trong [`Navbar.tsx`](file:///d:/SelfLearning/EchoChunk/src/components/Navbar.tsx), đổi link logo EchoChunk trỏ về `/` (`<Link href="/">`), giữ liên kết nội bộ hướng về trang chủ mạnh mẽ.

---

## 18. Lỗi cuộn ngầm (Scroll Leaking) & Thanh cuộn xấu khi Modal mở trên Desktop/Mobile

### Triệu chứng
1. Khi mở modal (`ChunkModal`, `AnalyticsModal`), người dùng cuộn chuột bên trong modal nhưng khi cuộn tới đỉnh/đáy thì sự kiện cuộn tiếp tục bị truyền sang trang nền (`<body>`), làm trang chính phía sau giật nảy và dịch chuyển vị trí học.
2. Trên hệ điều hành Windows, thanh cuộn dọc mặc định của trình duyệt rất to dày (`17px`), có nút mũi tên lên/xuống màu xám thô cứng, làm hỏng ngôn ngữ thiết kế tối giản tinh tế (Notion/Linear aesthetic).
3. Đóng mở nhiều modal lồng nhau (ví dụ: mở `ChunkModal` rồi mở thêm dialog xác nhận) có thể gây mất trạng thái khoá cuộn khi một modal con đóng trước.

### Nguyên nhân gốc rễ
1. **Thiếu cơ chế khoá cuộn nền toàn diện**: Không đặt `overflow: hidden !important` và `overscroll-behavior: contain` trên cả `document.body` và `document.documentElement` khi modal active.
2. **Xung đột State giữa các Modal (No Reference Counting)**: Nếu dùng logic thô sơ `useEffect(() => { document.body.style.overflow = 'hidden'; return () => document.body.style.overflow = ''; })` trong từng modal riêng lẻ, khi có 2 modal cùng mở và 1 modal đóng trước, nó sẽ mở khoá `overflow` của `body` ngay lập tức dù modal thứ hai vẫn đang hiển thị.
3. **Thanh cuộn mặc định của trình duyệt**: Thiếu cấu hình CSS rules cho `scrollbar-width: thin`, `scrollbar-color`, và `::-webkit-scrollbar` tùy biến mỏng nhẹ, bo tròn, track trong suốt.

### Cách khắc phục
1. **Xây dựng Custom Hook `useBodyScrollLock` có Reference Counting**:
   - Trong [`src/hooks/useBodyScrollLock.ts`](file:///d:/SelfLearning/EchoChunk/src/hooks/useBodyScrollLock.ts), duy trì biến toàn cục `activeLocksCount`:
     ```ts
     let activeLocksCount = 0;
     export function useBodyScrollLock(isLocked: boolean = true) {
       useEffect(() => {
         if (!isLocked) return;
         activeLocksCount++;
         document.body.classList.add("modal-open");
         document.documentElement.classList.add("modal-open");
         return () => {
           activeLocksCount = Math.max(0, activeLocksCount - 1);
           if (activeLocksCount === 0) {
             document.body.classList.remove("modal-open");
             document.documentElement.classList.remove("modal-open");
           }
         };
       }, [isLocked]);
     }
     ```
2. **Cấu hình chặn cuộn triệt để trong `globals.css`**:
   ```css
   body.modal-open, html.modal-open {
     overflow: hidden !important;
     overscroll-behavior: contain;
   }
   ```
3. **Xây dựng Utility Class `.scrollbar-thin` chuẩn Notion**:
   - Thiết lập thanh cuộn siêu mảnh (`6px`), bo góc tròn `9999px`, nền track trong suốt, màu thumb xám nhẹ tinh tế (`#cbd5e1`) và hover tối dần (`#94a3b8`):
   ```css
   .scrollbar-thin {
     scrollbar-width: thin;
     scrollbar-color: #cbd5e1 transparent;
   }
   .scrollbar-thin::-webkit-scrollbar {
     width: 6px;
     height: 6px;
   }
   .scrollbar-thin::-webkit-scrollbar-thumb {
     background-color: #cbd5e1;
     border-radius: 9999px;
   }
   ```

---

## 19. Cảnh báo Next.js `next/image` về Aspect Ratio khi dùng Tailwind resize ảnh (`/icons/duo-turtle.png`)

### Triệu chứng
Console trình duyệt hiển thị cảnh báo từ Next.js Image component khi truy cập các trang luyện tập (`/shadowing`, `/blanks`):
```text
[browser] Image with src "/icons/duo-turtle.png" has either width or height modified, but not the other. If you use CSS to change the size of your image, also include the styles 'width: "auto"' or 'height: "auto"' to maintain the aspect ratio.
```

### Nguyên nhân gốc rễ
1. **Cơ chế kiểm tra nội bộ của Next.js (`node_modules/next/dist/esm/client/image-component.js`):**
   ```js
   const heightModified = img.height.toString() !== img.getAttribute('height');
   const widthModified = img.width.toString() !== img.getAttribute('width');
   if ((heightModified && !widthModified) || (!heightModified && widthModified)) {
     warnOnce(
       `Image with src "${origSrc}" has either width or height modified, but not the other. If you use CSS to change the size of your image, also include the styles 'width: "auto"' or 'height: "auto"' to maintain the aspect ratio.`
     );
   }
   ```
   - Next.js **hoàn toàn không kiểm tra thuộc tính inline `style`** để quyết định tắt warning này! Câu thông báo *"also include the styles 'width: auto' or 'height: auto'"* chỉ là văn bản hướng dẫn tĩnh chung của Next.js khi phát hiện một chiều bị biến đổi độc lập.
   - Next.js so sánh trực tiếp kích thước thực tế hiển thị trên DOM (`img.width`, `img.height`) với giá trị thuộc tính HTML (`getAttribute('width')`, `getAttribute('height')`).
   - Cảnh báo **chỉ xuất hiện** khi toán tử logic kích hoạt: **MỘT TRONG HAI** chiều bị coi là "được sửa đổi bởi CSS" trong khi chiều còn lại vô tình trùng khớp hoàn toàn với thuộc tính HTML khai báo.
2. **Sai lầm cốt lõi: Coi `width`/`height` là kích thước hiển thị mong muốn thay vì kích thước gốc:**
   - Kích thước pixel gốc thực tế của file ảnh [`/public/icons/duo-turtle.png`](file:///d:/SelfLearning/EchoChunk/public/icons/duo-turtle.png) là **95 × 54** (tỉ lệ ~1.759).
   - Code cũ điền kích thước hiển thị mong muốn `width={19} height={11}` (tỉ lệ 19/11 ≈ 1.727) kèm CSS `className="w-[19px] h-auto"`.
   - Khi trình duyệt vẽ ảnh với `w-[19px]`:
     - Chiều rộng `img.width` là `19`, khớp chính xác với `getAttribute('width') = "19"` $\rightarrow$ `widthModified = false`.
     - Chiều cao được trình duyệt tính theo tỉ lệ file ảnh gốc: `19 * 54 / 95 = 10.79px ≈ 10px`, khác với `getAttribute('height') = "11"` $\rightarrow$ `heightModified = true`.
     - Điều kiện `(heightModified && !widthModified)` trả về `true` $\rightarrow$ Next.js nghi ngờ lập trình viên đổi kích thước làm méo tỉ lệ khung hình và bắn cảnh báo!
   - Tương tự trên desktop (`sm:w-[22px]` và `width={20} height={12}`):
     - `img.width = 22` lệch `20` $\rightarrow$ `widthModified = true`.
     - Chiều cao `22 * 54 / 95 = 12.48px ≈ 12px`, vô tình trùng khớp với `getAttribute('height') = "12"` $\rightarrow$ `heightModified = false`.
     - Điều kiện `(!heightModified && widthModified)` trả về `true` $\rightarrow$ Next.js tiếp tục bắn cảnh báo.

### Bản chất & Giải pháp triệt để
1. **Nguyên tắc vàng của Next.js `<Image>`:**
   - **`width` & `height` props:** Đại diện cho **Kích thước gốc (Intrinsic Dimensions)** của file ảnh (hoặc tỉ lệ gốc nguyên vẹn). Next.js dùng 2 số này để tính `aspect-ratio` dự trữ khung chỗ trên màn hình, triệt tiêu hoàn toàn hiện tượng giật trang (Cumulative Layout Shift - CLS) trong lúc ảnh đang tải.
   - **CSS (`className`):** Đại diện cho **Kích thước hiển thị thực tế** trên giao diện (`w-[17px] sm:w-[22px] h-auto`).
2. **Khai báo chuẩn xác kích thước gốc:**
   - [`/icons/duo-turtle.png`](file:///d:/SelfLearning/EchoChunk/public/icons/duo-turtle.png): Kích thước gốc **95 × 54** $\rightarrow$ khai báo `width={95}` và `height={54}`.
   - [`/icons/duo-speaker.png`](file:///d:/SelfLearning/EchoChunk/public/icons/duo-speaker.png): Kích thước gốc **101 × 80** $\rightarrow$ khai báo `width={101}` và `height={80}`.
3. **Thực thi trong mã nguồn:**
   - Trong [`src/components/ShadowingMode.tsx`](file:///d:/SelfLearning/EchoChunk/src/components/ShadowingMode.tsx#L433-L462):
     ```tsx
     <Image
       src="/icons/duo-speaker.png"
       alt="Phát âm bình thường"
       width={101}
       height={80}
       className="w-[19px] sm:w-[24px] h-auto object-contain pointer-events-none select-none"
       priority
     />

     <Image
       src="/icons/duo-turtle.png"
       alt="Phát âm chậm"
       width={95}
       height={54}
       className="w-[17px] sm:w-[22px] h-auto object-contain pointer-events-none select-none"
       priority
     />
     ```
   - Trong [`src/components/ChunkBlanksMode.tsx`](file:///d:/SelfLearning/EchoChunk/src/components/ChunkBlanksMode.tsx#L365-L393):
     ```tsx
     <Image
       src="/icons/duo-speaker.png"
       alt="Phát âm chuẩn"
       width={101}
       height={80}
       className="w-[20px] h-auto object-contain pointer-events-none select-none"
       priority
     />

     <Image
       src="/icons/duo-turtle.png"
       alt="Phát âm chậm"
       width={95}
       height={54}
       className="w-[19px] h-auto object-contain pointer-events-none select-none"
       priority
     />
     ```
   - Khi đó, cả hai chiều trên DOM đều được CSS điều chỉnh tương ứng (`widthModified = true` và `heightModified = true`), biểu thức kiểm tra của Next.js trả về `false`, xóa sạch 100% cảnh báo trên console ở mọi kích thước màn hình mà không cần các mẹo inline style dư thừa.

---

## 20. Lỗi Crash `IllegalStateException` khi mở Google OAuth Popup trong Android WebView

### Triệu chứng
Khi người dùng bấm vào biểu tượng hoặc nút Đăng nhập Google trên ứng dụng Android (`com.echochunk.app`), ứng dụng bị văng (crash) và đóng đột ngột. Kiểm tra Logcat hệ thống hiển thị stack trace:
```text
FATAL EXCEPTION: main
Process: com.echochunk.app, PID: 3328
Caused by: java.lang.IllegalStateException: LifecycleOwner com.echochunk.app.MainActivity is attempting to register while current state is RESUMED. LifecycleOwners must call register before they are STARTED.
	at androidx.activity.result.ActivityResultRegistry.register(ActivityResultRegistry.kt:88)
	at androidx.activity.ComponentActivity.registerForActivityResult(ComponentActivity.kt:799)
	at com.getcapacitor.Bridge.registerForActivityResult(Bridge.java:1015)
	at com.getcapacitor.BridgeWebChromeClient.<init>(BridgeWebChromeClient.java:69)
	at com.echochunk.app.MainActivity$1.onCreateWindow(MainActivity.java:54)
```

### Nguyên nhân gốc rễ
1. Trong phương thức `onCreateWindow` của `WebChromeClient` trong `MainActivity.java`, khi tạo `popupWebView` để hiển thị cửa sổ Google Login, code đã gán:
   ```java
   popupWebView.setWebChromeClient(new BridgeWebChromeClient(getBridge()) { ... });
   ```
2. Trong hàm khởi tạo của `BridgeWebChromeClient`, Capacitor luôn tự động đăng ký:
   ```java
   permissionLauncher = bridge.registerForActivityResult(new ActivityResultContracts.RequestMultiplePermissions(), permissionCallback);
   activityLauncher = bridge.registerForActivityResult(new ActivityResultContracts.StartActivityForResult(), ...);
   ```
3. Theo nguyên tắc vòng đời của **Android Jetpack Lifecycle** (`ActivityResultRegistry`), việc đăng ký `registerForActivityResult` **bắt buộc phải được gọi khi Activity còn ở trạng thái `INITIALIZED` / `CREATED` (trước khi `STARTED`)**.
4. Sự kiện `onCreateWindow` chỉ diễn ra khi người dùng bấm vào nút đăng nhập trên giao diện web (tức là Activity đã ở trạng thái `RESUMED`). Việc khởi tạo `new BridgeWebChromeClient` tại thời điểm này vi phạm vòng đời Android, khiến hệ điều hành ném ngay `IllegalStateException` và crash ứng dụng.

### Cách khắc phục
Cửa sổ popup Google OAuth (`popupWebView`) chỉ đóng vai trò là một container hiển thị trang web chọn tài khoản Google của Google Identity, nó hoàn toàn không cần tương tác với bất kỳ native plugin nào của Capacitor.
Thay thế `BridgeWebChromeClient` bằng lớp `android.webkit.WebChromeClient` chuẩn của Android SDK trong [`MainActivity.java`](file:///d:/SelfLearning/EchoChunk/android/app/src/main/java/com/echochunk/app/MainActivity.java):
```java
// ✅ ĐÚNG: Dùng WebChromeClient chuẩn của Android cho popup, không kích hoạt registerForActivityResult
popupWebView.setWebChromeClient(new android.webkit.WebChromeClient() {
    @Override
    public void onCloseWindow(WebView window) {
        dialog.dismiss();
        window.destroy();
    }
});
```

---

## 21. Lỗi Firebase Auth trắng màn hình & "missing initial state" do thiếu Multi-window & chặn Third-party Cookies trong Android WebView

### Triệu chứng
Sau khi bấm Đăng nhập Google và chọn tài khoản xong, màn hình bị chuyển hướng đến một trang trắng xóa không tải tiếp. Nếu kiểm tra console hoặc log có thể xuất hiện lỗi:
```text
Unable to process request due to missing initial state. This may happen if browser sessionStorage is inaccessible or accidentally cleared. Some specific scenarios are - 1) Using IDP-Initiated SAML SSO. 2) Using signInWithRedirect in a storage-partitioned browser environment.
```
Người dùng buộc phải tắt app hoặc vuốt reload lại thì tài khoản mới hiển thị đã đăng nhập.

### Nguyên nhân gốc rễ
1. **WebView không hỗ trợ đa cửa sổ theo mặc định:** Trong kiến trúc web desktop, `signInWithPopup` mở ra một popup riêng biệt (`window.open`). Khi hoàn tất, popup gọi `window.opener.postMessage(...)` rồi tự đóng (`window.close()`). Khi chạy trên Android WebView mà chưa kích hoạt `setSupportMultipleWindows(true)`, `window.open` bị ép chuyển hướng đè lên chính WebView hiện tại. Điều này làm mất ngữ cảnh `sessionStorage` của cửa sổ cha (gây ra lỗi `missing initial state`). Khi đăng nhập xong, trang xác thực cố gắng gọi `window.close()` nhưng WebView không đóng được dẫn đến treo ở màn hình trắng.
2. **Android WebView mặc định chặn Third-Party Cookies:** Khi diễn ra luồng chuyển hướng giữa domain ứng dụng (`speaking-english.taiphanvan.id.vn`), `accounts.google.com` và Firebase Auth handler (`echo-chunk.firebaseapp.com`), Android WebView áp dụng cơ chế Storage Partitioning (cách ly lưu trữ), khiến `sessionStorage` và session cookie giữa các domain bị chặn.

### Cách khắc phục
1. Trong [`MainActivity.java`](file:///d:/SelfLearning/EchoChunk/android/app/src/main/java/com/echochunk/app/MainActivity.java):
   - Kích hoạt `CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true)` cho cả WebView chính và popup WebView.
   - Bật `settings.setSupportMultipleWindows(true)` và override `onCreateWindow` để mở Google Login trong một Dialog Native riêng biệt với layout tràn màn hình.
   - Khi Google xác thực xong, `window.opener.postMessage(...)` gửi token về WebView chính thành công, và `onCloseWindow` của `WebChromeClient` sẽ tự động đóng Dialog, đưa người dùng trở lại màn hình chính của ứng dụng mà không cần reload.
2. Trong [`capacitor.config.ts`](file:///d:/SelfLearning/EchoChunk/capacitor.config.ts):
   - Bổ sung cấu hình `server.allowNavigation` cho các domain Google OAuth:
     ```typescript
     allowNavigation: [
       'speaking-english.taiphanvan.id.vn',
       '*.firebaseapp.com',
       'accounts.google.com',
       '*.google.com',
       '*.googleusercontent.com',
     ],
     ```

---

## 22. Lỗi Gradle Build fail với `Unsupported class file major version 69` khi build APK bằng Java 25

### Triệu chứng
Chạy `./gradlew assembleDebug` thất bại ngay trong giai đoạn phân tích script build:
```text
FAILURE: Build failed with an exception.

* What went wrong:
BUG! exception in phase 'semantic analysis' in source unit '_BuildScript_' Unsupported class file major version 69
> Unsupported class file major version 69
```

### Nguyên nhân gốc rễ
1. Phiên bản bytecode `69` tương ứng với **Java 25**.
2. Gradle 8.14 và Android Gradle Plugin (AGP 8.13) hiện tại chỉ hỗ trợ chính thức tối đa đến Java 21 / 22. Java 25 là phiên bản thử nghiệm/tương lai, chưa tương thích với parser Groovy/ASM của Gradle.
3. Khi chạy lệnh qua PowerShell mà chưa gán biến môi trường `JAVA_HOME` đúng cú pháp, Gradle tự động dò theo lệnh `java` mặc định trong biến PATH của hệ điều hành (vốn đang trỏ tới OpenJDK 25).

### Cách khắc phục
1. Gán biến môi trường `JAVA_HOME` trỏ tường minh tới phiên bản JDK 21 LTS trên máy:
   ```powershell
   $env:JAVA_HOME = "C:\Users\Lenovo\AppData\Local\Programs\Eclipse Adoptium\jdk-21.0.11.10-hotspot"
   $env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
   ```
2. Tạo file [`android/local.properties`](file:///d:/SelfLearning/EchoChunk/android/local.properties) để khai báo SDK Android:
   ```properties
   sdk.dir=D\:\\AndroidStudio\\Sdk
   ```
3. Thực thi build bằng `./gradlew.bat assembleDebug`, quá trình biên dịch hoàn tất thành công 100% trong 2-4 giây.

---

## 23. Lỗi Modal `position: fixed` bị cắt cụt do lồng bên trong thẻ cha có `backdrop-filter` hoặc `transform` (CSS Containing Block Gotcha)

### Triệu chứng
Khi mở `NotificationSettingsModal` từ nút Chuông trên thanh Navbar, toàn bộ nửa trên của Modal (Tiêu đề, icon Chuông, nút đóng `X`, và thanh trạng thái cấp quyền) bị đẩy vọt lên phía trên mép màn hình trình duyệt (tọa độ `Y < 0`) và biến mất khỏi tầm mắt người dùng. Chỉ có nửa dưới của modal (chọn giờ nhắc, nút thử nghiệm thông báo, nút lưu/hủy) hiển thị lơ lửng ở đỉnh trang.

### Nguyên nhân gốc rễ
1. **Lồng Modal vào thẻ cha có `backdrop-filter`:** Component `NotificationSettingsModal` được đặt bên trong thẻ `<header className="sticky top-0 z-[100] backdrop-blur-[20px] ...">` của [`Navbar.tsx`](file:///d:/SelfLearning/EchoChunk/src/components/Navbar.tsx). Class `backdrop-blur-[20px]` sinh ra thuộc tính CSS `backdrop-filter: blur(20px)`.
2. **Quy chuẩn W3C về Containing Block:** Theo đặc tả của CSS Transforms Module và CSS Filter Effects Module, bất kỳ giá trị nào khác `none` cho các thuộc tính `backdrop-filter`, `filter`, `transform`, hoặc `perspective` trên một thẻ cha sẽ biến thẻ cha đó thành một **Containing Block (khung tọa độ cha)** cho tất cả các phần tử con có `position: fixed`.
3. **Mất tọa độ Viewport toàn màn hình:** Lớp phủ backdrop `fixed inset-0` của modal thay vì bám vào toàn bộ cửa sổ trình duyệt (100vw × 100vh), nó bị thu hẹp và chỉ được ăn theo kích thước của thẻ `<header>` (vốn chỉ cao khoảng 50px ở đỉnh trang).
4. **Lệch tâm khi căn giữa:** Modal cao ~450px sử dụng `flex items-center justify-center` để căn giữa theo chiều dọc. Trình duyệt đã lấy tâm của Header (tọa độ `Y = 25px`) làm tâm của Modal. Hậu quả là nửa trên của Modal (~225px) bị đẩy ngược lên tọa độ âm `Y = -200px` (vượt khỏi mép trên trình duyệt), mắt người dùng hoàn toàn không nhìn thấy được.

### Cách khắc phục
1. **Nguyên tắc kiến trúc vàng:** Tuyệt đối không lồng Modal/Popup có `position: fixed` vào bên trong một thẻ cha có `backdrop-filter`, `filter` hoặc `transform`.
2. **Di chuyển Modal ra ngoài thẻ `<header>`:** Trong [`src/components/Navbar.tsx`](file:///d:/SelfLearning/EchoChunk/src/components/Navbar.tsx), bọc Navbar trong React Fragment `<>` và đưa modal ra ngoài phạm vi thẻ `<header>`:
   ```tsx
   return (
     <>
       <header className="sticky top-0 z-[100] backdrop-blur-[20px] ...">
         ...
       </header>

       {/* Notification Settings Modal - Mount ngoài header */}
       {isNotificationModalOpen && (
         <NotificationSettingsModal onClose={() => setIsNotificationModalOpen(false)} />
       )}
     </>
   );
   ```
3. **Đồng bộ kiến trúc Modal chuẩn với `ChunkModal`:**
   - Thay vì lạm dụng `createPortal`, áp dụng cơ chế conditional rendering `{isOpen && <Modal />}` để component unmount sạch sẽ khi đóng.
   - Sử dụng hook [`useBodyScrollLock()`](file:///d:/SelfLearning/EchoChunk/src/hooks/useBodyScrollLock.ts) để khóa cuộn trang nền và [`useEscapeKey(onClose)`](file:///d:/SelfLearning/EchoChunk/src/hooks/useEscapeKey.ts) để đóng modal bằng phím ESC.
   - Chuẩn hóa CSS Wrapper tương thích hoàn hảo mọi kích thước màn hình (kể cả mobile 320px):
     ```tsx
     <div className="fixed inset-0 bg-black/50 sm:backdrop-blur-[4px] z-[5000] flex sm:items-center sm:justify-center sm:p-4" onClick={onClose}>
       <div className="bg-white sm:border sm:border-gray-200 w-full h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:max-w-[480px] sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-[fadeIn_0.15s_ease]" onClick={(e) => e.stopPropagation()}>
         {/* Sticky Header */}
         ...
         {/* Scrollable Body */}
         <div className="flex-1 overflow-y-auto scrollbar-thin p-4 sm:p-6 flex flex-col gap-4">...</div>
         {/* Sticky Footer */}
         ...
       </div>
     </div>
     ```

---

## 24. Lỗi Flash/Nhấp nháy phiên âm IPA (hiển thị câu tiếng Anh thô rồi đổi sang IPA) & Cụt âm vị từ ghép có gạch nối

### Triệu chứng
1. Khi người dùng mở một bài học (ví dụ: chunk *"Problem-solving skills"* trong Shadowing Mode), tại vị trí hiển thị phiên âm IPA của câu ví dụ:
   - Ban đầu hiển thị nguyên văn câu tiếng Anh thô: `"/i leveraged my problem-solving skills to identify the memory leak and boost app performance by 30%/"`.
   - Khoảng 1–2 giây sau, giao diện bị giật (flash) và đổi sang một phiên âm IPA khác do máy sinh: `"/ aɪ ˈlevərɪdʒ ˈmaɪ ˈprɑːbləm ˈsɑːlvɪŋ ˈskɪlz ... /"`.
2. Tại vị trí phiên âm IPA của chính cụm từ (Chunk Title):
   - Cụm từ là *"Problem-solving skills"* (3 từ ngữ), nhưng phiên âm chỉ hiển thị: `"/ ˈprɑːbləm ˈsɑːlvɪŋ /"` (bị mất âm vị của từ `"skills"`).

### Nguyên nhân gốc rễ
1. **Lỗi ưu tiên sai nhánh trong [`ShadowingMode.tsx`](file:///d:/SelfLearning/EchoChunk/src/components/ShadowingMode.tsx):**
   - Trong `ShadowingMode`:
     ```ts
     const currentSentenceIpa = useMemo(() => {
       if (activeExample.sentenceIpa) return activeExample.sentenceIpa;
       if (activeExample.cleanSentence || activeExample.sentence) {
         return getPhraseIpa(activeExample.cleanSentence || activeExample.sentence); // <-- LUÔN CHẠY NHÁNH NÀY!
       }
       return defaultSentenceIpa;
     }, [activeExample, defaultSentenceIpa]);
     ```
   - Trong dataset [`speaking-chunks.json`](file:///d:/SelfLearning/EchoChunk/src/data/speaking-chunks.json), toàn bộ 545 câu đều ĐÃ CÓ phiên âm chuẩn của câu lưu trong trường `ipa`. Hàm `resolveChunkIpas` đã trích xuất sẵn ra biến `defaultSentenceIpa` chuẩn xác 100%.
   - Tuy nhiên, điều kiện `if (activeExample.cleanSentence || activeExample.sentence)` luôn luôn `true`, khiến code **hoàn toàn bỏ qua `defaultSentenceIpa`** và ép gọi `getPhraseIpa(...)` để sinh lại từ đầu qua từ điển CMU!
2. **Cơ chế Lazy-Load từ điển IPA & Fallback sai trong [`ipa.ts`](file:///d:/SelfLearning/EchoChunk/src/lib/shared/ipa.ts):**
   - File từ điển `american-ipa.json` (3.26MB) được tải lười (lazy load) qua hàm `ensureIpaDict()` để tránh phình bundle ban đầu.
   - Khi component mới mount (hoặc SSR), `ipaDict` vẫn đang là `null`.
   - Trong hàm `getPhraseIpa(phrase)`:
     ```ts
     for (const token of tokens) {
       const rawIpa = getAmericanIpa(token);
       if (rawIpa) {
         ipaParts.push(rawIpa...);
       } else {
         ipaParts.push(token.toLowerCase()); // <-- Lấy chính từ tiếng Anh đẩy vào mảng!
       }
     }
     ```
   - Khi `ipaDict === null`, không từ nào tìm thấy IPA -> Hàm lấy nguyên văn toàn bộ câu tiếng Anh ghép lại bọc giữa 2 dấu gạch `/ ... /` và trả về như thể đó là IPA!
   - 1–2 giây sau, trình duyệt rảnh hoặc Firebase Auth hoàn tất nạp dữ liệu gọi `setStoreVersion` -> Component re-render lần 2. Lúc này `ipaDict` đã nạp xong -> `getPhraseIpa` sinh ra phiên âm CMU mới, gây ra hiện tượng giật màn hình và đổi phiên âm.
3. **Lỗi Regex không tách dấu gạch nối trong [`extractChunkIpaFromSentenceIpa`](file:///d:/SelfLearning/EchoChunk/src/lib/shared/ipa.ts):**
   - Regex tách từ cũ: `.replace(/[^a-z0-9\s'-]/g, " ")` giữ lại dấu gạch nối `-`.
   - Khiến từ ghép `"problem-solving"` bị tính là **1 từ** (`cleanChunkWords.length` = 2 gồm `["problem-solving", "skills"]`).
   - Nhưng trong chuỗi `sentenceIpa`, `"ˈprɑːbləm"` và `"ˈsɑːlvɪŋ"` là **2 âm vị tách biệt** bởi khoảng trắng.
   - Khi cắt âm vị: `ipaTokens.slice(matchIndex, matchIndex + cleanChunkWords.length)` -> Cắt đúng 2 token -> Chỉ lấy `["ˈprɑːbləm", "ˈsɑːlvɪŋ"]` và bỏ quên token `"skɪlz"` phía sau!

### Giải pháp triệt để
1. **Ưu tiên `defaultSentenceIpa` cho câu ví dụ chính trong [`ShadowingMode.tsx`](file:///d:/SelfLearning/EchoChunk/src/components/ShadowingMode.tsx):**
   ```ts
   const currentSentenceIpa = useMemo(() => {
     if (activeExample.sentenceIpa) return activeExample.sentenceIpa;
     // Ưu tiên dùng phiên âm đã biên tập sẵn trong dataset (0ms delay, SSR khớp 100%, không bị flash)
     if (defaultSentenceIpa && (!activeExample.id || activeExample.id === "primary")) {
       return defaultSentenceIpa;
     }
     // Chỉ fallback sang getPhraseIpa khi là ví dụ phụ tự tạo chưa có sentenceIpa
     if (activeExample.cleanSentence || activeExample.sentence) {
       const generated = getPhraseIpa(activeExample.cleanSentence || activeExample.sentence);
       if (generated) return generated;
     }
     return defaultSentenceIpa;
   }, [activeExample, defaultSentenceIpa]);
   ```
2. **Ngăn chặn `getPhraseIpa` trả về câu tiếng Anh khi từ điển chưa sẵn sàng:**
   - Trong [`src/lib/shared/ipa.ts`](file:///d:/SelfLearning/EchoChunk/src/lib/shared/ipa.ts), đếm số lượng từ phân giải thành công `resolvedCount`.
   - Nếu `resolvedCount === 0` (từ điển chưa nạp xong), trả về chuỗi rỗng `""` thay vì trả về câu tiếng Anh thô.
3. **Tách dấu gạch nối `-` khi trích xuất IPA cụm từ trong `extractChunkIpaFromSentenceIpa`:**
   - Chuẩn hóa: `.replace(/[-–—/]/g, " ").replace(/[^a-z0-9\s']/g, " ")`.
   - Cả `"problem-solving"` và câu ví dụ đều được tách thành `"problem"` và `"solving"`, đảm bảo tỉ lệ ánh xạ 1:1 với các tokens âm vị trong chuỗi `sentenceIpa`.
   - Kết quả trích xuất đầy đủ 100% âm vị của cụm từ: `"/ˈprɑːbləm ˈsɑːlvɪŋ skɪlz/"`.

4. **Nguyên tắc "Luôn ưu tiên 100% dữ liệu User" trong [`chunksMerge.ts`](file:///d:/SelfLearning/EchoChunk/src/lib/shared/chunksMerge.ts):**
   - Khi hợp nhất giữa Base Chunks và Custom Chunks, nếu người dùng đã tùy biến hoặc chỉnh sửa một câu (`customMap.has(base.id)`), hệ thống lấy nguyên vẹn 100% bản ghi của User (`customMap.get(base.id)`), không cho phép dữ liệu mặc định của hệ thống can thiệp đè lên.
5. **Kỹ thuật Client Hydration Gate trong các trang luyện tập (`shadowing`, `blanks`, `reflex`):**
   - Thay vì điều kiện `if (!isClient && !currentChunk)` (vốn làm Server SSR render ra dữ liệu tĩnh của BE trước, rồi 1 giây sau Client nạp dữ liệu User tráo đổi gây nhấp nháy), chuyển thành:
     ```ts
     if (!isClient) {
       return <PracticeSkeleton />;
     }
     ```
   - Phía Server chỉ trả về Skeleton animate mượt mà trong lúc tải trang (~100ms). Ngay khi Client hydrate và nạp xong dữ liệu cá nhân của User, bài học xuất hiện tức thì với đúng 100% phiên âm và nội dung của User. Người dùng không bao giờ nhìn thấy dữ liệu tĩnh của BE xuất hiện rồi biến mất nữa!


---

## 25. Lỗi lệch số lượng chunk giữa SSR và Client: Nhảy số 'Từ vựng của tôi' (244 -> 242) và Topic gốc bị trừ hụt (Work & Business 58 -> 57)

### Triệu chứng
- Khi truy cập trang, SSR trả về ban đầu hiển thị:
  - "Từ vựng của tôi": **244** chunks
  - "Work & Business": **58** chunks
- Nhưng ngay khi Client hydrate và rerender xong:
  - "Từ vựng của tôi" đột ngột giảm xuống còn **242** chunks (-2)
  - "Work & Business" đột ngột giảm xuống còn **57** chunks (-1)
  - Khi người dùng click chọn chủ đề "Work & Business", danh sách bài học bên trong vẫn hiển thị đủ **58** câu!

### Nguyên nhân gốc rễ
Sự cố phát sinh từ 2 nguyên nhân độc lập kết hợp:

1. **Bug logic `if ... else` trong việc tính đếm số lượng topic (`computeDynamicTopics` & `dynamicTopics`):**
   - Đoạn code cũ khi duyệt `allChunks`:
     ```ts
     // ❌ SAI: Nếu chunk được user tùy biến (isCustom = true), nó nhảy vào if và BỎ QUA else
     allChunks.forEach((c) => {
       if (c.isCustom || c.topicId === "CUSTOM") {
         customCount += 1;
       } else {
         counts[c.topicId] = (counts[c.topicId] || 0) + 1;
       }
     });
     ```
   - User `3Nk6gLosFYNFTPzjqr9Jtq54e2f1` đã tùy biến/sửa câu `work-006` (`Call it a day`). Do đó, bản ghi `work-006` trong `customChunks` có `isCustom: true` và `topicId: "work"`.
   - Phía **Server (SSR)**: `allChunks` chỉ chứa 361 Base Chunks tĩnh từ file JSON (chưa có cờ `isCustom: true`). Vì thế toàn bộ 58 câu của chủ đề `work` đều rơi vào nhánh `else` -> Server tính ra `work = 58`.
   - Phía **Client (FE)**: `allChunks` được gộp với `customChunks` của User. `work-006` có `isCustom: true` nên thỏa mãn nhánh `if`, tăng `customCount` và **bị nuốt mất, không được cộng vào `counts['work']`**.
   - Kết quả: `work` chỉ còn 57 câu (tương tự 10 chủ đề khác có câu bị sửa cũng bị hụt số đếm trên badge). Trong khi logic filter hiển thị câu (`chunk.topicId === selectedTopicId`) vẫn hiển thị đủ 58 câu, tạo ra sự mâu thuẫn giữa số lượng trên badge và nội dung thực tế!

2. **Lệch bộ đếm tổng `userStats.customChunksCount` (244) so với dữ liệu thực tế (242) trong Firestore:**
   - Trong Firestore subcollection `users/{uid}/customChunks`, User thực tế chỉ có đúng **242 documents** (gồm 227 chunk tạo mới + 15 chunk gốc được chỉnh sửa).
   - Tuy nhiên, trong document `users/{uid}/stats/current`, trường `customChunksCount` lại lưu giá trị **244**.
   - Phía **Server (SSR)**: Nhằm tối ưu hóa Quota đọc Firestore và tránh độ trễ TTFB, Server không đọc toàn bộ 242 docs của collection `customChunks`, mà chỉ đọc `stats/current`. Server lấy trực tiếp `userStats.customChunksCount = 244` làm số lượng ban đầu của "Từ vựng của tôi".
   - Phía **Client (FE)**: Client duyệt qua mảng `allChunks` thực tế trong LocalStorage/State (có đúng 242 chunks có `isCustom: true`), đếm ra `customCount = 242` và render lại UI, làm số đếm bị giật từ 244 về 242.
   - Nguyên nhân bộ đếm Firestore bị lệch +2: Trong các hàm `handleSaveChunk` và `handleDeleteChunk`, số lượng `customChunksCount` được cập nhật theo cơ chế cộng trừ tương đối `(userStats.customChunksCount ?? ...) ± 1` thay vì đo trực tiếp từ độ dài thực tế của danh sách `loadCustomChunks(uid).length`. Khi xảy ra việc xoá/sáp nhập dữ liệu nhiều lần hoặc mất đồng bộ tab/offline, biến đếm bị trôi (drift).

### Cách khắc phục triệt để
1. **Tách biệt logic đếm Topic và Custom trong [`PracticeContext.tsx`](file:///d:/SelfLearning/EchoChunk/src/context/PracticeContext.tsx) & [`practiceData.ts`](file:///d:/SelfLearning/EchoChunk/src/lib/server/practiceData.ts):**
   - Một câu thuộc chủ đề `work` dù được user sửa lại phiên âm hay ví dụ (`isCustom: true`) thì nó vẫn thuộc chủ đề `work`.
   - Loại bỏ `else`, đếm đồng thời cho cả hai mục tiêu:
     ```ts
     // ✅ ĐÚNG: Luôn cộng dồn cho topic gốc, và cộng dồn vào Từ vựng của tôi nếu là câu tùy biến
     allChunks.forEach((c) => {
       if (c.topicId && c.topicId !== "CUSTOM" && c.topicId !== "STUDIED") {
         counts[c.topicId] = (counts[c.topicId] || 0) + 1;
       }
       if (c.isCustom || c.topicId === "CUSTOM") {
         customCount += 1;
       }
     });
     ```
2. **Cập nhật `customChunksCount` theo độ dài thực tế (Absolute Length) thay vì ±1:**
   - Trong `handleSaveChunk` và `handleDeleteChunk`:
     ```ts
     const currentCustom = loadCustomChunks(user.uid);
     const updatedStats = {
       ...userStats,
       customChunksCount: currentCustom.length, // Luôn chính xác 100%
       ...
     };
     ```
3. **Cơ chế Tự phục hồi (Self-healing) khi Client Sync:**
   - Khi Client nạp xong dữ liệu từ Cloud trong `syncUserData`, đối chiếu độ dài thực tế với `cloudStats.customChunksCount`. Nếu phát hiện Firestore bị lệch (ví dụ 244 vs 242), Client tự động cập nhật lại document `stats/current` trên Cloud để đưa về giá trị chuẩn 242.
4. **Dọn dẹp và chuẩn hóa document `stats/current` cho user `3Nk6gLosFYNFTPzjqr9Jtq54e2f1` trên Firestore:**
   - Đã cập nhật trực tiếp `customChunksCount: 242` trên Firestore cho user, đảm bảo lần truy cập SSR tiếp theo trả về đúng 242 ngay từ đầu, triệt tiêu hoàn toàn hiện tượng lệch số và giật giao diện!
5. **Triệt tiêu hiện tượng nhảy số hàng đợi totalInQueue (361 -> 588) mà không cần Skeleton:**
   - Trong các trang luyện tập (`shadowing`, `reflex`, `blanks`), thay vì truyền độ dài mảng in-memory trên server `totalInQueue={practiceQueue.length}` (chỉ có 361 câu gốc), chuyển sang:
     ```tsx
     totalInQueue={isClient ? practiceQueue.length : totalChunksCount}
     ```
   - Phía SSR lấy thẳng con số `totalChunksCount = 588` (đã có sẵn trong `stats/current` từ 1 lượt đọc duy nhất), vẽ ngay `1 / 588` từ HTML ban đầu.
   - Khi Client hydrate xong, `practiceQueue.length` đạt 588 -> Giữ nguyên `1 / 588`.
   - **0 thêm lượt đọc Firestore nào, 0 độ trễ TTFB, và toàn bộ UI hiển thị tức thì (không phải che bằng Skeleton)!**

---

## 26. Lỗi bất đồng bộ dữ liệu giữa nhiều thiết bị/môi trường (Localhost vs Web Deployed): Hiện tượng 'Zombie Data' hồi sinh video/chunk đã xóa & Cache cũ đè dữ liệu mới

### Triệu chứng
1. Người dùng đăng nhập cùng một tài khoản trên 2 môi trường hoặc thiết bị khác nhau (ví dụ: `localhost:3000` và `echochunk.vercel.app`, hoặc máy tính công ty và điện thoại cá nhân).
2. Trên Thiết bị A (localhost), người dùng xóa 1 video khỏi lịch sử xem YouTube hoặc xóa 1 từ vựng tùy biến (custom chunk). Thao tác xóa trên Firestore document thành công.
3. Sau đó, người dùng mở Thiết bị B (web deployed). Thiết bị B vẫn còn bản ghi cũ trong `localStorage`.
4. Khi cơ chế đồng bộ `mergeYouTubeHistoryLocalAndCloud` chạy:
   - Thuật toán nhận thấy video/chunk này có trong `localStorage` nhưng **không tìm thấy trên Cloud Firestore**.
   - Nó ngây thơ giả định: *"Đây là dữ liệu mới được tạo offline ở thiết bị này chưa kịp đẩy lên"* $\rightarrow$ Tự động batch write đẩy ngược video/chunk đó lên lại Cloud!
   - Kết quả: Video hoặc từ vựng vừa xóa trên Thiết bị A lại **tự động hồi sinh (Zombie Data Resurrection)** trên cả hai thiết bị.
5. Ngược lại, khi Thiết bị A tạo hoặc sửa từ vựng mới, Thiết bị B không biết để nạp lại vì bộ nhớ đệm `localStorage` ở Thiết bị B vẫn còn dữ liệu cũ (`cleanLocalCustom.length > 0`), dẫn đến cache cũ đè lên dữ liệu mới.

### Nguyên nhân gốc rễ
1. **Bản chất của Distributed State & Thiếu Tombstones (Bia mộ dữ liệu):**
   - Khi xóa một document trong Cloud Firestore bằng `deleteDoc()`, document đó biến mất hoàn toàn.
   - Khi một thiết bị khác truy vấn danh sách (`fetchYouTubeHistoryFromCloud`), Firestore chỉ trả về các document đang tồn tại. Thiết bị đó không có cách nào phân biệt được giữa:
     - *(a)* Document vừa mới tạo offline ở local chưa kịp sync lên Cloud.
     - *(b)* Document đã từng tồn tại nhưng vừa bị một thiết bị khác xóa đi.
   - Thuật toán hợp nhất (Set-union merge) đối chiếu `localItems` và `cloudItems` mà không có danh sách đã xóa (Tombstones), dẫn đến việc biến thao tác xóa thành thao tác tạo mới dữ liệu.
2. **Thiếu cơ chế Timestamp Epoch khi "Xóa toàn bộ":**
   - Khi người dùng bấm "Xóa toàn bộ lịch sử", nếu chỉ xóa các document trong collection thì Thiết bị B khi mở lên sẽ đẩy toàn bộ lịch sử local của nó lên lại Cloud, gây phục hồi toàn bộ danh sách cũ.
   - Nếu nhét toàn bộ ID của các video đã xóa vào mảng Tombstone thì mảng sẽ phình to vượt giới hạn 1MB của Firestore Document.
3. **Bài toán Quota Firestore (Ràng buộc Zero Extra Reads):**
   - Không thể tạo thêm một subcollection riêng (như `deletedItems`) hoặc truy vấn Firestore liên tục vì sẽ làm tiêu tốn Quota đọc/ghi và tăng chi phí Firestore đáng kể.

### Cách khắc phục triệt để (Kiến trúc Tombstone & Timestamp-based Epoch Sync — SPEC-06)
1. **Nhúng Tombstone và Timestamp vào Document `stats/current` (0 Extra Firestore Reads):**
   - Tận dụng document `users/{uid}/stats/current` (vốn đã luôn được nạp duy nhất 1 lần lúc SSR hoặc app load ban đầu) để lưu trữ metadata đồng bộ:
     ```ts
     interface UserStats {
       // ...
       deletedVideoIds?: string[];           // Danh sách tối đa 100 ID video đã xóa gần nhất (FIFO)
       deletedChunkIds?: string[];           // Danh sách tối đa 100 ID chunk đã xóa gần nhất (FIFO)
       lastVideoHistoryUpdatedAt?: number;   // Timestamp mốc cập nhật lịch sử video mới nhất
       lastCustomChunksUpdatedAt?: number;   // Timestamp mốc tạo/sửa/xóa chunk tùy biến mới nhất
       videoHistoryClearedAt?: number;       // Timestamp mốc reset "Xóa toàn bộ lịch sử video"
     }
     ```
2. **Triệt tiêu Zombie Data trước khi Merge (`mergeYouTubeHistoryLocalAndCloud`):**
   - Trước khi hợp nhất `localItems` với `cloudItems`, tiến hành lọc sạch `localItems` qua 2 tầng bảo vệ:
     ```ts
     const validLocalItems = localItems.filter((local) => {
       // 1. Bị loại nếu ID nằm trong mảng Tombstones (Set lookup O(1))
       if (deletedSet.has(local.videoId)) return false;
       // 2. Bị loại nếu thời điểm học <= mốc videoHistoryClearedAt
       if (clearedAt > 0 && (local.lastStudiedAt || 0) <= clearedAt) return false;
       return true;
     });
     ```
   - Nhờ đó, bất kỳ item nào đã bị xóa ở Thiết bị A sẽ bị gạch bỏ ngay lập tức ở Thiết bị B và `localStorage` của Thiết bị B được cập nhật sạch sẽ, không còn cơ hội đẩy lên Cloud nữa.
3. **Cơ chế Epoch Reset khi "Xóa toàn bộ lịch sử video" (`clearAllYouTubeHistoryOnCloud`):**
   - Thiết lập `videoHistoryClearedAt: Date.now()`. Bất kỳ video nào trên bất kỳ thiết bị nào có `lastStudiedAt <= videoHistoryClearedAt` đều tự động bị loại bỏ vĩnh viễn.
   - Đồng thời reset `deletedVideoIds: []` về rỗng để giải phóng bộ nhớ, giữ cho document `stats/current` luôn siêu nhẹ (< 1 KB) mà vẫn đảm bảo tính đúng đắn 100%.
4. **Cơ chế Hồi sinh chủ động (Atomic Un-tombstone):**
   - Nếu người dùng chủ động vào xem lại một video đã từng xóa, hàm `syncYouTubeHistoryToCloud` dùng `arrayRemove(videoId)` để gỡ ID đó ra khỏi danh sách `deletedVideoIds`, cho phép video xuất hiện trở lại bình thường.
5. **Đồng bộ Custom Chunks theo Timestamp (`lastCustomChunksUpdatedAt`):**
   - Lưu `LAST_SYNCED_CHUNKS_AT_KEY` trong `localStorage`.
   - Trong [`PracticeContext.tsx`](file:///d:/SelfLearning/EchoChunk/src/context/PracticeContext.tsx), khi app khởi động:
     ```ts
     const hasNewerCloudChunks = (cloudStats?.lastCustomChunksUpdatedAt || 0) > localLastSyncedAt;
     const countMismatch = cloudStats?.customChunksCount !== undefined && cloudStats.customChunksCount !== cleanLocalCustom.length;
     const shouldFetchCustomFromCloud = cleanLocalCustom.length === 0 || hasNewerCloudChunks || countMismatch;
     ```
   - Nếu Thiết bị A thêm/sửa câu mới (`lastCustomChunksUpdatedAt` tăng), Thiết bị B khi mở lên sẽ phát hiện `hasNewerCloudChunks = true` và tự động kéo dữ liệu mới nhất về, tránh triệt để tình trạng cache cũ đè dữ liệu mới.
6. **Không tốn thêm bất kỳ lượt đọc Firestore nào:** Toàn bộ metadata được đóng gói trong lượt đọc duy nhất của document `stats/current` ban đầu.

