# Feature Specification: YouTube Study Suite (Interactive Player & Practice Hub)

> **Feature:** YouTube-to-Interactive Study Suite (Player, Transcript Sync & 4 Practice Modes)
> **Version:** 1.0
> **Date:** 2026-09-13
> **Author:** Product & Engineering Team
> **Spec ID:** `SPEC-04`
> **Status:** APPROVED / IN-PROGRESS
> **Format Standard:** 11-Part Industry Standard Feature Specification (*Anatomy of a Good Feature Spec*)

---

## 🎯 1. Objective (Mục Tiêu)

Tại sao chúng ta xây dựng tính năng này?

- **Giải quyết bài toán "Học tiếng Anh thụ động" trên YouTube:** Người học thường xem video YouTube có bật phụ đề song ngữ (*Language Reactor, eJOY*) nhưng chỉ nhìn mắt và gật gù, miệng không mở ra nói câu nào. Sau 2 tiếng xem video, phản xạ phát âm thực tế vẫn bằng 0.
- **Biến mọi video yêu thích thành phòng tập phản xạ chủ động:** Cho phép người học dán bất kỳ đường dẫn YouTube nào (Vlog đời sống, nấu ăn, công nghệ, podcast...) để hệ thống tự động bóc tách phụ đề theo câu, đồng bộ trực tiếp với trình phát video.
- **Kết nối liền mạch với bộ máy luyện tập cốt lõi của EchoChunk:** Không dừng lại ở việc xem video, người dùng có thể nhấp vào bất kỳ câu nào để luyện **Shadowing/Echoing** (nhại giọng có chấm điểm 🟢🔴), **Dictation** (nghe chép chính tả), hoặc lưu Speaking Chunks vào Sổ tay Spaced Repetition (SRS) để ôn luyện hàng ngày.
- **Tốc độ phản hồi tức thì (< 0.5s) & Tiết kiệm chi phí:** Tận dụng trực tiếp máy chủ phụ đề có sẵn của YouTube (InnerTube Client) thông qua Server Action của Next.js mà không cần dùng đến AI Whisper đắt đỏ hay chậm chạp.

---

## 👤 2. User Story (Câu Chuyện Người Dùng)

> **Là một** người học tiếng Anh giao tiếp muốn cải thiện phát âm và phản xạ qua các video YouTube thực tế,
> **Tôi muốn** dán link video YouTube vào EchoChunk để xem video kèm danh sách toàn bộ các câu phụ đề tương tác bên cạnh,
> **Để** tôi có thể bấm vào từng câu để tua video đến đúng đoạn đó, nghe đi nghe lại và bật Micro nhại giọng luyện cơ miệng theo đúng tốc độ người bản xứ.

---

## ✅ 3. Acceptance Criteria (Tiêu Chí Nghiệm Thu)

- [x] **AC-1:** Hỗ trợ nhận diện và bóc tách ID từ mọi định dạng link YouTube thông dụng:
  - `https://www.youtube.com/watch?v=xsFgrZdomDQ`
  - `https://youtu.be/xsFgrZdomDQ`
  - `https://m.youtube.com/watch?v=xsFgrZdomDQ`
  - ID trần: `xsFgrZdomDQ`
- [x] **AC-2:** Tải dữ liệu phụ đề và thông tin video hoàn tất trong **dưới 1 giây** thông qua Next.js Server Action (`getYoutubeTranscriptAction`).
- [x] **AC-3:** Trình phát video YouTube (IFrame) hiển thị sắc nét bên trái, hỗ trợ tự động đồng bộ thời gian thực (`seekTo`) khi người dùng nhấp vào bất kỳ câu nào ở danh sách bên phải.
- [x] **AC-4:** Cột danh sách câu (Interactive Sentence List) bên phải hiển thị:
  - Tổng số câu (ví dụ: `21 sentences`).
  - Đánh số thứ tự hoặc biểu tượng checkmark xanh `✓` nếu câu đó đã được luyện tập xong.
  - Highlight màu xanh dương câu đang được chọn hoặc video đang phát tới.
- [ ] **AC-5:** Phía dưới video hiển thị **Bộ 4 Thẻ Chế Độ Luyện Tập (Practice Mode Cards)**:
  - [x] UI hiển thị đầy đủ 4 thẻ có pill badge và phong cách Shadowing English.
  - [ ] 🎙️ **Shadowing:** Mở phòng luyện nhại giọng theo câu đang chọn có Web Speech API chấm điểm từ.
  - [ ] 📝 **Dictation:** Nghe câu và gõ chính tả đục lỗ từ chức năng.
  - [ ] 💬 **AI Talk:** Trò chuyện hỏi đáp về video.
  - [ ] 📖 **Vocabulary:** Trích xuất các cụm Speaking Chunks trọng điểm có phiên âm IPA Mỹ lưu vào Sổ tay SRS.
- [x] **AC-6:** Khi lần đầu mở trang `/youtube` (chưa nhập URL), hệ thống hiển thị lịch sử học tập gần đây hoặc gợi ý video mẫu chất lượng cao để người dùng trải nghiệm ngay mà không gặp màn hình trống.
- [x] **AC-7:** Báo lỗi rõ ràng và thân thiện nếu video không có phụ đề tiếng Anh, video bị tắt nhúng (embed disabled), hoặc link sai định dạng.
- [x] **AC-8 (Word-Level Karaoke Highlighting):** Khi video đang phát, câu hiện tại không chỉ được highlight cả dòng mà từng từ đơn lẻ (`<span>`) sẽ tự động phát sáng (màu vàng `#fef08a`, chữ nâu `#854d0e`) theo thời gian thực (50ms tick) đồng bộ với giọng nói trong video (bóc tách từ thẻ `<s>` trong luồng XML `srv3` của YouTube), không gây layout shift hay nhảy dòng.
- [x] **AC-9 (Lưu Trữ Lịch Sử Học Tập - YouTube Study History):**
  - Tự động lưu thông tin video vào LocalStorage (`videoId`, `videoUrl`, `videoTitle`, `thumbnailUrl`, `totalSentences`, `completedCount`, `lastStudiedAt`) ngay khi nạp video thành công.
  - Cập nhật số câu đã hoàn thành (`completedCount`) theo thời gian thực khi người học bấm tích xanh hoàn thành câu.
  - Hiển thị khu vực **"Video đã học gần đây" (Recently Practiced)** tại màn hình chính khi chưa nạp video, gồm ảnh thumbnail 16:9, thanh tiến độ (Progress Bar), thời gian học gần nhất, nút "Học tiếp" mở lại bài học chỉ với 1 click và nút xóa (thùng rác) khỏi lịch sử.
  - Cô lập dữ liệu đa người dùng (Multi-User Data Isolation) theo UID: `echo_yt_history_${uid || 'guest'}`.
- [x] **AC-10 (Độ Rộng Toàn Màn Hình & Chuẩn Thiết Kế Shadowing English):**
  - Giao diện phòng học tự động giải phóng giới hạn container 920px để mở rộng lên chuẩn **1440px** thoáng đãng.
  - Bố cục 2 cột cân xứng:
    - **Cột Trái (~55%):** Video 16:9 sắc nét bo góc 12px, bộ 4 thẻ Practice Mode (Shadowing, Dictation, AI Talk, Vocab) có viền màu đặc trưng và pill badge, khu vực Reviews (⭐ Reviews + Write a review) và tags Practice for.
    - **Cột Phải (~45%):** Danh sách câu cao đồng bộ (~720px), Header có số câu + nút `Edit`, banner mẹo màu xanh dịu, badge số thứ tự dạng hình vuông bo góc 6px (24x24px) gọn gàng.

---

## 🎨 4. UI / UX (Thiết Kế Giao Diện & Trải Nghiệm)

### 4.1. Phong cách thẩm mỹ

Tuân thủ nghiêm ngặt phong cách **Notion Clean Light & Shadowing English**:

- **Không gian thoáng đạt (1440px):** Phá vỡ giới hạn khung 920px của layout chung, giúp video to rõ và danh sách câu dễ đọc.
- **Bảng màu nhận diện 4 chế độ luyện tập:**
  - 🎙️ Shadowing: Viền xanh da trời `#38bdf8`, nền hover `#f0f9ff`, badge `#e0f2fe` chữ `#0284c7`.
  - 📝 Dictation: Viền cam hổ phách `#fbbf24`, nền hover `#fffbeb`, badge `#fef3c7` chữ `#d97706`.
  - 💬 AI Talk: Viền xanh ngọc `#34d399`, nền hover `#ecfdf5`, badge `#ecfdf5` chữ `#059669`.
  - 📖 Vocabulary: Viền tím `#c084fc`, nền hover `#faf5ff`, badge `#faf5ff` chữ `#9333ea`.
- **Hiệu ứng Karaoke Word Highlighting:** Từ đang phát âm được bọc thẻ `<span>` với class `.yt-word-token.is-singing` (`background: #fef08a`, `color: #854d0e`), transition màu mượt mà (50ms) và tuyệt đối không thay đổi `font-weight`/padding để chống rung giật chữ.

### 4.2. Bố Cục Màn Hình (Wireframe Layout)

#### Trạng Thái 1: Chưa Nạp Video (Empty State & Lịch Sử Video Gần Đây)
```text
+---------------------------------------------------------------------------------------------------------------+
|  [ 🎥 Dán link YouTube (ví dụ: https://youtube.com/watch?v=...)                 (x) ]   [ ▶ Load Video ]     |
|                                                                                                               |
|  🕒 VIDEO ĐÃ HỌC GẦN ĐÂY (Recently Practiced)                                                                 |
|  +---------------------------+  +---------------------------+  +---------------------------+                  |
|  | [Thumbnail 16:9]   [🗑️]   |  | [Thumbnail 16:9]   [🗑️]   |  | [Thumbnail 16:9]   [🗑️]   |                  |
|  | Khanh Vy Learn English... |  | Show and Tell 3 (Party)   |  | Is React Native Dead?     |                  |
|  | [========------] 15/21 câu|  | [================] 21/21  |  | [==--------------] 2/202  |                  |
|  | 🕒 Hôm qua     [Học tiếp] |  | 🕒 2 ngày trước   [Ôn lại]|  | 🕒 3 ngày trước   [Học tiếp] |                |
|  +---------------------------+  +---------------------------+  +---------------------------+                  |
|                                                                                                               |
|  +---------------------------------------------------------------------------------------------------------+  |
|  |                                  ✨ Luyện Phản Xạ Nói Cùng Video YouTube                                |  |
|  |            Dán bất kỳ link video tiếng Anh nào bạn yêu thích để bắt đầu luyện cơ miệng...               |  |
|  |            Thử nhanh video mẫu: [ Khanh Vy EP 408 ]  [ Show and Tell 3 ]  [ Movies with Subtitles ]     |  |
|  +---------------------------------------------------------------------------------------------------------+  |
|  | 🎯 Karaoke Subtitles        | 🎙️ 4 Chế Độ Luyện Tập      | 🧠 Ngữ Cảnh Thực Tế                       |  |
|  +---------------------------------------------------------------------------------------------------------+  |
+---------------------------------------------------------------------------------------------------------------+
```

#### Trạng Thái 2: Đang Luyện Tập Video (Active Lesson Workspace - 2 Cột Chuẩn 1440px)
```text
+---------------------------------------------------------------------------------------------------------------+
|  Trang chủ > Luyện tập > Shadowing Practice: Khanh Vy Learn English EP 408                                    |
|  Shadowing Practice: Khanh Vy Learn English - Learn English Speaking with Video                               |
|                                                                                                               |
|  [ https://youtube.com/watch?v=RYNCaCP1VSE                     (x) ]   [ ▶ Load Video ]                       |
|                                                                                                               |
|  +-----------------------------------------------+   +-----------------------------------------------------+  |
|  |                                               |   | 📋 1198 sentences                           [✏️ Edit] |  |
|  |                                               |   | 💡 Click any sentence to start shadowing that line. |  |
|  |              YOUTUBE PLAYER (16:9)            |   |-----------------------------------------------------|  |
|  |             (Bo góc 12px, sắc nét)            |   | [ 3] [laughter]                                     |  |
|  |                                               |   | [ 4] >> I feel so shy watching my old videos.       |  |
|  |                                               |   | [ 5] [music]                                        |  |
|  +-----------------------------------------------+   | [ 6] [laughter]                                     |  |
|                                                      | [ 7] [>>] [I] [think] [this] is a pop. [laughter]   |  |
|  CHOOSE A PRACTICE MODE                              |       ▲ (Karaoke Word Highlight mượt mà)            |  |
|  +-----------+ +-----------+ +-----------+ +-------+ | [ 8] like, "Oh my god,                              |  |
|  | 🎙️ Shadow  | | 📝 Dictat | | 💬 AI Talk| | 📖Voc | | [ 9] >> oh my god." I think all of the videos      |  |
|  | 15/1198   | | 0/1198    | | Soon      | | Soon  | | [10] were pop. When I did YouTube...                |  |
|  +-----------+ +-----------+ +-----------+ +-------+ | ... (Scrollable danh sách câu cao ~720px)           |  |
|                                                      +-----------------------------------------------------+  |
|  ⭐ REVIEWS                           [Write a review]                                                        |
|  +-------------------------------------------------+                                                          |
|  | How was this lesson? Share your rating to help! |                                                          |
|  +-------------------------------------------------+                                                          |
|  Practice for: [ University Students ] [ Business English ] [ Working Adults ]                                |
+---------------------------------------------------------------------------------------------------------------+
```

---

## 🏗️ 5. Kiến Trúc Kỹ Thuật & Server Contract (Architecture & API)

### 5.1. Mô Hình Thư Mục Server (`src/server/`) — Kế Thừa & Nâng Cấp Tự Chủ

Giải pháp được phát triển dựa trên source code cốt lõi của thư viện mã nguồn mở `youtube-transcript` (MIT License) và được đội ngũ EchoChunk nâng cấp toàn diện trực tiếp trong `src/server/services/youtube.service.ts`:

1. **Gửi InnerTube Request (Kế thừa):** Gọi trực tiếp `https://www.youtube.com/youtubei/v1/player` với context `ANDROID` client để lấy `captionTracks` đã ký hợp lệ.
2. **Bộ Parse XML Đa Tầng (Nâng cấp độc quyền):**
   - **Mở rộng `srv3 format`:** Bóc tách thêm thuộc tính `t="ms"` trong thẻ `<s t="...">` để lấy mốc thời gian chính xác của **từng từ đơn lẻ** cho hiệu ứng Karaoke Word Highlighting (thư viện gốc chỉ lấy cả câu và bỏ qua dữ liệu này).
   - **Hỗ trợ `classic format`:** Fallback phân rã từ tự động cho các video có phụ đề upload thủ công.
3. **Tự chủ & Không phụ thuộc package ngoài:** Toàn bộ logic nằm gọn trong dự án, dễ bảo trì và không bị ghi đè khi cập nhật npm packages.

```
src/
├── server/
│   ├── services/
│   │   └── youtube.service.ts         # Logic thuần túy: InnerTube request + srv3/classic XML Parser có mốc từ
│   └── actions/
│       └── youtube.actions.ts         # Server Action ('use server') RPC cho Client
├── lib/
│   └── youtube-history.ts             # Quản lý LocalStorage lịch sử học phân vùng theo UID
├── app/
│   ├── api/
│   │   └── youtube/
│   │       └── transcript/
│   │           └── route.ts           # REST API route dự phòng (GET /api/youtube/transcript)
│   └── youtube/
│       └── page.tsx                   # Trang Next.js App Router (/youtube) - Container 1440px
└── components/
    └── youtube/
        ├── YouTubeStudyRoom.tsx        # Orchestrator Component (kết nối player, list, history)
        ├── YouTubeRecentVideos.tsx     # Lưới hiển thị danh sách video đã học gần đây
        ├── YouTubePlayer.tsx           # IFrame Player API + theo dõi getCurrentTime() 50ms
        ├── SentenceList.tsx            # Danh sách câu có Karaoke Word Highlighting
        └── PracticeModeCards.tsx       # 4 Thẻ chế độ luyện tập (Shadowing, Dictation, AI, Vocab)
```

### 5.2. Data Contracts (TypeScript Interfaces)

```typescript
// src/types/youtube.ts

export interface YouTubeWord {
  word: string;
  start: number;       // Thời điểm bắt đầu của từ (giây)
  end: number;         // Thời điểm kết thúc của từ (giây)
}

export interface YouTubeSentence {
  id: string;
  index: number;
  text: string;
  start: number;       // Thời điểm bắt đầu câu (giây)
  duration: number;    // Thời lượng câu (giây)
  words?: YouTubeWord[]; // Mảng mốc thời gian chi tiết của từng từ (hỗ trợ Karaoke)
  isCompleted?: boolean;
}

export interface YouTubeLessonData {
  videoId: string;
  videoTitle: string;
  sentences: YouTubeSentence[];
  totalSentences: number;
  completedCount: number;
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
```

### 5.3. YouTube History Storage Module Contract (`src/lib/youtube-history.ts`)

```typescript
// Quản lý lưu trữ lịch sử video học phân vùng theo User UID
export function getYouTubeHistory(uid?: string | null): YouTubeHistoryItem[];
export function saveYouTubeHistoryItem(item: Omit<YouTubeHistoryItem, 'lastStudiedAt'>, uid?: string | null): void;
export function updateYouTubeHistoryProgress(videoId: string, completedCount: number, uid?: string | null): void;
export function removeYouTubeHistoryItem(videoId: string, uid?: string | null): void;
export function clearYouTubeHistory(uid?: string | null): void;
```

### 5.4. Server Action Signature

```typescript
// src/server/actions/youtube.actions.ts
'use server';

export async function getYoutubeTranscriptAction(
  urlOrId: string
): Promise<GetTranscriptResponse>;
```

---

## 🛡️ 6. Error Handling (Xử Lý Lỗi)

| Mã lỗi              | Nguyên nhân                                                                    | Phản hồi hiển thị cho người dùng                                                                 |
| :-------------------- | :------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------ |
| `INVALID_URL`       | Người dùng nhập chuỗi không phải link YouTube hoặc thiếu ID.            | *"Đường dẫn YouTube không hợp lệ. Vui lòng nhập link dạng https://youtube.com/watch?v=..."* |
| `NO_TRANSCRIPT`     | Video không có phụ đề (kể cả phụ đề tự động bị tắt).              | *"Video này không có phụ đề tiếng Anh có sẵn. Vui lòng thử video khác."*                  |
| `VIDEO_UNAVAILABLE` | Video ở chế độ riêng tư, bị xóa hoặc giới hạn độ tuổi/bản quyền. | *"Video này không khả dụng hoặc đã bị đặt ở chế độ riêng tư."*                        |
| `TOO_MANY_REQUESTS` | YouTube tạm thời rate limit IP server.                                         | *"Máy chủ YouTube đang bận. Vui lòng thử lại sau giây lát."*                                 |

---

## ⚡ 7. Edge Cases (Các Trường Hợp Biên)

1. **Video có phụ đề tạo tự động (Auto-generated ASR):** Phụ đề tự động đôi khi thiếu dấu chấm câu. Thuật toán `youtube.service.ts` sẽ tự động nhóm các câu có khoảng dừng tự nhiên và viết hoa chữ cái đầu câu.
2. **Video quá dài (> 1 tiếng):** Giới hạn phân đoạn tối đa 100 câu đầu hoặc hỗ trợ tải nhanh để tránh làm đơ DOM trình duyệt.
3. **Mất kết nối mạng khi đang phát:** Video dừng và hiển thị thanh thông báo màu vàng *"Đang chờ kết nối mạng..."*.
4. **Link YouTube Shorts (`youtube.com/shorts/...`):** Tự động chuyển đổi ID của Shorts sang chuẩn video để tải phụ đề mượt mà.

---

## 📱 8. UI States (Các Trạng Thái Giao Diện)

- **Default / Starter State:** Tải sẵn video hoạt hình / giao tiếp mẫu (`xsFgrZdomDQ`) cùng 21 câu hoàn chỉnh để người dùng bấm vào là học được ngay.
- **Loading State:** Thanh input hiển thị spinner xoay nhẹ, danh sách câu hiển thị skeleton shimmer.
- **Success / Active State:** Video sẵn sàng, dòng câu đang phát được bôi xanh dương, tự động cuộn (auto-scroll) danh sách theo tiến độ video nếu người dùng bật chế độ "Follow Video".
- **Empty / Error State:** Hiển thị khung thông báo Notion Clean màu đỏ nhạt giải thích lý do không tải được kèm nút "Thử lại".

---

## 🧪 9. Test Cases (Kịch Bản Kiểm Thử)

1. **TC-01 (Happy Path - URL chuẩn):** Nhập `https://www.youtube.com/watch?v=xsFgrZdomDQ` ➔ Bấm "Load Video" ➔ Dưới 1 giây danh sách 21 câu xuất hiện ➔ Video hiển thị đúng thumbnail.
2. **TC-02 (Interactive Seek):** Bấm vào câu số 5 (`"Oh, yeah!"`) ➔ Video lập tức nhảy đến đúng mốc giây của câu số 5 và bắt đầu phát.
3. **TC-03 (Short URL):** Nhập link rút gọn `https://youtu.be/xsFgrZdomDQ` ➔ Tải thành công tương tự URL đầy đủ.
4. **TC-04 (Shorts URL):** Nhập link dạng `https://www.youtube.com/shorts/abcd1234efg` ➔ Bóc tách đúng ID và tải phụ đề.
5. **TC-05 (Video không phụ đề):** Nhập link video nhạc không lời ➔ Hiển thị thông báo thân thiện `NO_TRANSCRIPT`, không làm crash ứng dụng.
6. **TC-06 (Mark completed):** Luyện xong câu ➔ Icon chuyển từ số thứ tự sang tích xanh `✓`, thanh tiến độ trên card Shadowing tăng từ `0/21` lên `1/21`.

---

## 🏁 10. Definition of Done (Định Nghĩa Hoàn Thành)

- [x] Cấu trúc thư mục `src/server/` được khởi tạo chuẩn chỉnh và hoạt động ổn định.
- [x] Server Action `getYoutubeTranscriptAction` chạy không phát sinh lỗi và có đầy đủ Type definitions.
- [x] Giao diện `/youtube` hoàn thiện đầy đủ bố cục 2 cột theo đúng hình ảnh tham chiếu (Shadowing English chuẩn 1440px).
- [x] Tích hợp phím tắt hoặc click chuột nhảy giây video mượt mà không bị giật lag.
- [x] Đã thêm tab điều hướng **"🎬 YouTube"** trên `Navbar.tsx`.
- [x] Kiểm tra `pnpm tsc --noEmit` và `pnpm eslint` hoàn toàn sạch lỗi (Zero lint / type errors).

---

## 🚫 11. Out of Scope (Ngoài Phạm Vi Phiên Bản Này)

- Chưa tích hợp dịch tự động toàn bộ transcript sang tiếng Việt bằng AI (sẽ triển khai ở v1.1 với Gemini Flash để tiết kiệm chi phí).
- Chưa hỗ trợ tải video offline về máy (chỉ stream trực tiếp từ YouTube IFrame).
