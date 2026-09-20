# 📋 EchoChunk — TODO & Kế Hoạch Triển Khai (Roadmap)

> **Dự án:** EchoChunk — English Fluency Engine  
> **Cập nhật:** 2026-09-13  
> **Tài liệu tham chiếu:** [`docs/specs/04-youtube-study-suite/spec.md`](file:///d:/SelfLearning/EchoChunk/docs/specs/04-youtube-study-suite/spec.md) & [`docs/FEATURE_YOUTUBE_STUDY_SUITE.md`](file:///d:/SelfLearning/EchoChunk/docs/FEATURE_YOUTUBE_STUDY_SUITE.md)

---

## 🏆 I. Đã Hoàn Thành (Completed Milestones)

### 1. YouTube Core Engine (`src/server/`)
- [x] Tích hợp trực tiếp **InnerTube Android Client API** (`POST /youtubei/v1/player`) lấy `captionTracks` tự chủ, không phụ thuộc package ngoài.
- [x] Cơ chế **Fallback Web Scraping** an toàn bằng thuật toán đếm ngoặc (bracket counter) giải mã JSON `ytInitialPlayerResponse` khi API chặn.
- [x] Hỗ trợ định dạng phụ đề `srv3` bóc tách **mốc thời gian từng từ đơn lẻ** (`<s>` tags) phục vụ hiệu ứng Karaoke.
- [x] Tích hợp **Webshare Rotating Proxy** (`https-proxy-agent`) & ưu tiên client InnerTube `ANDROID` chống YouTube chặn IP datacenter/server.
- [x] Server Action RPC [`getYoutubeTranscriptAction`](file:///d:/SelfLearning/EchoChunk/src/server/actions/youtube.actions.ts).

### 2. Giao diện Phòng Học YouTube (`/youtube`)
- [x] Phá vỡ container 920px, mở rộng chuẩn **1440px** thoáng đãng phong cách **Shadowing English**.
- [x] Trình phát YouTube IFrame 16:9 với bộ đếm thời gian 50ms mượt mà và cơ chế hủy player an toàn.
- [x] Hiệu ứng **Word-Level Karaoke Highlighting** phát sáng từ theo thời gian thực, cam kết **Zero Layout Shift**.
- [x] Tối ưu hóa hiệu năng render: pass `currentTime = 0` cho các câu không active giúp `React.memo` bỏ qua 99% re-render thừa.
- [x] Breadcrumb điều hướng quay lại trang chủ hoặc thoát video về danh sách bài đã học.
- [x] Lưới 4 Thẻ Chế Độ Luyện Tập (Practice Mode Cards) với pill badge đặc trưng từng chế độ.
- [x] Khối Reviews & Thẻ đối tượng người học (*Practice for: University Students, Business English...*).

### 3. Lưu Trữ Lịch Sử Học Tập (YouTube Study History)
- [x] Module [`youtube-history.ts`](file:///d:/SelfLearning/EchoChunk/src/lib/youtube-history.ts) lưu trữ video, tiến độ câu hoàn thành vào LocalStorage.
- [x] Cô lập dữ liệu đa người dùng (Multi-User Data Isolation) theo UID: `echo_yt_history_${uid || 'guest'}`.
- [x] Thành phần [`YouTubeRecentVideos.tsx`](file:///d:/SelfLearning/EchoChunk/src/components/youtube/YouTubeRecentVideos.tsx) hiển thị danh sách bài học gần đây kèm thumbnail 16:9, progress bar và nút tiếp tục học 1-click.

### 4. Chuẩn Hóa Kiến Trúc React 19 & Clean Code
- [x] Tách custom hook tái sử dụng [`useIsClient.ts`](file:///d:/SelfLearning/EchoChunk/src/hooks/useIsClient.ts) bằng `useSyncExternalStore` (Zero Cascading Render, No Hydration Mismatch).
- [x] Khắc phục triệt để lỗi ESLint `react-hooks/refs` trong [`YouTubePlayer.tsx`](file:///d:/SelfLearning/EchoChunk/src/components/youtube/YouTubePlayer.tsx).
- [x] Đạt chuẩn **0 lỗi TypeScript (`pnpm tsc --noEmit`)** và **0 lỗi ESLint (`pnpm eslint`)** toàn dự án.
- [x] Lưu trữ tài liệu kỹ thuật [`docs/REACT_PATTERNS_AND_TECHNIQUES.md`](file:///d:/SelfLearning/EchoChunk/docs/REACT_PATTERNS_AND_TECHNIQUES.md) và nhật ký sửa lỗi [`docs/ERRORS.md`](file:///d:/SelfLearning/EchoChunk/docs/ERRORS.md).

---

## 🎯 II. Những Việc Cần Làm Tiếp (Pending Tasks & Priority Roadmap)

---

### 🔥 GIAI ĐOẠN 1: Kích hoạt Tương Tác 4 Chế Độ Luyện Tập (Interactive Practice Modes)
*Mục tiêu: Biến các thẻ hiện tại từ giao diện hiển thị thành tính năng luyện tập trực tiếp trên từng câu.*

#### 1. 🎙️ Phòng Luyện Nhại Giọng (Shadowing / Echoing Modal)
- [ ] **Mở Modal Luyện Tập Câu:** Khi click vào card Shadowing (hoặc nút Mic tại từng dòng câu), mở popup/modal tập trung.
- [ ] **Tự Động Lặp Câu (A-B Loop):** Lặp lại đúng mốc thời gian câu đó (`start` ➔ `start + duration`) kèm 2-3 giây khoảng lặng (Echoic delay) để người học ngẫm âm thanh.
- [ ] **Chấm Điểm Giọng Nói (Web Speech Recognition):** Bật Mic cho người học nói lại, tô màu từ:
  - 🟢 **Xanh lá:** Phát âm chuẩn xác.
  - 🔴 **Đỏ:** Bị nuốt âm, phát âm sai hoặc thiếu âm đuôi (ending sounds `/s/`, `/z/`, `/t/`, `/d/`).
- [ ] **Tự động cập nhật tiến độ:** Đánh dấu hoàn thành câu (`isCompleted = true`) và tăng thanh tiến độ trên card.

#### 2. 📝 Phòng Nghe Chép Chính Tả (Dictation Lab)
- [ ] **Đục Lỗ Từ Chức Năng (Fill-in-the-blanks):** Tự động che các từ nối, giới từ, mạo từ (*in, at, on, the, of, for*) hoặc các từ khóa trong câu.
- [ ] **Bàn Phím Tương Tác:** Ô nhập liệu gõ từ còn thiếu, bấm `Enter` để kiểm tra.
- [ ] **Gợi Ý & Tua Chậm:** Phím tắt nghe lại ở tốc độ `0.75x` nếu gõ sai 2 lần liên tiếp.

#### 3. 📖 Trích Xuất Từ Vựng & Speaking Chunks (Vocabulary & SRS Integration)
- [ ] **Word / Chunk Inspector Popover:** Bấm hoặc bôi đen một từ/cụm từ trong danh sách câu sẽ hiện popup tra phiên âm **American IPA** và nghĩa.
- [ ] **Lưu Trực Tiếp Vào Sổ Tay SRS:** Nút *"Lưu vào Sổ tay"* để thêm câu/chunk đó vào kho ôn tập lặp lại ngắt quãng của EchoChunk (`saveChunk` trong `lib/storage.ts`).

#### 4. ✏️ Chỉnh Sửa Câu (Edit Sentences Action)
- [ ] Xử lý sự kiện khi bấm nút **[✏️ Edit]** trên thanh header của `SentenceList`: Cho phép sửa chính tả câu ASR hoặc ghép 2 mảnh câu ngắn lại với nhau.

---

### 🤖 GIAI ĐOẠN 2: Tích Hợp AI Pipeline (Gemini Flash Engine)
*Mục tiêu: Nâng tầm chất lượng bài học theo chuẩn phương pháp AlexD (bảng song ngữ, phân đoạn ngữ nghĩa).*

- [ ] **Song Ngữ Đối Chiếu Side-by-Side (Bilingual Translation):**
  - Gọi Gemini Flash sinh bản dịch tiếng Việt thoát ý tự nhiên theo ngữ cảnh nói (thay vì dịch máy Google thô cứng).
  - Bật/tắt hiển thị cột Tiếng Việt bên dưới hoặc bên cạnh câu tiếng Anh.
- [ ] **Gom Câu Ngữ Nghĩa (AI Semantic Chunking):**
  - YouTube ASR thường ngắt vụn (mỗi câu chỉ 1-2 từ hoặc 1-2 giây).
  - Dùng AI gom các mẩu nhỏ thành các câu hoàn chỉnh có nghĩa dài 6–10 giây, tự động căn chỉnh lại mốc thời gian `start`/`duration`.
- [ ] **💬 Chế Độ AI Talk (Hội Thoại Về Video):**
  - AI đóng vai gia sư đặt câu hỏi gợi mở về nội dung video, người học trả lời bằng phím gõ hoặc nói trực tiếp qua Voice Agent.

---

### 🚀 GIAI ĐOẠN 3: Trải Nghiệm Người Dùng Nâng Cao (UX Polish & Utilities)
*Mục tiêu: Tiện dụng tối đa cho việc học hàng ngày.*

- [ ] **Thanh Trượt Phân Đoạn Video (1–2 phút Selector):**
  - Cho phép người học trích đoạn 1-2 phút (150–200 từ) từ các video dài (30-60 phút) để luyện tập tập trung.
- [ ] **Chế Độ Tự Động Cuộn (Auto-Scroll Toggle):**
  - Công tắc bật/tắt tính năng tự động cuộn danh sách câu bám sát theo video đang phát.
- [ ] **Viết Đánh Giá Bài Học (Review Modal):**
  - Mở modal chấm sao ⭐ và ghi chú lại cảm nhận sau khi học xong bài.
- [ ] **Phím Tắt Điều Khiển (Keyboard Shortcuts):**
  - `Space`: Tạm dừng / Phát tiếp video.
  - `J` / `L`: Lùi lại 5s / Tiến 5s.
  - `↑` / `↓`: Nhảy sang câu trước / câu kế tiếp.
  - `R`: Lặp lại câu hiện tại (Replay sentence).
