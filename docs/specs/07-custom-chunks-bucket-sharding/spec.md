# Feature Specification: Firestore Bucket Sharding Single-Document Summary for `customChunks`

> **Feature:** Cloud Firestore Read Quota Optimization via Bucket Sharded Single-Document Summaries  
> **Version:** 1.0  
> **Date:** 2026-10-03  
> **Author:** Antigravity AI & EchoChunk Engineering Team  
> **Spec ID:** `SPEC-07`  
> **Status:** APPROVED / IMPLEMENTED  
> **Target Subsystem:** Client Firestore (`src/lib/client/firebase/firestore/customChunks.ts`), Server SSR (`src/lib/server/practiceData.ts`), Store Provider (`src/stores/PracticeStoreProvider.tsx`)  
> **Format Standard:** 11-Part Industry Standard Feature Specification (*Anatomy of a Good Feature Spec*)  
> **Kế Hoạch Triển Khai:** [plan.md](plan.md)

---

## 🎯 1. Objective (Mục Tiêu)

- **Cắt giảm triệt để Quota Document Read của Firebase Firestore:**
  - **Hiện trạng:** Mỗi người dùng sở hữu hàng trăm `customChunks` (từ vựng tự tạo). Ban đầu, mỗi từ được lưu trong một document con riêng rẽ thuộc subcollection `users/{uid}/customChunks/{chunkId}`. Khi người dùng tải trang hoặc F5, lệnh `getDocs(collection(db, "users", uid, "customChunks"))` tải toàn bộ các document riêng lẻ này, tạo ra **244+ Document Reads** chỉ cho một lần nạp dữ liệu.
  - Tổng số lượt đọc nhảy vọt lên **249 Reads / phút** trên Firebase Billing Metrics. Với quota gói Spark miễn phí là 50.000 reads/ngày, chỉ cần ~200 lượt F5 là cạn sạch hạn ngạch.
  - **Mục tiêu:** Cắt giảm số lượt đọc khi nạp danh sách từ vựng từ **244 Reads xuống đúng 1 Read** (tối ưu hóa 98.8% chi phí read), đồng thời đưa tổng số reads toàn trang khi F5 xuống chỉ còn 1–3 Reads.
- **Loại bỏ triệt để nguy cơ tràn dung lượng 1 MiB của Firestore (Bucket Sharding):**
  - Giới hạn cứng của 1 document Firestore là **1,048,576 bytes (1 MiB)**. Nếu gom tất cả vào một document duy nhất mà không có cơ chế phân đoạn (sharding), người dùng tích lũy hàng ngàn từ vựng sẽ khiến document vượt quá 1MB và gây lỗi ghi (`ResourceExhausted`).
  - Thiết kế cơ chế phân đoạn theo xô (**Bucket Sharding**) với trần an toàn **500 chunks / bucket** (~500 KB, tương đương 50% trần 1MB), tự động cuộn sang `bucket_2`, `bucket_3` khi vượt ngưỡng.
- **Bảo toàn 100% dữ liệu gốc (Zero Data Loss & Cold Backup):**
  - Giữ nguyên toàn bộ 244 document cũ trong subcollection `users/{uid}/customChunks` làm kho lưu trữ dự phòng nguội (**Cold Backup**).
  - Áp dụng cơ chế **Dual-Write / Dual-Delete**: Mọi thao tác thêm/sửa/xóa từ vựng mới sẽ vừa cập nhật document summary (để đọc cực nhanh với 1 Read), vừa đồng bộ vào document lẻ (để dự phòng khôi phục thảm họa).

---

## 👤 2. User Story (Câu Chuyện Người Dùng)

> **Là một** người dùng EchoChunk học tập chuyên sâu với danh sách hàng trăm từ vựng tự tạo,  
> **Tôi muốn** ứng dụng tải trang và chuyển đổi tab ngay lập tức với độ trễ thấp nhất mà không làm cạn kiệt tài nguyên Firestore Read Quota của hệ thống,  
> **Để** tôi có thể học tập liên tục cả ngày trên nhiều thiết bị mà không bị gián đoạn dịch vụ do hết quota Firebase.

---

## ✅ 3. Acceptance Criteria (Tiêu Chí Nghiệm Thu)

- [x] **AC-1 (Zero-FOUC & 1-Read Data Loading):**
  - Khi người dùng đã đăng nhập tải lại trang (F5), toàn bộ danh sách `customChunks` được đọc từ subcollection tổng hợp `users/{uid}/custom_chunks_summary/{bucketId}`.
  - Số lượt Document Read phát sinh từ việc nạp `customChunks` cho tài khoản dưới 500 từ là **đúng 1 Read**.
- [x] **AC-2 (Bucket Sharding Sizing & Overflow Protection):**
  - Mỗi bucket document có dung lượng tối đa giới hạn ở **500 chunks** (~500 KB), đảm bảo khoảng đệm an toàn 50% so với giới hạn cứng 1 MiB của Firestore.
  - Danh sách các bucket đang sử dụng được theo dõi trong `users/{uid}/stats/current` qua trường `customChunkBucketIds: string[]` và `activeCustomChunkBucket: string`.
  - Khi số lượng chunk trong active bucket chạm ngưỡng 500, hệ thống tự động khởi tạo bucket kế tiếp (`bucket_2`, `bucket_3`,...).
- [x] **AC-3 (Dual-Write & Granular Field Deletion):**
  - Khi thêm mới hoặc chỉnh sửa 1 chunk:
    - Ghi vào active bucket bằng `setDoc(bucketRef, { [chunkId]: chunkData, updatedAt: serverTimestamp() }, { merge: true })` $\rightarrow$ Tốn 1 Write, chỉ cập nhật trường cụ thể, không ghi đè cả document.
    - Ghi đồng thời vào subcollection lẻ `users/{uid}/customChunks/{chunkId}` $\rightarrow$ Tốn 1 Write dự phòng.
  - Khi xóa 1 chunk:
    - Xóa trường tương ứng trong bucket bằng `updateDoc(bucketRef, { [chunkId]: deleteField(), updatedAt: serverTimestamp() })` $\rightarrow$ Tốn 1 Write.
    - Xóa document lẻ trong subcollection bằng `deleteDoc(...)` $\rightarrow$ Tốn 1 Write.
- [x] **AC-4 (Seamless Migration & Legacy Auto-Fallback):**
  - Có kịch bản migration di chuyển toàn bộ dữ liệu hiện có từ tài liệu lẻ sang `bucket_1`.
  - Nếu một tài khoản người dùng cũ chưa chạy migration script mở app, hàm `fetchCustomChunks` tự động phát hiện `bucket_1` chưa tồn tại, fallback đọc 1 lần từ subcollection cũ và tự động nạp ngầm (auto-migrate) vào `bucket_1` cho các lần tải tiếp theo.
- [x] **AC-5 (Cold Backup Integrity):**
  - Toàn bộ subcollection cũ `users/{uid}/customChunks` được giữ nguyên vẹn 100%, không bị xóa hay biến đổi schema.

---

## 🎨 4. UI / UX & User Flow

Tính năng này là tối ưu hóa hạ tầng kiến trúc dữ liệu (Under-the-hood Performance & Cost Optimization), do đó:
- **Giao diện người dùng (UI):** Hoàn toàn giữ nguyên phong cách thiết kế tối giản, sạch sẽ (Notion Clean). Người dùng không nhìn thấy bất kỳ sự thay đổi trực quan nào.
- **Trải nghiệm người dùng (UX):**
  - Tốc độ nạp dữ liệu ban đầu khi F5 nhanh hơn rõ rệt (thời gian phản hồi mạng giảm vì chỉ chờ 1 request document thay vì 244 requests con).
  - Không còn tình trạng giao diện giật lag hoặc bị nghẽn mạng do tải hàng trăm document song song.

---

## 🔌 5. API & Service Contract (Hợp Đồng Dịch Vụ)

### 5.1. Firestore Data Model

#### A. Document Tổng Hợp Theo Bucket: `users/{uid}/custom_chunks_summary/{bucketId}`
- `bucketId`: Mặc định là `"bucket_1"`, khi vượt quá 500 từ sẽ là `"bucket_2"`,...
- Cấu trúc document:
```typescript
interface CustomChunksSummaryDoc {
  updatedAt: Timestamp | FieldValue;
  // Mỗi chunk được lưu dưới dạng một trường có key là chunkId
  [chunkId: string]: SpeakingChunk | Timestamp | FieldValue;
}
```

#### B. Metadata Quản Lý Bucket: `users/{uid}/stats/current`
Bổ sung các trường siêu dữ liệu vào document stats hiện có:
```typescript
interface UserStats {
  streakDays: number;
  lastActiveDate: string;
  todayReviewedCount: number;
  totalPracticedCount: number;
  dailyGoal: number;
  customChunksCount: number;
  totalChunksCount?: number;
  // Các trường mới:
  customChunkBucketIds?: string[];           // Danh sách các bucket: ví dụ ['bucket_1']
  activeCustomChunkBucket?: string;    // Bucket đang nhận dữ liệu: 'bucket_1'
  lastCustomChunksUpdatedAt?: number;  // Timestamp cập nhật gần nhất
}
```

### 5.2. Service Signatures (`src/lib/client/firebase/firestore/customChunks.ts`)

```typescript
// Đọc danh sách chunks bằng summary buckets (1-2 Reads)
export async function fetchCustomChunks(
  uid: string, 
  customChunkBucketIds?: string[]
): Promise<SpeakingChunk[]>;

// Đồng bộ Dual-Write vào bucket và backup subcollection
export async function syncCustomChunk(
  uid: string, 
  chunk: SpeakingChunk, 
  activeBucket?: string
): Promise<void>;

// Xóa Dual-Delete bằng deleteField() và deleteDoc()
export async function deleteCustomChunk(
  uid: string, 
  chunkId: string, 
  customChunkBucketIds?: string[]
): Promise<void>;
```

---

## ⚠️ 6. Error Handling (Xử Lý Lỗi)

| Tình huống ngoại lệ | Nguyên nhân | Cách xử lý trong hệ thống |
| :--- | :--- | :--- |
| **Document Bucket chưa tồn tại** | Tài khoản cũ hoặc tài khoản mới đăng ký chưa có dữ liệu | Fallback đọc subcollection lẻ một lần duy nhất, sau đó tự động ghi vào `bucket_1` ngầm không chặn luồng UI. |
| **Lỗi mạng khi ghi Dual-Write** | Kết nối mạng chập chờn khi đang lưu từ | Đặt trong khối `try/catch`, ghi log cảnh báo và ném ngoại lệ lên store UI để hiển thị Toast thông báo cho người dùng. |
| **Document chạm ngưỡng dung lượng** | Số chunk trong 1 bucket vượt quá 500 từ | Hàm `syncCustomChunk` kiểm tra `customChunksCount`, khi vượt quá 500 sẽ tự động trỏ `activeCustomChunkBucket` sang `bucket_{n+1}`. |

---

## 🧩 7. Edge Cases (Các Trường Hợp Biên)

1. **Người dùng xóa một từ không nằm trong `bucket_1` (khi đã có nhiều bucket):**
   - Hàm `deleteCustomChunk` duyệt qua danh sách `customChunkBucketIds` để phát hành lệnh `updateDoc` với `deleteField()` lên đúng bucket chứa từ đó, đồng thời xóa trong backup subcollection.
2. **Offline Writing (Mất mạng khi lưu từ):**
   - Firestore Client SDK có sẵn IndexedDB Offline Persistence. Lệnh `setDoc` sẽ được ghi nhận vào hàng đợi local và tự động đồng bộ lên Firebase khi có mạng trở lại.
3. **Guest User (Chưa đăng nhập):**
   - Các từ vựng của Guest vẫn được lưu trong bộ nhớ tạm thời của `chunkStore` (Zustand memory) và không gọi tới Firestore API.

---

## 🖥️ 8. UI States (Các Trạng Thái Giao Diện)

- **Initial Hydration State:** `PracticeStoreProvider` nạp dữ liệu SSR từ `practiceData.ts` (bao gồm `userStats.customChunkBucketIds`), giao diện render ngay lập tức không bị flash.
- **Syncing State:** Khi thêm từ mới, nút "Thêm từ vựng" chuyển trạng thái loading nhẹ trong khi Dual-Write đang thực thi.
- **Error State:** Nếu Firestore từ chối quyền ghi (Permission Denied), hiển thị Toast thông báo lỗi và không làm crash app.

---

## 🧪 9. Test Cases (Kịch Bản Kiểm Thử)

| Mã kiểm thử | Mô tả kịch bản | Kết quả mong đợi | Trạng thái |
| :--- | :--- | :--- | :--- |
| **TC-01** | Người dùng tải lại trang F5 khi có 244 từ vựng | `fetchCustomChunks` chỉ gửi 1 request `getDoc(bucket_1)`. Số reads = 1. Danh sách 244 chunks đầy đủ. | ✅ Passed |
| **TC-02** | Thêm mới 1 từ vựng `chunk_test_1` | `bucket_1` được bổ sung field `chunk_test_1`, `customChunks/chunk_test_1` được tạo mới trong Firestore. | ✅ Passed |
| **TC-03** | Xóa từ vựng `chunk_test_1` | Field `chunk_test_1` biến mất khỏi `bucket_1` (qua `deleteField()`), document lẻ bị xóa (qua `deleteDoc()`). | ✅ Passed |
| **TC-04** | Kiểm tra Cold Backup | Toàn bộ 244 documents trong `users/{uid}/customChunks` vẫn còn nguyên vẹn. | ✅ Passed |
| **TC-05** | Build & Typecheck | `pnpm exec tsc --noEmit` và `pnpm run build` vượt qua 100% không có lỗi. | ✅ Passed |

---

## 🏁 10. Definition of Done (Định Nghĩa Hoàn Thành)

- [x] Tài liệu đặc tả `spec.md` và kế hoạch triển khai `plan.md` được lưu trữ tại `docs/specs/07-custom-chunks-bucket-sharding/`.
- [x] Danh mục đặc tả kỹ thuật `docs/specs/README.md` được cập nhật với mục `SPEC-07`.
- [x] Kịch bản migration dữ liệu thực tế chạy thành công trên tài khoản người dùng thực tế.
- [x] Triển khai Dual-Write và Single-Read trong codebase TypeScript.
- [x] Zero regressions: Toàn bộ các trang và chức năng học (Shadowing, Reflex, Flashcard, SRS) hoạt động trơn tru.
- [x] Ghi nhận bài học kinh nghiệm và nguyên nhân gốc rễ vào `ERRORS.md` theo chuẩn quản lý lỗi của dự án.

---

## 🚫 11. Out of Scope (Ngoài Phạm Vi)

- **Xóa vĩnh viễn subcollection cũ:** Không xóa `customChunks/{chunkId}` để duy trì chính sách an toàn dữ liệu tuyệt đối (Zero Risk Data Retention).
- **Client-side compression:** Chưa nén chuỗi JSON bằng lz-string vì 500 chunks chỉ chiếm ~500 KB, hoàn toàn nằm trong giới hạn an toàn 1MB.
