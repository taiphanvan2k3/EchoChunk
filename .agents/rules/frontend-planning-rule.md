# Mandatory Frontend Implementation Planning Rule (Quy tắc bắt buộc Lập Kế hoạch FE trước khi sửa code)

> [!IMPORTANT]
> **QUY TẮC BẮT BUỘC KHI LÀM VIỆC VỚI FRONTEND (UI/UX, CSS, TSX)**
> Khi người dùng yêu cầu thay đổi giao diện, thêm tính năng FE, refactor styling hoặc thay đổi bố cục (layout):
> **AI TUYỆT ĐỐI KHÔNG ĐƯỢC TỰ Ý SỬA CODE NGAY.**
> AI **BẮT BUỘC PHẢI** cung cấp **Implementation Plan** chi tiết trước và chỉ tiến hành code khi người dùng đã xác nhận hoặc bấm phê duyệt.

---

## 1. Lý do & Mục tiêu
- Các thay đổi Frontend thường tác động lớn đến bố cục tổng thể, trải nghiệm người dùng (UX), cấu trúc component và CSS cascade.
- Việc lập Implementation Plan trước giúp người dùng nắm rõ:
  1. Ý tưởng thiết kế và bố cục dự kiến (layout grid, responsive, khoảng cách, màu sắc).
  2. Những file và component cụ thể sẽ bị tác động (MODIFY/NEW/DELETE).
  3. Cách bảo toàn hiệu năng và logic nghiệp vụ hiện có (không gây layout shift, giật lag, hỏng state/karaoke sync).
  4. Tránh việc AI tự ý thay đổi quá nhiều mã nguồn giao diện mà người dùng không kiểm soát được.

---

## 2. Quy trình làm việc bắt buộc (Mandatory Workflow)

Mỗi khi nhận yêu cầu liên quan đến Frontend:

1. **Bước 1: Khảo sát & Phân tích (Research & Analysis)**
   - Đọc kỹ hiện trạng mã nguồn (TSX, CSS, Context, Props).
   - Xác định rõ nguyên nhân gốc rễ của vấn đề (ví dụ: container bị bó hẹp, layout shift, giật re-render).
   - Nghiên cứu kỹ mẫu thiết kế tham chiếu (nếu user cung cấp hình ảnh hoặc link).

2. **Bước 2: Lập Kế hoạch Thực thi (Implementation Plan)**
   - Viết kế hoạch rõ ràng vào artifact `implementation_plan.md` (kèm `RequestFeedback: true`).
   - Nội dung kế hoạch phải nêu rõ:
     - **Mục tiêu thay đổi (Goal & Objectives)**.
     - **Phân tích giao diện & Bố cục mới**: Mô tả chi tiết wireframe/bố cục các cột, component, màu sắc, responsive.
     - **Danh sách file bị tác động**: Chỉ rõ tên file, component và lý do can thiệp.
     - **Cam kết kỹ thuật**:
       - Sử dụng Vanilla CSS chuẩn Notion Clean Light / Shadowing English, không đưa Tailwind tùy tiện.
       - Không làm thay đổi layout shift (không đổi font-weight, padding đột ngột khi hover/active).
       - Bảo toàn tính năng hiện có (memoization, sync karaoke, audio/video seek).
     - **Kế hoạch kiểm thử (Verification Plan)**.

3. **Bước 3: Chờ User phản hồi / Phê duyệt (Await User Approval)**
   - Dừng lại, hỏi ý kiến và chờ người dùng đồng ý trước khi can thiệp vào mã nguồn.

4. **Bước 4: Thực thi & Kiểm thử (Execute & Verify)**
   - Tiến hành code đúng theo kế hoạch đã thống nhất.
   - Chạy kiểm tra TypeScript (`pnpm tsc --noEmit`) và Linting (`pnpm eslint`).
   - Cập nhật báo cáo kết quả (walkthrough) rõ ràng cho người dùng.

---

## 3. Các Tiêu chuẩn Frontend cốt lõi của EchoChunk
- **Styling**: Vanilla CSS (tập trung trong `src/app/globals.css`), đặt tiền tố rõ ràng theo tính năng (ví dụ `.yt-*`).
- **Container Awareness**: Không để layout cha (`.main-content`) bóp nghẹt các trang cần giao diện rộng (sử dụng `:has()` hoặc layout chuyên biệt).
- **Anti Layout-Shift**: Karaoke tokens, badge trạng thái, card hover không được phép làm nhảy vị trí chữ hoặc co dãn dòng.
- **Performance**: Giữ nguyên cơ chế memoization (`React.memo`), tách biệt state giữa các hàng và time ticks.
