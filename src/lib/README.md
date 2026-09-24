# EchoChunk Library Architecture (Quy chuẩn phân tách Server & Client)

Để tránh lẫn lộn giữa môi trường Server và Client, mã nguồn trong `src/lib/` được tổ chức theo 3 tầng kiến trúc độc lập:

---

## 🟢 1. Server-Side Only (`src/lib/server/`)
- **Môi trường chạy**: 100% Node.js Server (Next.js Server Components, Route Handlers).
- **Quy ước bảo mật**: Mọi file trong thư mục này **bắt buộc có `import 'server-only';`** ở dòng đầu tiên. Nếu có bất kỳ Client Component nào lỡ import nhầm, Next.js sẽ báo lỗi ngay khi build.
- **Các module**:
  - [`admin.ts`](file:///d:/SelfLearning/EchoChunk/src/lib/server/admin.ts): Khởi tạo Firebase Admin SDK với Service Account Credentials, xác thực `__session` cookie.
  - [`practiceData.ts`](file:///d:/SelfLearning/EchoChunk/src/lib/server/practiceData.ts): Pre-fetching dữ liệu bài học, progress, streak và tính toán Spaced Repetition (SRS) trên server cho SSR.

---

## 🔵 2. Client-Side Only
- **Môi trường chạy**: 100% Trình duyệt (Browser), yêu cầu truy cập các Web API của trình duyệt.
- **Các module**:
  - `src/lib/firebase/`: Firebase Client SDK gồm [`auth.ts`](file:///d:/SelfLearning/EchoChunk/src/lib/firebase/auth.ts) (Google Sign-In Popup), [`config.ts`](file:///d:/SelfLearning/EchoChunk/src/lib/firebase/config.ts), và `firestore/` (Client Sync).
  - [`storage.ts`](file:///d:/SelfLearning/EchoChunk/src/lib/storage.ts): Quản lý `localStorage` phía trình duyệt (phân vùng user UID, backup/restore JSON, streak cục bộ).
  - [`sound.ts`](file:///d:/SelfLearning/EchoChunk/src/lib/sound.ts): Web Audio API (hiệu ứng âm thanh click, success).
  - [`speech.ts`](file:///d:/SelfLearning/EchoChunk/src/lib/speech.ts): Web Speech API & Microphone Recording (thu âm giọng nói, nhận diện phát âm).

---

## 🟡 3. Shared / Pure Logic (`src/lib/shared/`)
- **Môi trường chạy**: Universal — Chạy an toàn trên cả Server (Node.js) và Client (Browser).
- **Quy tắc**: Chỉ chứa Pure Functions (không phụ thuộc vào `fs`, `cookies`, `window`, `document` hay `localStorage`).
- **Các module**:
  - [`chunksMerge.ts`](file:///d:/SelfLearning/EchoChunk/src/lib/shared/chunksMerge.ts): Hàm pure hợp nhất danh sách bài học gốc với các chỉnh sửa và từ vựng mới của user.
  - [`srs.ts`](file:///d:/SelfLearning/EchoChunk/src/lib/srs.ts): Thuật toán Spaced Repetition SuperMemo SM-2 (`calculateNextReview`, `sortQueue`, `shuffleWithSeed`).
  - [`ipa.ts`](file:///d:/SelfLearning/EchoChunk/src/lib/ipa.ts): Quy tắc tra cứu và chuẩn hóa phiên âm quốc tế IPA.
  - [`formatMarkdown.tsx`](file:///d:/SelfLearning/EchoChunk/src/lib/formatMarkdown.tsx): Hàm render markdown nhẹ cho ví dụ bài học.
