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

---

## 🧭 8. Tài Liệu Nghiên Cứu & Thiết Kế Mở Rộng

- **Nghiên cứu phương pháp "My 24 Hours" (AlexD):** Xem chi tiết tại [docs/RESEARCH_ALEXD_MY_24_HOURS.md](docs/RESEARCH_ALEXD_MY_24_HOURS.md) — *Nguồn gốc: Video bài giảng [AlexD YouTube](https://youtu.be/-Z1ad2a_BCo?si=3kLAvVcD_v2HXXzK) (Sơ đồ 6 bước tại mốc [17:42 / t=1062s](https://youtu.be/-Z1ad2a_BCo?si=3RiuPnyCjVAHLTxe&t=1062))*.
  - Phân tích tâm lý học hành vi (Atomic Habits, Decision Fatigue, 5 phút buổi sáng).
  - Đặc tả 3 cơ chế giải quyết bài toán phát sinh câu mới (Quick Capture 1-chạm bằng tiếng Việt, Branching Moments, Evening Reflection).
  - Lộ trình tích hợp chế độ **Dictation Lab** (Nghe chép chính tả bắt từ chức năng và nối âm) vào EchoChunk.
- **Nghiên cứu phương pháp "Echoing vs. Shadowing" (AlexD):** Xem chi tiết tại [docs/RESEARCH_ALEXD_ECHOING_METHOD.md](docs/RESEARCH_ALEXD_ECHOING_METHOD.md).
  - Phân biệt Shadowing (nói đè máy móc, giới hạn ý thức 10%) vs. Echoing (dội âm có khoảng lặng, khai phóng tiềm thức 90%).
  - Công thức đưa ngôn ngữ vào phản xạ tự nhiên: **SỐC + LẶP** (Shock & Repetition).
  - Kỹ thuật tương tác với AI làm Huấn luyện viên kiên nhẫn (Patient AI Coach) — không phán xét, rất phù hợp cho người hướng nội.
  - Rèn luyện các từ nối dẫn đường (Signpost Words: *First, Then, Next, Finally*) trong các quy trình thực chiến.
- **Tính năng học qua Video YouTube (YouTube Study Suite):** Xem chi tiết tại [docs/FEATURE_YOUTUBE_STUDY_SUITE.md](docs/FEATURE_YOUTUBE_STUDY_SUITE.md).
  - Luồng nhập URL YouTube ➔ Cắt đoạn 1–2 phút (150–200 từ) ➔ Dẫn dắt qua Lộ trình 6 bước chuẩn hóa (Vào tai ➔ Hiểu nghĩa ➔ Bắt chi tiết ➔ Tư duy ➔ Phản xạ ➔ Thực chiến).


---

## 🚀 9. Danh Sách Tính Năng Dự Định Triển Khai (Planned Features Backlog)

> **Giai đoạn hiện tại:** Đang tổng hợp ý tưởng, thiết kế kiến trúc và luồng người dùng (Brainstorming & Architecture Phase). Chưa tiến hành code.

1. **🌟 Phân Tầng Thư Viện Album (Library Categorization):**
   - **Tầng 1 (My Personal Hub):** Đặt trên cùng gồm `My 24 Hours`, `YouTube Decks`, `Từ vựng của tôi` và `Sổ tay SRS`.
   - **Tầng 2 (Curated Library):** 12 Topic bài học có sẵn theo chuyên đề.
2. **🌅 Hệ Sinh Thái "My 24 Hours":**
   - Bộ thẻ 10 khoảnh khắc kinh điển của AlexD / Susan.
   - **Quick Capture 1-chạm:** Gõ/nói tiếng Việt ➔ AI tự sinh Speaking Chunk, câu mẫu, IPA và ghi chú nối âm.
   - **Branching Moments:** 1 nút bấm sinh 3–5 biến thể tình huống quanh 1 khoảnh khắc.
   - **Evening 30s Reflection:** Gợi ý cuối ngày để chuẩn bị bài học sáng mai.
   - **5-Minute Morning Quick Start:** Nút 1-chạm học 5 phút buổi sáng tránh suy kiệt quyết định (*Decision Fatigue*) kèm cảnh báo *Never Miss Twice*.
3. **🎧 Chế Độ "Dictation Lab" (Nghe Chép Chính Tả):**
   - Nghe audio câu mẫu (1.0x / 0.75x) ➔ Đục lỗ che từ chức năng và cụm nối âm bị nuốt ➔ Gõ để bắt âm và hiểu quy tắc ngữ âm.
4. **🗣️ Chuẩn Hóa "Echoing Lab" & Patient AI Speaking Coach:**
   - Định danh lại chế độ luyện tập: Nghe câu ➔ Khoảng lặng tiêu hóa (Echoic Memory) ➔ Bật mic dội âm lại.
   - Chú trọng hiển thị và bắt lỗi các âm đuôi micro (`/z/`, `/s/`, `/ed/`) trên Word Inspector Bar.
   - Tích hợp AI Speaking Coach kiên nhẫn 1-1 không sợ phán xét cho người hướng nội.
5. **🎬 Bộ Công Cụ Học Video YouTube (YouTube Study Suite):**
   - Dán link YouTube ➔ Chọn đoạn 1–2 phút (150–200 từ) ➔ Dẫn dắt qua **Lộ trình 6 bước chuẩn hóa (6-Step Guided Flow)** (theo mốc video AlexD tại phút [17:42 / t=1062s](https://youtu.be/-Z1ad2a_BCo?si=3RiuPnyCjVAHLTxe&t=1062)):
     - `Bước 1: Vào tai` (Focus Listening / Nghe ngấm âm thanh).
     - `Bước 2: Hiểu nghĩa` (Bảng song ngữ Side-by-Side 2 cột EN - VI in đậm từ mới đối xứng + Tra IPA).
     - `Bước 3: Bắt chi tiết` (Dictation Lab đục lỗ bắt từ chức năng và nối âm).
     - `Bước 4: Tư duy` (Sắp xếp câu theo từ dẫn đường *First, Then, Next, Finally* / Chat logic text với AI).
     - `Bước 5: Phản xạ` (Echoing Lab dội âm có khoảng lặng 2–3s + Web Speech chấm điểm).
     - `Bước 6: Thực chiến` (AI Live Voice đàm thoại trực tiếp 2 chiều về nội dung video).

---

## 🌐 10. Tầm Nhìn Mở Rộng Đa Ngôn Ngữ (Future Multi-Language Vision)

> **Chiến lược trọng tâm (Current Focus):** Tập trung **100% vào Tiếng Anh (`en-US`)** cho mục đích học tập trước mắt, tối ưu hóa triệt để trải nghiệm của bộ tính năng cốt lõi (My 24 Hours, Echoing Lab, Dictation Lab, YouTube Study Suite).

- **Ý tưởng mở rộng tương lai (Future Horizons):**
  - **Tiếng Nhật (🇯🇵 `ja-JP`):** Rất phù hợp vì ngữ pháp tiếng Nhật phụ thuộc vào trợ từ và mẫu câu cố định (*Sentence Frames*), học theo Chunk giúp nói mượt mà không bị khựng chia thể. Tích hợp Furigana trên đầu Kanji và tách từ tự nhiên qua `Intl.Segmenter`.
  - **Tiếng Hàn (🇰🇷 `ko-KR`):** Cấu trúc khối câu và văn hóa giao tiếp lặp lại hàng ngày tương tự tiếng Nhật, tận dụng bảng chữ cái tượng thanh Hangul.
- **Chuẩn bị kiến trúc (Architectural Readiness):**
  - Thiết kế cấu trúc dữ liệu và API độc lập với ngôn ngữ (`language?: 'en' | 'ja' | 'ko'`).
  - Web Speech API trên trình duyệt đã hỗ trợ sẵn nhận diện và phát âm cho cả `ja-JP` và `ko-KR`.
  - Khi hoàn thiện phiên bản Tiếng Anh, hệ thống có thể mở rộng sang các ngôn ngữ này một cách dễ dàng mà không cần thay đổi kiến trúc gốc.
