# 🎙️ EchoChunk AI Assistant Guidelines

> **Quan trọng:** Mỗi khi bắt đầu một phiên làm việc mới (Conversation Restart), bạn PHẢI đọc tệp **`PROJECT_CONTEXT.md`** đầu tiên để nắm đầy đủ nghiệp vụ, triết lý thiết kế và cấu trúc kỹ thuật của dự án.

---

## 🎯 1. Tài Liệu Tham Chiếu Bắt Buộc
- **Đặc tả nghiệp vụ đầy đủ:** Đọc [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md)
  - Triết lý cốt lõi: *Chunking-First & Context-Bound* (Tuyệt đối không học từ vựng đơn lẻ, bắt buộc có câu ví dụ thực tế và bản dịch).
  - Phân biệt *Chunks* (thẻ học nguyên tử) vs. *Decks* (danh sách phát / playlist).
  - 4 Chế độ luyện tập: *Shadowing & Pronunciation*, *Chunk Blanks*, *Dịch Việt ➔ Anh (Quick Reflex)*, *Topic Explorer*.
  - Hệ thống phiên âm General American IPA offline 124,895 từ (nguồn CMUdict `menelik3/cmudict-ipa` qua `src/data/american-ipa.json`).
  - Chiến lược chống duplicate dữ liệu khi chia sẻ cộng đồng (Canonical Keys, Master Chunks vs. User SRS Progress).
- **Lộ trình phát triển & Danh sách nhiệm vụ (Roadmap):** Đọc [TODO.md](./TODO.md) để nắm các đầu việc ưu tiên tiếp theo (My 24 Hours, Quick Capture, Dictation Lab, YouTube Chunk Extractor).

---

## 🛠️ 2. Tiêu Chuẩn Kỹ Thuật (Engineering Standards)
- **Quy tắc Bắt buộc với Frontend (FE Planning Rule):** Đọc [.agents/rules/frontend-planning-rule.md](./.agents/rules/frontend-planning-rule.md). Khi có yêu cầu thay đổi UI/UX, CSS, bố cục hoặc thêm component: **TUYỆT ĐỐI KHÔNG tự ý sửa code ngay**, mà BẮT BUỘC phải lập và trình bày **Implementation Plan** chi tiết, chờ người dùng duyệt rồi mới tiến hành code.
- **Package Manager:** Luôn dùng `pnpm` (ví dụ: `pnpm run dev`, `pnpm run build`, `pnpm eslint <file>`, `pnpm tsc --noEmit`).
- **React 19 & ESLint:**
  - Không gọi `setState` đồng bộ trong `useEffect` để tránh cascading renders (tuân thủ quy tắc `react-hooks/set-state-in-effect`). Dùng state tracking trong render phase hoặc event handlers.
  - Sau khi sửa code, luôn chạy kiểm tra:
    ```bash
    pnpm eslint <đường_dẫn_file>
    pnpm tsc --noEmit
    ```
- **Thẩm mỹ giao diện:** Tuân thủ phong cách **Notion Clean Light** (nền trắng `#ffffff`, chữ `#37352f`, viền mềm `rgba(55, 53, 47, 0.08)`, màu pastel nhẹ nhàng, thanh lịch).
- **Giao thức ngôn ngữ:**
  - Giao tiếp, giải thích & tài liệu: **Tiếng Việt**.
  - Tên biến, hàm, component, types & comments: **Tiếng Anh**.
