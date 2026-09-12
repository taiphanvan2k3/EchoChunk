# Feature Specification: Firebase Backend (Authentication & Firestore Sync)

> **Feature:** Firebase Authentication (Google Sign-In) & Firestore Cloud Sync  
> **Version:** 1.0  
> **Date:** 2026-09-12  
> **Author:** Product & Engineering Team  
> **Project ID:** `echo-chunk`  
> **Status:** APPROVED / IN-PROGRESS  
> **Format Standard:** 11-Part Industry Standard Feature Specification (*Anatomy of a Good Feature Spec*)

---

## 🎯 1. Objective (Mục Tiêu)

Tại sao chúng ta xây dựng tính năng này?
- **Giải quyết bài toán mất dữ liệu:** Hiện tại EchoChunk lưu toàn bộ tiến độ học Spaced Repetition (SRS), chuỗi ngày streak và từ vựng cá nhân trong `localStorage`. Người dùng sẽ mất sạch dữ liệu khi xóa cache, đổi trình duyệt hoặc chuyển sang học trên điện thoại di động.
- **Định danh người học 1-chạm:** Cho phép người dùng đăng nhập tức thì bằng tài khoản Google (`GoogleAuthProvider`), không cần nhớ mật khẩu.
- **Đồng bộ đám mây liên thiết bị:** Tự động đồng bộ 2 chiều giữa Local và Cloud Firestore, giúp người học chuyển đổi liền mạch giữa Laptop và Smartphone.
- **Giữ trọn trải nghiệm Offline-First:** Tận dụng bộ nhớ đệm IndexedDB của Firestore SDK để người dùng học bình thường khi mất mạng, tự động đồng bộ khi có kết nối trở lại.

---

## 👤 2. User Story (Câu Chuyện Người Dùng)

> **Là một** người học tiếng Anh giao tiếp trên EchoChunk,  
> **Tôi muốn** đăng nhập nhanh bằng tài khoản Google để lưu trữ toàn bộ tiến độ luyện nói (SRS), điểm phát âm và chuỗi ngày học của mình lên đám mây,  
> **Để** tôi có thể mở điện thoại hoặc máy tính khác ra học tiếp bất cứ lúc nào mà không sợ mất chuỗi streak hay phải học lại từ đầu.

---

## ✅ 3. Acceptance Criteria (Tiêu Chí Nghiệm Thu)

- [ ] **AC-1:** Người dùng có thể bấm **"Đăng nhập Google"** trên Navbar và hoàn tất đăng nhập qua popup trong < 3 giây.
- [ ] **AC-2:** Sau khi đăng nhập, Navbar hiển thị ảnh đại diện Google (Avatar tròn), tên người dùng và huy hiệu trạng thái đồng bộ đám mây.
- [ ] **AC-3:** Toàn bộ tiến độ SRS (`repetitions`, `accuracy`, `interval`, `dueDate`, `bestAccuracy`) của từng câu được tự động lưu lên Firestore tại `users/{userId}/progress/{chunkId}`.
- [ ] **AC-4:** Thống kê chuỗi ngày học (`streakDays`, `todayReviewedCount`, `dailyGoal`) được lưu tại `users/{userId}/stats/current`.
- [ ] **AC-5:** Từ vựng do người dùng tự tạo (`customChunks`) được đồng bộ tại `users/{userId}/customChunks/{chunkId}`.
- [ ] **AC-6 (Local-to-Cloud Merge):** Người dùng đã học ở chế độ Khách (Guest) khi đăng nhập Google lần đầu thì dữ liệu cũ từ `localStorage` được tự động đẩy lên Cloud, không bị mất mát.
- [ ] **AC-7 (Cross-Device):** Đăng nhập cùng tài khoản Google trên thiết bị mới sẽ tải về 100% dữ liệu đã học trước đó.
- [ ] **AC-8 (Offline Continuity):** Khi ngắt mạng, việc luyện tập ghi nhận điểm phát âm vẫn diễn ra bình thường; khi có mạng trở lại dữ liệu tự đồng bộ ngầm.
- [ ] **AC-9:** Người dùng có thể đăng xuất an toàn; hệ thống xóa session trong memory và quay về chế độ Khách (Guest Mode).

---

## 🎨 4. UI / UX (Thiết Kế Giao Diện & Trải Nghiệm)

### 4.1. Triết lý thẩm mỹ
Tuân thủ nghiêm ngặt phong cách **Notion Clean Light**:
- Tối giản, tinh tế, viền mảnh mềm mại `rgba(55, 53, 47, 0.08)`.
- Không sử dụng màu sắc chói lọi; chỉ dùng màu pastel trang nhã.
- Typography: `Plus Jakarta Sans` kết hợp số liệu `JetBrains Mono`.

### 4.2. Trạng thái Navbar (Wireframe)

```text
+------------------------------------------------------------------------------------------------------------------+
|  ✨ EchoChunk Fluency      [🎙️ Shadowing]  [🧩 Chunk Blanks]  [⚡ Dịch Việt ➔ Anh]  [📁 Explorer]                  |
|                                                                                                                  |
|  [+ Thêm Chunk]   🎯 12/20 hôm nay   🔥 5d   [🔊]   [📊]   |   [ G  Đăng nhập Google ]  <-- CHƯA ĐĂNG NHẬP     |
|                                                            |                                                     |
|  [+ Thêm Chunk]   🎯 12/20 hôm nay   🔥 5d   [🔊]   [📊]   |   ( (Avatar) Tuấn Anh ☁️ ) <-- ĐÃ ĐĂNG NHẬP       |
+------------------------------------------------------------------------------------------------------------------+
                                                                     |
                                                                     v  (Khi bấm vào Avatar mở User Dropdown)
                                                             +---------------------------------+
                                                             |  👤 Nguyễn Tuấn Anh             |
                                                             |  ✉️ anh.nguyen@gmail.com        |
                                                             |  ☁️ Đã đồng bộ đám mây          |
                                                             |---------------------------------|
                                                             |  🚪 Đăng xuất                   |
                                                             +---------------------------------+
```

### 4.3. Các thành phần giao diện chính
1. **Google Sign-in Button:** 
   - Nút nền trắng viền xám nhẹ `border: 1px solid rgba(55, 53, 47, 0.12)`, hover nền xám nhạt `rgba(55, 53, 47, 0.04)`.
   - Chứa logo Google SVG chuẩn (4 màu) + chữ "Đăng nhập Google".
2. **User Avatar Profile Button:**
   - Ảnh đại diện tròn 32x32px có viền mờ chống vỡ viền.
   - Bên cạnh là tên rút gọn + icon đám mây xanh ngọc `CloudCheck`.
3. **Dropdown Menu:**
   - Dropdown nổi kiểu Notion, bóng đổ nhẹ `box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08)`.
   - Hiển thị email và nút **"Đăng xuất"** đỏ mờ thanh lịch.

---

## 🔌 5. API & Service Contract (Đặc Tả Hợp Đồng Dịch Vụ)

### 5.1. Authentication Interface Contract (`src/lib/firebase/auth.ts`)

```typescript
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

// Kích hoạt Google Sign-In Popup
export function signInWithGoogle(): Promise<AuthUser>;

// Đăng xuất
export function signOutUser(): Promise<void>;

// Lắng nghe thay đổi trạng thái đăng nhập
export function onAuthChange(callback: (user: AuthUser | null) => void): () => void;
```

### 5.2. React Hook Contract (`src/context/AuthContext.tsx`)

```typescript
export interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

export function useAuth(): AuthContextType;
```

### 5.3. Firestore Modular Contract (`src/lib/firebase/firestore/`)

Mô-đun được tách thành các tệp chuyên biệt theo Single Responsibility Principle:
- `progress.ts`: Đồng bộ và truy vấn tiến độ SRS (`syncChunkProgress`, `fetchUserProgressMap`).
- `stats.ts`: Quản lý chuỗi ngày học và mục tiêu (`syncUserStats`, `fetchUserStats`).
- `customChunks.ts`: Thao tác CRUD từ vựng cá nhân (`syncCustomChunk`, `deleteCustomChunk`, `fetchCustomChunks`).
- `merge.ts`: Thuật toán hợp nhất Local-to-Cloud (`batchMergeLocalToCloud`).
- `index.ts`: Barrel export toàn bộ API ra ngoài.


```typescript
// 1. Đồng bộ tiến độ 1 câu học SRS
export function syncChunkProgress(uid: string, chunkId: string, progress: ChunkProgress): Promise<void>;

// 2. Lấy toàn bộ bản đồ tiến độ của người dùng từ Cloud
export function fetchUserProgressMap(uid: string): Promise<Record<string, ChunkProgress>>;

// 3. Đồng bộ thống kê học tập (streak, số câu hôm nay)
export function syncUserStats(uid: string, stats: UserStats): Promise<void>;

// 4. Lấy thống kê học tập từ Cloud
export function fetchUserStats(uid: string): Promise<UserStats | null>;

// 5. Thêm/sửa từ vựng tự tạo của user
export function syncCustomChunk(uid: string, chunk: SpeakingChunk): Promise<void>;

// 6. Xóa từ vựng tự tạo
export function deleteCustomChunk(uid: string, chunkId: string): Promise<void>;

// 7. Lấy danh sách từ vựng tự tạo
export function fetchCustomChunks(uid: string): Promise<SpeakingChunk[]>;
```

### 5.4. Firestore Security Rules Contract (`firestore.rules`)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() { return request.auth != null; }
    function isOwner(userId) { return isAuthenticated() && request.auth.uid == userId; }

    // Phân lập dữ liệu cá nhân theo User ID
    match /users/{userId} {
      allow read, write: if isOwner(userId);
      
      match /{subcollection=**} {
        allow read, write: if isOwner(userId);
      }
    }

    // Master Chunks hệ thống: Chỉ đọc
    match /chunks/{chunkId} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

---

## ⚠️ 6. Error Handling (Xử Lý Lỗi Ngoại Lệ)

| Tình huống lỗi | Mã lỗi Firebase | Hành vi xử lý của hệ thống |
| :--- | :--- | :--- |
| **Người dùng tắt popup đăng nhập** | `auth/popup-closed-by-user` | Không coi là lỗi crash. Đóng popup, giữ nguyên trạng thái cũ, không hiện thông báo lỗi đỏ làm phiền người dùng. |
| **Domain chưa được cấp phép** | `auth/unauthorized-domain` | Hiển thị thông báo hướng dẫn nhà phát triển thêm domain hiện tại vào Firebase Console -> Authorized Domains. |
| **Mất kết nối mạng khi login** | `auth/network-request-failed` | Hiển thị Toast thông báo: *"Không thể kết nối với dịch vụ xác thực Google. Vui lòng kiểm tra đường truyền."* |
| **Mất mạng khi lưu tiến độ SRS** | *Mạng offline* | Firestore SDK tự động lưu vào IndexedDB cục bộ. Không báo lỗi gián đoạn bài học. Khi online trở lại sẽ tự đẩy lên mây. |
| **Lỗi quyền truy cập Firestore** | `permission-denied` | Ghi log console cảnh báo kiểm tra `firestore.rules`, tự động fallback dữ liệu về `localStorage` để bảo vệ phiên học. |

---

## 🔍 7. Edge Cases (Các Trường Hợp Biên Cần Lưu Ý)

1. **Edge Case 1: Học Offline Hoàn Toàn (Flight Mode / Mất sóng)**
   - *Kịch bản:* Người dùng đang trên tàu/xe buýt mất sóng nhưng vẫn muốn luyện Shadowing.
   - *Xử lý:* Nhờ tính năng `persistentLocalCache` của Firestore Web SDK, app vẫn đọc dữ liệu và ghi nhận lượt học bình thường, sau đó tự flush lên cloud khi có sóng trở lại.
2. **Edge Case 2: Xung đột Hợp nhất Dữ liệu (Local-to-Cloud Merge Conflict)**
   - *Kịch bản:* Người dùng học 10 câu ở tab ẩn danh (local), sau đó đăng nhập tài khoản Google đã có sẵn 20 câu khác trên Cloud.
   - *Xử lý:* Thuật toán Merge thông minh: Giữ lại câu nào có `lastStudied` hoặc `bestAccuracy` cao hơn; gộp số câu đã học hôm nay và lấy giá trị `streakDays` lớn nhất.
3. **Edge Case 3: Chặn Popup trên Trình duyệt Di động (Safari / iOS / Chrome Mobile)**
   - *Kịch bản:* Trình duyệt di động chặn window.open nếu không xuất phát trực tiếp từ cử chỉ bấm ngón tay.
   - *Xử lý:* Gọi trực tiếp `signInWithPopup(auth, provider)` ngay trong event handler `onClick` của button, không qua bất kỳ hàm async ngắt quãng nào trước đó.
4. **Edge Case 4: Chuyển Đổi Tài Khoản Google (Account Switching)**
   - *Kịch bản:* User đăng xuất tài khoản A và đăng nhập tài khoản B trên cùng máy tính.
   - *Xử lý:* Khi `signOutUser()` kích hoạt, reset toàn bộ state in-memory của React, xóa cache tạm thời và nạp dữ liệu hoàn toàn mới của tài khoản B.
5. **Edge Case 5: Mở Nhiều Tab Song Song (Concurrent Tabs)**
   - *Kịch bản:* Người dùng mở EchoChunk ở 2 tab khác nhau. Đăng nhập ở Tab 1.
   - *Xử lý:* Listener `onAuthStateChanged` tự động kích hoạt trên Tab 2, tự động cập nhật UI sang trạng thái đăng nhập mà không cần reload trang.

---

## 🖥️ 8. UI States (Các Trạng Thái Giao Diện)

| Trạng thái | Biểu hiện trên Navbar | Tương tác cho phép |
| :--- | :--- | :--- |
| **1. Unauthenticated (Khách)** | Nút `[ G  Đăng nhập Google ]` nổi bật vừa phải. | Bấm để kích hoạt popup đăng nhập. |
| **2. Authenticating (Đang đăng nhập)** | Nút chuyển sang icon xoay Spinner nhẹ + chữ "Đang kết nối...". | Nút bị `disabled` để chống click đúp. |
| **3. Authenticated (Đã đăng nhập)** | Ảnh đại diện Google tròn 32px + Tên người dùng + Icon `CloudCheck` màu xanh ngọc. | Bấm vào avatar để mở dropdown hồ sơ / đăng xuất. |
| **4. Cloud Syncing (Đang đồng bộ)** | Icon đám mây có hiệu ứng pulse nhẹ khi có dữ liệu vừa ghi xong. | Người dùng vẫn tiếp tục luyện nói không bị gián đoạn. |
| **5. Error State (Lỗi kết nối)** | Xuất hiện Toast thông báo góc dưới phải màn hình trong 4 giây. | Có nút "Thử lại" nếu cần. |

---

## 🧪 9. Test Cases (Kịch Bản Kiểm Thử Cụ Thể)

- **TC-01: Đăng nhập Google thành công lần đầu**
  - *Bước:* Bấm "Đăng nhập Google" ➔ Chọn tài khoản trong popup.
  - *Kỳ vọng:* Popup đóng ➔ Navbar hiển thị avatar và tên ➔ Document `users/{uid}` được khởi tạo trên Firestore Console.
- **TC-02: Hợp nhất dữ liệu khách lên Cloud (Local-to-Cloud)**
  - *Bước:* Ở chế độ khách, luyện 2 câu Shadowing đạt 90% ➔ Bấm đăng nhập Google.
  - *Kỳ vọng:* 2 câu vừa học lập tức xuất hiện trong `users/{uid}/progress` trên Firestore Console.
- **TC-03: Đồng bộ điểm phát âm & SRS thời gian thực**
  - *Bước:* Đang đăng nhập, luyện hoàn thành 1 câu trong chế độ Shadowing.
  - *Kỳ vọng:* Bản ghi `users/{uid}/progress/{chunkId}` cập nhật đúng `bestAccuracy`, `repetitions` và lịch ôn tập `dueDate`.
- **TC-04: Cập nhật Streak & Mục tiêu ngày**
  - *Bước:* Luyện đủ 20 câu đạt mục tiêu ngày.
  - *Kỳ vọng:* Bản ghi `users/{uid}/stats/current` ghi nhận `todayReviewedCount: 20` và `streakDays`.
- **TC-05: Kiểm tra trên thiết bị khác (Cross-Device)**
  - *Bước:* Mở trình duyệt ẩn danh ➔ Đăng nhập cùng tài khoản Google.
  - *Kỳ vọng:* Sổ tay SRS hiển thị đúng các câu đã học từ máy trước, số streak hiển thị chính xác.
- **TC-06: Đăng xuất tài khoản**
  - *Bước:* Bấm vào avatar ➔ Bấm "Đăng xuất".
  - *Kỳ vọng:* Navbar quay về nút "Đăng nhập Google", state cá nhân bị xóa khỏi bộ nhớ.

---

## 🏁 10. Definition of Done (Định Nghĩa Hoàn Thành - DoD)

- [ ] 1. Toàn bộ 9 Tiêu chí nghiệm thu (**Acceptance Criteria**) đều được kiểm tra và vượt qua.
- [ ] 2. Web App được đăng ký thành công trong Firebase Project `echo-chunk`.
- [ ] 3. Cấu hình Firebase an toàn qua `.env.local` (không hardcode API Keys nhạy cảm trong git).
- [ ] 4. File `firestore.rules` phân lập theo `userId` được tạo và deploy lên Firebase backend.
- [ ] 5. Module `src/lib/firebase/` và `src/context/AuthContext.tsx` được tổ chức sạch sẽ, tuân thủ TypeScript strict.
- [ ] 6. Giao diện Navbar đạt thẩm mỹ chuẩn **Notion Clean**, responsive hoàn hảo trên cả Mobile và Desktop.
- [ ] 7. Cơ chế Local-to-Cloud Merge chạy mượt mà, không làm mất dữ liệu học trước đó của người dùng.
- [ ] 8. Kiểm tra `pnpm tsc --noEmit` đạt 0 lỗi.
- [ ] 9. Kiểm tra `pnpm eslint` đạt 0 lỗi.

---

## 🚫 11. Out of Scope (Những Gì Chưa Làm Trong Đợt Này)

- **Các phương thức đăng nhập khác:** Chưa hỗ trợ Email/Mật khẩu truyền thống, Facebook, Apple, GitHub hoặc SMS OTP.
- **Lưu trữ tệp âm thanh (Audio Recording Blobs):** Chưa upload file thu âm giọng nói của người dùng lên Firebase Storage (chỉ lưu điểm số phần trăm và text transcript; lưu file audio sẽ làm ở tính năng nâng cao sau).
- **Tính năng chia sẻ Deck cộng đồng:** Chia sẻ Deck qua liên kết công khai sẽ được đặc tả trong một bản spec riêng.
- **Thanh toán & Gói tài khoản Pro:** Hệ thống hiện tại hoàn toàn miễn phí.
