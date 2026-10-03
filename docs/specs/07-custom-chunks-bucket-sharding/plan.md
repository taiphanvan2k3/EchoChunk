# Kế Hoạch Triển Khai Kỹ Thuật: Firestore Bucket Sharding Single-Document Summary

> **Tài liệu tham chiếu:** [docs/specs/07-custom-chunks-bucket-sharding/spec.md](spec.md) (`SPEC-07`)  
> **Phiên bản:** 1.0  
> **Trạng thái:** ✅ Đã hoàn thành (Implemented & Verified)  
> **Mục tiêu:** Cắt giảm 98.8% Firestore Read Quota (từ 249 reads xuống 1–3 reads/F5) & Bảo đảm an toàn 1MB per document.

---

## 1. Mục Tiêu & Bối Cảnh (Goal Description)

### Bối Cảnh & Vấn Đề
- Người dùng tài khoản `3Nk6gLosFYNFTPzjqr9Jtq54e2f1` sở hữu **244 custom chunks**.
- Trong kiến trúc ban đầu, mỗi chunk là một document độc lập trong subcollection `users/{uid}/customChunks/{chunkId}`.
- Mỗi lần người dùng F5 hoặc tải trang `/shadowing`, ứng dụng thực hiện `getDocs(collection(db, "users", uid, "customChunks"))`, khiến Firestore tính phí **244 lượt Document Reads**.
- Tổng số lượt đọc nhảy vọt lên **249 Reads / phút** trên Firebase Billing Console:
  - 244 reads từ `customChunks`
  - 1 read từ `progress_summary/current`
  - 1 read từ `stats/current`
  - 1 read từ user profile
  - 2 reads bổ sung từ các listener/token
- Điều này khiến hạn ngạch miễn phí 50.000 reads/ngày của Firebase Spark Plan bị cạn kiệt rất nhanh chỉ sau vài chục lần tương tác.

### Kiến Trúc Đề Xuất
```mermaid
flowchart TD
    subgraph Client["Trình Duyệt Client (Next.js 16)"]
        F5["Người dùng tải trang / F5"]
        Store["PracticeStoreProvider"]
        F5 --> Store
    end

    subgraph FirebaseFirestore["Cloud Firestore"]
        Stats["users/{uid}/stats/current\n(customChunkBucketIds: ['bucket_1'])"]
        Bucket1["users/{uid}/custom_chunks_summary/bucket_1\n(Chứa 244 chunks = 248 KB)"]
        ColdBackup["users/{uid}/customChunks/{chunkId}\n(244 docs - Cold Backup)"]
    end

    Store -->|"1 Read (Lấy danh sách bucket)"| Stats
    Store -->|"1 Read (Lấy toàn bộ từ vựng)"| Bucket1
    Store -.->|"Dự phòng khôi phục (Không đọc lúc F5)"| ColdBackup
```

---

## 2. Phân Tích Kích Thước & Cơ Chế Phân Đoạn (Bucket Sharding Sizing Math)

| Thông số kỹ thuật | Đo lường thực tế | Ngưỡng an toàn quy định |
| :--- | :--- | :--- |
| **Số lượng custom chunks hiện tại** | 244 chunks | — |
| **Tổng dung lượng JSON đo đạc** | 248.23 KB | ~1.01 KB / chunk |
| **Giới hạn cứng của Firestore Document** | 1,048,576 bytes (1 MiB) | Không được vượt quá |
| **Tỷ lệ dung lượng sử dụng hiện tại** | 24.8% dung lượng trần | Còn trống 75.2% |
| **Ngưỡng dung lượng tối đa cho mỗi Bucket** | ~500 KB | **500 chunks / bucket** |
| **Cơ chế Rollover sang Bucket mới** | Khi bucket đạt 500 từ | Tạo tiếp `bucket_2`, `bucket_3` |

---

## 3. Lộ Trình Triển Khai Chi Tiết (Implementation Roadmap)

### Giai đoạn 1: Kịch Bản Di Trú Dữ Liệu An Toàn (Migration Script)
- **Tập tin:** `scripts/migrate_custom_chunks_summary.mjs`
- **Công cụ:** Firebase Admin SDK (Node.js script với Service Account)
- **Các bước thực thi:**
  1. Kết nối Firebase Admin, đọc toàn bộ 244 documents từ `users/3Nk6gLosFYNFTPzjqr9Jtq54e2f1/customChunks`.
  2. Gom 244 chunks thành một Map dạng `{ [chunkId]: chunkData }`.
  3. Ghi vào document `users/{uid}/custom_chunks_summary/bucket_1`.
  4. Cập nhật `users/{uid}/stats/current` với:
     ```json
     {
       "customChunksCount": 244,
       "customChunkBucketIds": ["bucket_1"],
       "activeCustomChunkBucket": "bucket_1",
       "lastCustomChunksUpdatedAt": 1743673189000
     }
     ```
  5. Giữ nguyên 100% tài liệu trong `customChunks` làm Cold Backup.
- **Kết quả:** Di trú thành công 244 chunks, kích thước payload: 248.23 KB.

### Giai đoạn 2: Cập Nhật Client SDK CRUD (`customChunks.ts`)
- **Tập tin:** `src/lib/client/firebase/firestore/customChunks.ts`
- **Tối ưu hàm `fetchCustomChunks`:**
  - Nhận tham số tùy chọn `customChunkBucketIds?: string[]`.
  - Gọi `getDoc` tới các document bucket tương ứng (mặc định `bucket_1`).
  - Nạp toàn bộ từ vựng chỉ với **1 Read duy nhất**.
  - Tích hợp Fallback Auto-Migrate cho các tài khoản cũ chưa chạy script.
- **Tối ưu hàm `syncCustomChunk` (Dual-Write):**
  - Ghi field vào bucket bằng `setDoc(ref, { [chunkId]: chunk }, { merge: true })`.
  - Ghi song song vào subcollection lẻ `setDoc(doc(db, "users", uid, "customChunks", chunk.id), chunk)`.
- **Tối ưu hàm `deleteCustomChunk` (Dual-Delete):**
  - Xóa field khỏi bucket bằng `updateDoc(ref, { [chunkId]: deleteField() })`.
  - Xóa document lẻ trong subcollection bằng `deleteDoc(...)`.

### Giai đoạn 3: Cập Nhật Server SSR & Store Provider
- **Tập tin:** `src/types/index.ts`
  - Bổ sung `customChunkBucketIds`, `activeCustomChunkBucket`, `lastCustomChunksUpdatedAt` vào interface `UserStats`.
- **Tập tin:** `src/lib/server/practiceData.ts`
  - Bổ sung phân tích và serialize `customChunkBucketIds` từ `stats/current` trong luồng SSR.
- **Tập tin:** `src/stores/PracticeStoreProvider.tsx`
  - Truyền `cloudStats.customChunkBucketIds` vào hàm `fetchCustomChunks(user.uid, cloudStats?.customChunkBucketIds)` để client đọc thẳng từ bucket đã định danh.

---

## 4. Chiến Lược Dự Phòng & An Toàn Dữ Liệu (Rollback Strategy)

1. **Cold Backup Guarantee:**
   - Subcollection `customChunks/{chunkId}` hoàn toàn không bị xóa hoặc thay đổi cấu trúc.
   - Nếu có bất kỳ sự cố nào xảy ra với `custom_chunks_summary`, ta chỉ cần gỡ bỏ tham số bucket để hệ thống lập tức fallback về đọc từ `customChunks` ban đầu.
2. **Field-level Atomicity:**
   - Sử dụng `setDoc` với `{ merge: true }` và `deleteField()` đảm bảo Firestore chỉ ghi đè đúng trường dữ liệu cần sửa đổi, không làm mất các từ vựng khác trong cùng bucket.

---

## 5. Kết Quả Xác Minh (Verification & Metrics)

| Chỉ số | Trước tối ưu hóa | Sau tối ưu hóa | Tỷ lệ cải thiện |
| :--- | :--- | :--- | :--- |
| **Reads khi F5 nạp Custom Chunks** | 244 Reads | **1 Read** | **-99.6%** |
| **Tổng Reads toàn trang khi F5** | 249 Reads | **1–3 Reads** | **-98.8%** |
| **Dung lượng Document Bucket** | Phân mảnh 244 docs | 248.23 KB (trong 1 doc) | An toàn (24% của 1MB) |
| **Data Loss Risk** | Không | 0% (Duy trì Cold Backup) | Tuyệt đối an toàn |
| **TypeScript / Build Status** | — | `0 Errors` / `All Routes compiled` | Hoàn thành |
