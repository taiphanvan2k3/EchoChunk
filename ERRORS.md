# ERRORS.md — Nhật ký Lỗi, Nguyên nhân Gốc rễ & Giải pháp (EchoChunk)

> **Dự án:** EchoChunk  
> **Cập nhật lần cuối:** 2026-09-13  
> **Phạm vi:** YouTube Transcript, Player, React 19 Lifecycle, SSR Hydration, ESLint Rules

---

## Mục lục
1. [Lỗi `LOGIN_REQUIRED` khi fetch transcript InnerTube](#1-lỗi-login_required-khi-fetch-transcript-innertube)
2. [`fetchPlayerResponseFallback` parse sai JSON `ytInitialPlayerResponse`](#2-fetchplayerresponsefallback-parse-sai-json-ytinitialplayerresponse)
3. [Transcript XML trả về rỗng khi dùng `INNERTUBE_USER_AGENT`](#3-transcript-xml-trả-về-rỗng-khi-dùng-innertube_user_agent)
4. [Duyệt câu `sentences.find()` bị kẹt do phụ đề ASR chồng thời gian](#4-duyệt-câu-sentencesfind-bị-kẹt-do-phụ-đề-asr-chồng-thời-gian)
5. [Khảo sát kiến trúc xử lý từ ShadowingEnglish.com](#5-khảo-sát-kiến-trúc-xử-lý-từ-shadowingenglishcom)
6. [Lỗi ESLint `Cannot access refs during render` (`react-hooks/refs`) trong React 19](#6-lỗi-eslint-cannot-access-refs-during-render-react-hooksrefs-trong-react-19)
7. [Lỗi Cascading Render & `react-hooks/set-state-in-effect` khi đọc LocalStorage](#7-lỗi-cascading-render--react-hooksset-state-in-effect-khi-đọc-localstorage)

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
