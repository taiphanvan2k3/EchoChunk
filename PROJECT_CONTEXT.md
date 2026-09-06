# 📘 EchoChunk — Tài Liệu Đặc Tả Nghiệp Vụ & Kiến Trúc Dự Án (Project Context)

> **Mục đích tài liệu:** Lưu trữ toàn bộ ngữ cảnh, nghiệp vụ, triết lý thiết kế, kiến trúc dữ liệu và quy tắc kỹ thuật của dự án **EchoChunk**. Dùng làm tài liệu tham chiếu chuẩn khi mở phiên làm việc mới (Conversation restart) với các AI Coding Assistant.

---

## 🎯 1. Tổng Quan Dự Án & Triết Lý Cốt Lõi (Core Philosophy)

- **Tên dự án:** `EchoChunk` (Contextual Speaking Chunks Fluency Engine).
- **Vấn đề giải quyết:** Người học tiếng Anh thường tích lũy rất nhiều từ vựng nhưng khi giao tiếp thực tế lại bị khựng, dịch từng từ trong đầu (word-by-word translation), hoặc phát âm sai ngữ điệu vì học các từ vựng đơn lẻ, rời rạc trên Notion, Anki hay Brainscape mà thiếu môi trường luyện cơ miệng và phản xạ nói.
- **Triết lý sống còn (Chunking-First & Context-Bound):**
  1. **Tuyệt đối không học từ vựng đơn lẻ (No Isolated Words):** Luôn học theo khối ngữ nghĩa / cụm giao tiếp cố định (**Speaking Chunks**, Collocations, Phrasal Verbs, Sentence Frames).
  2. **Bắt buộc gắn với ngữ cảnh câu ví dụ thực chiến:** Mỗi cụm chunk bắt buộc phải đi kèm ít nhất một câu ví dụ hoàn chỉnh trong đời sống/công việc và bản dịch tiếng Việt để luyện phản xạ.
  3. **Luyện phát âm & Cơ miệng chủ động (Active Speech Production):** Không dừng lại ở việc đọc/nghe thụ động, người học phải nói (Shadowing/Reflex) để hệ thống phân tích phát âm trực tiếp qua Web Speech API.

---

## 🧩 2. Khái Niệm Then Chốt: Chunks vs. Decks

| Khái niệm | **Chunk** (Khối ngôn ngữ nguyên tử) | **Deck** (Bộ thẻ / Ngăn thẻ / Playlist) |
| :--- | :--- | :--- |
| **Bản chất** | Là đơn vị học cốt lõi (**Atomic Card**). | Là **tập hợp / danh mục gom nhóm** các Chunks. |
| **Hình tượng tương đương** | 🎵 Một bài hát (Audio file). | 📂 Một danh sách phát (Playlist / Album). |
| **Dữ liệu sở hữu** | `id`, `chunk` (cụm từ), `meaning` (nghĩa cốt lõi), `ipa` (phiên âm Mỹ), `exampleSentence` (câu ví dụ mẫu), `translation` (dịch nghĩa câu), `level` (A2-C1), `context`, `tags`. | `deckId`, `title`, `description`, `icon`, `authorId`, `isPublic`, mảng liên kết `chunkIds: string[]`. |
| **Tiến độ ôn tập SRS** | **Lưu theo từng Chunk của từng User** `(userId, chunkId) -> { level, nextReview, interval, repetitions, accuracy }`. | **Không lưu tiến độ SRS**. Deck chỉ đóng vai trò container chứa các Chunks. |
| **Chia sẻ cộng đồng** | Thường không chia sẻ lẻ từng chunk. | **Người dùng chia sẻ cả Deck**. Người nhận import Deck sẽ clone các liên kết Chunk về kho học tập cá nhân. |

---

## ⚡ 3. Bốn Chế Độ Luyện Tập Đột Phá (Core Modes)

### 🎙️ 1. Shadowing & Pronunciation Lab
- **Mục tiêu:** Nhại theo ngữ điệu người bản xứ, sửa lỗi phát âm từng từ.
- **Tính năng:**
  - Nghe audio mẫu qua **Web Speech Synthesis** với 2 tốc độ: `1.0x` (chuẩn) và `0.75x` (chậm).
  - Bật Mic nói lại câu (sử dụng **Web Speech Recognition** chế độ `continuous=true`, bù độ trễ ngắt nghỉ thở tự nhiên 3500ms).
  - So khớp chuỗi âm thanh thời gian thực (Color-coded tokens):
    - 🟢 **Xanh lá:** Phát âm chuẩn xác.
    - 🔴 **Đỏ:** Phát âm sai hoặc bị nuốt từ.
    - 🟡 **Vàng:** Nói thừa từ hoặc chêm từ lạ.
  - **Word Inspector Bar (Notion Clean):** Bấm vào bất kỳ từ nào (hoặc tự động bắt từ phát âm sai) để mở thanh tra từ vựng bên dưới: hiển thị phiên âm chuẩn **Anh - Mỹ (General American IPA)** kèm cờ 🇺🇸, nút nghe phát âm từ riêng lẻ ở tốc độ 1.0x/0.7x và chế độ luyện cơ miệng cho riêng từ đó.
  - Chấm điểm phần trăm độ chính xác (`Accuracy %`) và bắn pháo hoa Confetti khi đạt điểm cao.

### 🧩 2. Chunk Blanks (Active Recall Cloze)
- **Mục tiêu:** Khắc sâu phản xạ nhớ cụm từ trong câu mà không học vẹt.
- **Tính năng:**
  - Ẩn cụm chunk mục tiêu trong câu dưới dạng `[ ? ]`.
  - Hiển thị bản dịch tiếng Việt và gợi ý ngữ cảnh.
  - Người học gõ phím hoặc bật Mic để nói cụm từ bị thiếu.
  - Phím tắt `Enter` để kiểm tra, chấm điểm và mở khóa câu hoàn chỉnh kèm âm thanh phát âm mẫu.

### ⚡ 3. Dịch Việt ➔ Anh (Quick Reflex Translation)
- **Mục tiêu:** Ép não bộ chuyển đổi tư duy trực tiếp từ ý niệm tiếng Việt sang câu tiếng Anh hoàn chỉnh trong vòng vài giây.
- **Tính năng:**
  - Đưa ra đề bài là **bản dịch câu tiếng Việt**.
  - Đồng hồ đếm ngược với 3 chế độ áp lực thời gian:
    - ⚡ **5 giây:** Cực nhanh, rèn phản xạ vô điều kiện.
    - ⏱️ **10 giây:** Vừa phải, đủ thời gian cấu trúc câu.
    - 🧘 **Zen (Không giới hạn thời gian):** Tự do suy nghĩ và luyện tập.
  - Hỗ trợ cả 2 phương thức trả lời: **Bật Mic nói trực tiếp** hoặc **Gõ phím**.
  - So sánh đối chiếu song ngữ, chấm điểm và tự động đánh giá độ thuần thục theo thang điểm SRS (Again / Hard / Good / Easy).

### 📁 4. Topic Explorer & Sổ Tay Tiến Độ Học Tập
- **🧠 Sổ tay Từ Vựng Đã Luyện Tập (SRS Recall):** Accordion chuyên biệt ở vị trí số 1 hiển thị tất cả các cụm từ bạn đã từng luyện tập kèm:
  - Phân loại 4 tab con: `Tất cả đã học`, `🚨 Cần ôn hôm nay (SRS Due)`, `⭐ Đã thành thạo`, `🌱 Đang rèn luyện`.
  - Huy hiệu số liệu SRS: Điểm phát âm cao nhất (`bestAccuracy %`), số lần lặp lại (`repetitions`), lịch hẹn ôn tập (`dueDate`).
  - Nút **"Luyện câu này"**: Cho phép nhảy ngay vào chế độ Shadowing để luyện lại câu cụ thể.
- **⭐ Từ vựng của tôi (Custom Chunks):** Quản lý toàn bộ các cụm do người dùng tự thêm mới/chỉnh sửa.
- **12 Chủ đề cốt lõi:** Duyệt theo từng chủ đề với thanh tiến độ hoàn thành (% và số câu).

---

## 🔤 4. Hệ Thống Phiên Âm IPA Mỹ (General American Engine)

- **Cơ sở dữ liệu:** Tệp từ điển offline `src/data/american-ipa.json` chứa **25,681 từ vựng thông dụng** được chuẩn hóa theo ngữ âm General American (`en-US`).
- **Thư viện tra cứu `src/lib/ipa.ts`:**
  - `getAmericanIpa(word)`: Tra cứu tức thì $O(1)$ từ điển offline.
  - `fetchMissingAmericanIpa(word)`: Tự động gọi API dự phòng khi gặp từ mới chưa có trong từ điển và cache vào `localStorage`.
- **Tự động sinh IPA:** Trong form thêm Chunk mới, người dùng có nút **"Sinh IPA"** để hệ thống tự ghép phiên âm Mỹ cho cả cụm từ mà không cần gõ thủ công.

---

## 📝 5. Quy Tắc Thêm & Quản Lý Chunk (Chunk Validation Rules)

Để bảo vệ triết lý học ngữ cảnh, form thêm/sửa chunk tại `src/components/ChunkModal.tsx` áp dụng các quy tắc kiểm tra nghiêm ngặt:

1. **4 trường bắt buộc (Strict Required):**
   - 🎯 **Cụm Speaking Chunk (`chunkText`):** Cụm từ tiếng Anh mục tiêu.
   - 🎯 **Nghĩa cốt lõi (`meaning`):** Nghĩa tiếng Việt ngắn gọn.
   - 🎯 **Câu ví dụ thực chiến (`exampleSentence`):** Bắt buộc phải có câu ví dụ mẫu hoàn chỉnh (phục vụ Shadowing & Blanks).
   - 🎯 **Dịch nghĩa câu ví dụ (`translation`):** Bắt buộc phải có bản dịch câu ví dụ (phục vụ chế độ Luyện Dịch Phản Xạ).
2. **Cảnh báo ngữ cảnh thông minh (Smart Context Hint):**
   - Tự động kiểm tra xem câu ví dụ có chứa cụm từ khóa của chunk hay không.
   - Nếu không khớp, hiển thị cảnh báo hướng dẫn màu hổ phách để người dùng đưa cụm từ vào câu ví dụ, đảm bảo các thuật toán ẩn từ (Cloze) hoạt động chính xác.

---

## 🌐 6. Kiến Trúc Chia Sẻ Cộng Đồng & Chống Duplicate Nguồn Từ

### A. Vấn đề đặt ra
- Hệ thống cung cấp sẵn kho chunk khổng lồ (hàng ngàn mẫu câu).
- Người dùng tự tạo thêm các chunk riêng và muốn chia sẻ Deck của mình cho bạn bè hoặc cộng đồng.
- Nguy cơ: Người dùng A và người dùng B cùng tạo hoặc nhập chung một cụm từ (ví dụ `touch base with`), dẫn đến rác database và duplicate hàng loạt.

### B. Giải pháp thiết kế
1. **Khóa chuẩn hóa (Canonical Key):**
   - Mỗi chunk được tạo một canonical hash: `slugify(lowercase(clean(chunk)))` (ví dụ: `chunk_call_in_sick`).
2. **Phân tách Từ Điển Chủ (Master Chunks) và Tiến Độ Người Dùng (User Progress):**
   - Bảng **Chunks**: Lưu trữ dữ liệu tĩnh duy nhất của từng chunk.
   - Bảng **Decks**: Lưu danh sách `[chunk_id_1, chunk_id_2, ...]`.
   - Bảng **UserChunkProgress**: Lưu `(userId, chunkId)` -> Trạng thái SRS, lịch sử phát âm.
3. **Cơ chế Import Deck thông minh:**
   - Khi Người dùng B import Deck từ Người dùng A:
     - Hệ thống kiểm tra xem các chunk trong Deck đã tồn tại trong Master Chunks của B chưa.
     - Nếu đã có: Giữ nguyên tiến độ học của B, chỉ thêm liên kết vào Deck mới.
     - Nếu chưa có: Tạo mới chunk và khởi tạo tiến độ SRS ở mức Level 1.

---

## 🛠️ 7. Tech Stack & Tiêu Chuẩn Kỹ Thuật (Engineering Standards)

- **Framework:** Next.js 16 (Turbopack, App Router).
- **Ngôn ngữ:** TypeScript 5.x, React 19.
- **Styling:** Vanilla CSS kết hợp CSS Modules / CSS Variables trong `src/app/globals.css`.
- **Phong cách thẩm mỹ:** **Notion Clean Light** (Nền trắng tinh khiết `#ffffff`, chữ xám đen `#37352f`, viền mềm `rgba(55, 53, 47, 0.08)`, bảng màu pastel nhẹ nhàng, thanh lịch).
- **Âm thanh & Hiệu ứng:** Web Audio API (`src/lib/sound.ts`), Canvas Confetti.
- **Package Manager:** `pnpm`.
- **React 19 & ESLint Rules:**
  - Không gọi `setState` đồng bộ trong `useEffect` để tránh cascading renders (sử dụng render-phase state adjustment `prevProps`).
  - Kiểm tra code sạch qua: `pnpm eslint <file>` và `pnpm tsc --noEmit`.

### 11. Mobile Web Speech & Permissions (Android / iOS)
- **Vấn đề Duplicate**: Mobile Chrome gặp lỗi nhận diện luồng lặp lại kết quả `interim` và `final` tích luỹ. Đã giải quyết bằng thuật toán `mergeAndDeduplicate()` và `cleanDuplicateWords()` trong `src/lib/speech.ts`.
- **Vấn đề Permission**: Khi truy cập từ điện thoại qua mạng LAN bằng HTTP (`http://192.168.x.x:3000`), trình duyệt coi là Insecure Context và thu hồi quyền Micro sau mỗi lần `stop()`.
  - Đã tích hợp `ensureMicrophonePermission()` (giữ Audio Stream ở background).
  - Khuyến nghị chạy `pnpm dev:https` (`next dev --experimental-https`) để cấp chứng chỉ SSL cục bộ, cho phép chọn "Luôn cho phép" (Always Allow) trên điện thoại.
