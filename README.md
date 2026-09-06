# EchoChunk - Contextual Speaking Chunks Fluency Engine 🎙️⚡

Ứng dụng web chuyên biệt luyện phản xạ nói tiếng Anh theo cụm (Speaking Chunks) trong ngữ cảnh thực tế, khắc phục triệt để các nhược điểm của **Notion**, **Anki**, và **Brainscape**.

Được đồng bộ trực tiếp từ **12 chủ đề Notion English Speaking Hub** và **385 thẻ PrepTalk Brainscape**.

---

## 🌟 4 Chế độ Luyện tập Đột phá

1. 🎙️ **Shadowing & Pronunciation Lab**:
   - Nghe phát âm chuẩn người bản xứ (Web Speech Synthesis) với tùy chọn chỉnh tốc độ (`1.0x` / `0.75x`).
   - Nhấn giữ Micro và nhại lại câu tiếng Anh.
   - Ứng dụng so khớp giọng nói theo thời gian thực (Web Speech Recognition) và tô màu trực quan:
     - 🟢 **Xanh lá**: Từ phát âm chuẩn xác.
     - 🔴 **Đỏ**: Từ bị bỏ sót hoặc phát âm chưa rõ.
     - 🟡 **Vàng**: Từ nói thừa/chen vào.
   - Chấm điểm phần trăm độ chính xác (`Accuracy %`) và hiệu ứng Confetti khi đạt điểm cao!

2. 🧩 **Chunk Blanks (Active Recall Cloze)**:
   - Cụm từ Speaking Chunk trong câu sẽ bị ẩn đi `[ ? ]`.
   - Người học nhìn nghĩa tiếng Việt và gợi ý ngữ cảnh thực tế, sau đó tự gõ hoặc bật Mic để nhớ lại chủ động.
   - Bấm **Kiểm tra & Mở khóa (Enter)** để so sánh với câu chuẩn và nghe phát âm mẫu.

3. ⚡ **Reflex 5s Drill (Thử thách Phản xạ 5 Giây)**:
   - Hiển thị tình huống giao tiếp tiếng Việt chốn công sở/IT thực tế (ví dụ: giải thích lý do đổi lịch deploy, báo lỗi màn hình nhấp nháy, mặc cả phạm vi dự án...).
   - Đồng hồ đếm ngược **5 giây** kèm âm thanh tích tắc tạo áp lực nhả chữ tức thì.
   - Bấm **Đã nói xong! Xem câu chuẩn** để đối chiếu và nghe câu mẫu.

4. 📚 **Topic Explorer (Khám phá 12 Chủ đề)**:
   - Giao diện Accordion duyệt toàn bộ 12 chủ đề (Work & Business, IT/Tech, Interviews, Food & Dining, Travel, Health, Daily Life...).
   - Bấm nghe nhanh phát âm của từng câu bất kỳ lúc nào.
   - Nút **Luyện ngay** để lọc nhanh và vào chế độ luyện tập riêng cho chủ đề đó.

---

## 🚀 Hướng Dẫn Chạy Ứng Dụng (Khởi động Cực Nhanh)

Đảm bảo bạn đang ở thư mục: `D:\SelfLearning\EchoChunk`

```bash
# 1. Cài đặt thư viện (nếu chưa cài):
pnpm install

# 2. Khởi chạy dev server:
pnpm dev
```

Mở trình duyệt và truy cập: **`http://localhost:3000`**

> [!TIP]
> - Để trải nghiệm tính năng nhận diện giọng nói (Speech Recognition) và phát âm mượt mà nhất, hãy sử dụng **Google Chrome** hoặc **Microsoft Edge**.
> - Nhớ cấp quyền truy cập **Microphone** khi trình duyệt hỏi.

---

## ⌨️ Phím Tắt Tiện Lợi (Keyboard Shortcuts)
- **`Phím cách (Space)`**: Bật/Tắt phát âm câu ví dụ mẫu.
- **`Phím 1`**: Đánh giá **Chưa thuộc** (< 1 ngày).
- **`Phím 2`**: Đánh giá **Hơi khó** (2 ngày).
- **`Phím 3`**: Đánh giá **Nhớ tốt** (4 ngày).
- **`Phím 4`**: Đánh giá **Rất dễ** (7+ ngày).
- **`Phím Enter`**: Nộp bài kiểm tra điền chỗ trống trong chế độ Chunk Blanks.

---

## 💾 Lưu Trữ Dữ Liệu An Toàn (Local-First)
- Toàn bộ tiến độ học tập, điểm tự tin SRS, lịch sử làm bài và chuỗi ngày học (`Daily Streak 🔥`) đều được lưu trữ trực tiếp trong `localStorage` của trình duyệt.
- Bạn có thể bấm vào icon biểu đồ 📊 ở góc trên cùng bên phải để:
  - Xem thống kê chi tiết.
  - **Xuất tệp sao lưu (JSON)** để lưu về máy hoặc chuyển sang máy tính khác.
  - **Nhập tệp sao lưu** để khôi phục tiến độ bất kỳ lúc nào.
