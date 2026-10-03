# Feature Specification: Firestore Dev Tracing & Quota Observability Suite

> **Feature:** Client-side Real-time Firestore Tracing, Observability & Quota Auditing Suite  
> **Version:** 1.0  
> **Date:** 2026-10-03  
> **Author:** Antigravity AI & EchoChunk Engineering Team  
> **Spec ID:** `SPEC-08`  
> **Status:** APPROVED / IMPLEMENTED & TESTED  
> **Target Subsystem:** Client Firestore Layer (`src/lib/client/firebase/firestore/`), Store Providers (`src/stores/`), Dev Tools  
> **Format Standard:** 11-Part Industry Standard Feature Specification (*Anatomy of a Good Feature Spec*)  
> **Kế Hoạch Triển Khai:** [plan.md](plan.md)

---

## 🎯 1. Objective (Mục Tiêu)

- **Giải quyết triệt để sự "mù tịt" (Implicit Multiplexing) của Firebase Firestore Web SDK:**
  - Khác với REST hoặc GraphQL API (hiển thị rõ ràng từng request HTTP trong tab DevTools Network: URL, payload, headers, status), Firebase Web SDK chạy qua một kết nối truyền phát luồng ngầm duy nhất (**WebChannel / gRPC long-polling pipe**). Mọi thao tác đọc/ghi tài liệu đều bị đóng gói thành các chuỗi binary mã hóa gửi qua đường ống này.
  - Lập trình viên hoàn toàn không có khả năng quan sát (Zero Observability): Không thể biết component nào vừa gọi Firestore, đọc document nào, ghi vào đâu, và tốn bao nhiêu lượt Document Reads/Writes tính phí.
- **Phát hiện sớm nguy cơ Overfetching & Vòng lặp rò rỉ Quota (Quota Leak Detection):**
  - Cung cấp cơ chế cảnh báo tức thì ngay trên Chrome DevTools Console khi có một truy vấn nạp số lượng lớn tài liệu vượt ngưỡng an toàn ($> 20$ documents).
  - Tự động thống kê số lượt Reads/Writes lũy kế trong suốt phiên làm việc (Session Metrics), giúp nhận diện ngay các lỗi React re-render loop hay re-fetching không mong muốn trước khi deploy lên production.
- **Zero Production Overhead (Không ảnh hưởng hiệu năng người dùng cuối):**
  - Toàn bộ cơ chế Tracing và Logger chỉ hoạt động trong môi trường phát triển (`process.env.NODE_ENV === 'development'`).
  - Trong production, các hàm tracer hoạt động như một pass-through trực tiếp (no-op overhead) và được trình biên dịch loại bỏ code không sử dụng (Tree-shaking).

---

## 👤 2. User Story (Câu Chuyện Người Dùng)

> **Là một** kỹ sư phát triển phần mềm đang xây dựng các tính năng mới trên EchoChunk,  
> **Tôi muốn** nhìn thấy chi tiết từng thao tác Firestore (Path, loại thao tác Read/Write, số lượng documents, thời gian phản hồi, component gọi hàm) được in ra rõ ràng trên Console và một bảng thống kê mini,  
> **Để** tôi nắm quyền kiểm soát 100% hạn ngạch chi phí Firebase, truy vết lỗi nhanh chóng và ngăn chặn hoàn toàn các truy vấn overfetching gây cạn kiệt Quota.

---

## ✅ 3. Acceptance Criteria (Tiêu Chí Nghiệm Thu)

- [x] **AC-1 (Transparent Firestore Wrappers):**
  - Cung cấp các hàm bao bọc trong suốt (Transparent Wrappers): `tracedGetDoc`, `tracedGetDocs`, `tracedSetDoc`, `tracedUpdateDoc`, `tracedDeleteDoc`, `tracedWriteBatch` tương thích 100% chữ ký hàm (types & signatures) của Firebase Firestore v11 SDK.
  - Không phá vỡ bất kỳ logic nghiệp vụ hoặc Promise chaining hiện tại nào.
- [x] **AC-2 (Vibrant Styled Console Logger):**
  - Mỗi thao tác Firestore được ghi log ra Chrome DevTools Console với định dạng CSS `%c` nổi bật:
    - **READ (1 Doc):** Badge xanh dương/cyan `[Firestore READ]` kèm Document Path, thời gian (ms), tên hàm gọi (Caller).
    - **QUERY (Multi Docs):** Badge tím `[Firestore QUERY]` kèm Collection Path, số docs trả về, thời gian (ms).
    - **WRITE / UPDATE / DELETE:** Badge xanh lá/cam/đỏ `[Firestore WRITE/UPDATE/DELETE]` kèm Target Path.
- [x] **AC-3 (Overfetch & High-Read Warning Threshold):**
  - Tự động hiển thị cảnh báo mức `WARN` / `ERROR` màu vàng cam nổi bật khi một query đọc $> 20$ documents:
    `🚨 [Firestore OVERFETCH WARNING] Query nạp 244 docs tại users/{uid}/customChunks! Tốn 244 Reads tính phí!`
- [x] **AC-4 (Session Metrics Tracker & Global Inspection API):**
  - Khởi tạo đối tượng toàn cục `window.__FIRESTORE_METRICS__` trên trình duyệt:
    ```typescript
    window.__FIRESTORE_METRICS__ = {
      totalReads: number,
      totalWrites: number,
      totalDeletes: number,
      history: FirestoreTraceLog[],
      reset: () => void,
      summary: () => void
    }
    ```
  - Cho phép lập trình viên gõ `__FIRESTORE_METRICS__.summary()` vào Console để xem bảng `console.table()` tổng hợp số lượt đọc/ghi theo từng Collection Path.
- [x] **AC-5 (Floating Mini Dev HUD - Tùy Chọn Bật/Tắt):**
  - Hiển thị một badge nhỏ cố định ở góc dưới màn hình khi `process.env.NODE_ENV === 'development'`:
    `🔥 Reads: 3 | Writes: 1 | ⏱️ 45ms`
  - Bấm vào badge sẽ mở Drawer/Modal hiển thị danh sách các request Firestore gần nhất và nút Reset Quota Counter.
- [x] **AC-6 (Production Stripping):**
  - Đảm bảo trong `process.env.NODE_ENV === 'production'`, không có bất kỳ console log hay overhead đo đạc thời gian nào được kích hoạt.

---

## 🎨 4. UI / UX & User Flow

### 4.1. Console Output Design (Phong cách Hiện Đại, Tinh Tế)
Sử dụng các mã màu chuẩn giao diện Dark Mode của lập trình viên:
- `READ (Single Doc)`: Badge nền `#0284c7` (Sky Blue), chữ trắng đậm.
- `QUERY (Multi Docs)`: Badge nền `#7c3aed` (Purple), chữ trắng đậm.
- `WRITE / SET`: Badge nền `#16a34a` (Green), chữ trắng đậm.
- `UPDATE`: Badge nền `#d97706` (Amber), chữ trắng đậm.
- `DELETE`: Badge nền `#dc2626` (Red), chữ trắng đậm.
- `OVERFETCH ALERT`: Badge nền `#b91c1c` (Crimson), viền nhấp nháy, cảnh báo số lượt read lớn.

### 4.2. Floating Dev HUD (Góc dưới màn hình)
- Vị trí: Góc dưới cùng bên phải (`bottom-4 right-4`), z-index cao (`z-50`).
- Thiết kế: Viên thuốc (Pill) nhỏ gọn mờ kính (Glassmorphism), nền `rgba(15, 23, 42, 0.85)`, viền `rgba(255, 255, 255, 0.1)`.
- Tương tác:
  - Khi có thao tác Read/Write mới: Số đếm nhảy animation nhẹ (Scale pop).
  - Hover chuột: Hiển thị tooltip *"Click để xem lịch sử truy vấn Firestore"*.
  - Click: Mở panel thu gọn hiển thị danh sách 20 cuộc gọi gần nhất kèm nút "Xóa lịch sử" và "Tải lại trang".

---

## 🔌 5. API & Service Contract (Hợp Đồng Dịch Vụ)

### 5.1. Data Models (`src/lib/client/firebase/firestore/tracer.ts`)

```typescript
export type FirestoreOpType = 'getDoc' | 'getDocs' | 'setDoc' | 'updateDoc' | 'deleteDoc';

export interface FirestoreTraceLog {
  id: string;
  timestamp: number;
  operation: FirestoreOpType;
  path: string;
  docCount: number;         // 1 cho getDoc, N cho getDocs, 1 cho write
  durationMs: number;
  caller?: string;
  status: 'success' | 'error';
  errorDetails?: string;
}

export interface FirestoreSessionMetrics {
  totalReads: number;
  totalWrites: number;
  totalDeletes: number;
  history: FirestoreTraceLog[];
  reset: () => void;
  summary: () => void;
}
```

### 5.2. Function Signatures

```typescript
// Wrapper trong suốt cho getDoc
export async function tracedGetDoc<T = any>(
  docRef: DocumentReference<T>,
  caller?: string
): Promise<DocumentSnapshot<T>>;

// Wrapper trong suốt cho getDocs
export async function tracedGetDocs<T = any>(
  queryRef: Query<T>,
  caller?: string
): Promise<QuerySnapshot<T>>;

// Wrapper trong suốt cho setDoc
export async function tracedSetDoc<T = any>(
  docRef: DocumentReference<T>,
  data: WithFieldValue<T>,
  options?: SetOptions,
  caller?: string
): Promise<void>;

// Wrapper trong suốt cho updateDoc
export async function tracedUpdateDoc<T = any>(
  docRef: DocumentReference<T>,
  data: UpdateData<T>,
  caller?: string
): Promise<void>;

// Wrapper trong suốt cho deleteDoc
export async function tracedDeleteDoc(
  docRef: DocumentReference<any>,
  caller?: string
): Promise<void>;
```

---

## ⚠️ 6. Error Handling (Xử Lý Lỗi)

| Ngoại lệ | Nguyên nhân | Cách xử lý trong Tracer |
| :--- | :--- | :--- |
| **Firestore ném lỗi (ví dụ: `permission-denied`)** | Sai security rules hoặc user chưa đăng nhập | Tracer ghi nhận `status: 'error'`, in console đỏ `❌ [Firestore ERROR] <path>: <error.message>`, sau đó tiếp tục `throw error` để caller xử lý luồng catch bình thường. |
| **Môi trường Server-Side (SSR, API Routes, Server Actions)** | Mã nguồn chạy trên Node.js runtime không có `window` | Tracer ghi nhận và in trực tiếp ra Terminal server (Node.js stdout) qua `printConsoleTrace`. Không cần đồng bộ qua mạng về browser HUD để giữ mã nguồn đơn giản, loại bỏ hoàn toàn overhead polling định kỳ. |
| **Document Path không xác định** | DocumentRef truyền vào bị undefined hoặc null | Tracer ghi nhận `[Invalid Ref]` và ném lỗi rõ ràng trước khi SDK bị crash khó hiểu. |

---

## 🧩 7. Edge Cases (Các Trường Hợp Biên)

1. **Hot Module Replacement (HMR) trong Next.js:**
   - Khi dev chỉnh sửa code React, trang được refresh một phần. Đối tượng `window.__FIRESTORE_METRICS__` được gắn vào `window` toàn cục nên số liệu metrics phiên làm việc vẫn được bảo toàn xuyên suốt các lần HMR.
2. **Batch Writes & Transactions:**
   - Cung cấp hàm `tracedWriteBatch(db)` ghi nhận tổng số operations trong batch khi gọi `batch.commit()`.
3. **Overfetch Threshold:**
   - Ngưỡng cảnh báo mặc định là **20 documents**. Có thể cấu hình lại linh hoạt thông qua `window.__FIRESTORE_METRICS_CONFIG__ = { alertThreshold: 50 }`.

---

## 🖥️ 8. UI States (Các Trạng Thái Giao Diện)

- **Production State:** Không render component HUD, các hàm tracer hoạt động dưới dạng passthrough trực tiếp không ghi log.
- **Dev HUD Idle State:** Hiển thị viên thuốc nhỏ mờ, màu xám xanh trung tính (`Reads: X | Writes: Y`).
- **Dev HUD Alert State:** Khi có truy vấn $> 20$ docs, viên thuốc đổi sang màu cam đỏ cảnh báo kèm icon `⚠️`.
- **Drawer Open State:** Bảng lịch sử trượt lên từ góc màn hình hiển thị danh sách các request có thể scroll, lọc theo Type hoặc tìm kiếm theo Path.

---

## 🧪 9. Test Cases (Kịch Bản Kiểm Thử)

| Mã kiểm thử | Mô tả kịch bản | Kết quả mong đợi |
| :--- | :--- | :--- |
| **TC-01** | Gọi `tracedGetDoc` đọc document `stats/current` | Console in badge xanh `[Firestore READ: 1 doc]`, `window.__FIRESTORE_METRICS__.totalReads` tăng 1. |
| **TC-02** | Gọi `tracedGetDocs` đọc subcollection lẻ nạp $> 20$ docs | Console in badge tím kèm cảnh báo màu vàng `🚨 OVERFETCH WARNING`, metrics tăng N reads tương ứng. |
| **TC-03** | Gọi `tracedSetDoc` ghi dữ liệu vào Firestore | Console in badge xanh lá `[Firestore WRITE]`, metrics tăng 1 write. |
| **TC-04** | Gọi `__FIRESTORE_METRICS__.summary()` | Hiển thị bảng `console.table` nhóm theo từng Path với số lượng read/write chi tiết. |
| **TC-05** | Build Production (`NODE_ENV === 'production'`) | Build hoàn tất thành công, không phát sinh bất kỳ log tracer nào trên production. |
| **TC-06** | Thực thi Firestore queries trên Server (SSR, API Routes, Server Actions) | Console Node.js terminal in rõ ràng `[Firestore READ/QUERY: N docs] ... (ms) — <Caller>`. Không làm phát sinh network polling hay làm phức tạp client HUD. |

---

## 🏁 10. Definition of Done (Định Nghĩa Hoàn Thành)

- [x] Tạo module `src/lib/client/firebase/firestore/tracer/` (tách thành các file modular: `types.ts`, `logger.ts`, `metrics.ts`, `wrappers.ts`, `index.ts`) với đầy đủ các hàm bọc trong suốt, TypeScript function overloads và unit testing driver.
- [x] Tích hợp tracer vào toàn bộ các service trong `src/lib/client/firebase/firestore/`:
  - `customChunks.ts`
  - `stats.ts`
  - `progress.ts`
  - `userYTKeys.ts`
  - `youtubeHistory.ts`
  - `youtubeTranscript.ts`
- [x] Phân định rõ ràng phạm vi quan sát: Server-side logs trực tiếp ra Server Terminal stdout; Client-side logs hiển thị phản xạ thời gian thực trên Floating Dev HUD.
- [x] Khởi tạo đối tượng `window.__FIRESTORE_METRICS__` trên client với các phương thức `reset()`, `summary()`.
- [x] Tạo component `FirestoreQuotaTracer.tsx` và gắn vào `layout.tsx` (chỉ render khi `process.env.NODE_ENV === 'development'`).
- [x] Cập nhật bảng Feature Catalog trong `docs/specs/README.md`.
- [x] Tạo bộ tự động hóa unit test `scripts/test_tracer.mjs` với 9/9 test cases passed (`pnpm test:tracer`).
- [x] Kiểm thử `pnpm exec tsc --noEmit` và `pnpm run lint` đạt 0 errors.

---

## 🚫 11. Out of Scope (Ngoài Phạm Vi)

- Không gửi telemetry log về dịch vụ bên thứ ba (như Datadog, New Relic) trong môi trường phát triển cục bộ.
- Không thay thế Firestore Security Rules testing trong Firebase Emulator.
- **Không xây dựng cơ chế polling nền phức tạp hay custom endpoint** để kéo Firestore traces từ Server runtime (SSR, API Routes, Server Actions) vào Client browser HUD, giữ codebase tinh gọn, sạch sẽ và không gây overhead.
