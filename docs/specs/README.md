# 📚 EchoChunk — Feature Specifications Index (Danh Mục Đặc Tả Kỹ Thuật)

> Nơi lưu trữ toàn bộ các tài liệu đặc tả tính năng (**Feature Specifications**) của dự án EchoChunk.  
> Mỗi tính năng được tổ chức trong một thư mục độc lập để dễ dàng quản lý tài liệu, sơ đồ kiến trúc, tài nguyên giao diện và kiểm thử.

---

## 🏛️ Chuẩn Cấu Trúc Đặc Tả (Anatomy of a Good Feature Specification)

Mỗi bản spec trong thư mục này đều tuân thủ nghiêm ngặt **tiêu chuẩn 11 phần** kết nối giữa Con người (Product/Design), AI (Coding Assistant) và Mã nguồn (Codebase):

```
docs/specs/<feature-folder>/
├── spec.md              # Tài liệu đặc tả 11 phần chi tiết
└── assets/              # Sơ đồ wireframe, hình ảnh minh họa (nếu có)
```

### 11 Trụ Cột Cốt Lõi:
1. **Objective (Mục tiêu):** Tại sao tính năng này cần được xây dựng?
2. **User Story (Câu chuyện người dùng):** Ai cần nó và kết quả mong đợi là gì?
3. **Acceptance Criteria (Tiêu chí nghiệm thu):** Các điều kiện đo lường thành công (Checklist).
4. **UI / UX (Giao diện & Trải nghiệm):** Bố cục, trường nhập liệu, wireframe, phong cách thẩm mỹ Notion Clean.
5. **API & Service Contract (Hợp đồng dịch vụ):** Các interface TypeScript, hàm CRUD, Firestore Schema, Security Rules.
6. **Error Handling (Xử lý lỗi):** Cách xử lý các lỗi ngoại lệ (Mất mạng, hủy popup, lỗi quyền hạn).
7. **Edge Cases (Các trường hợp biên):** Các tình huống đặc biệt (Offline write, xung đột dữ liệu local vs cloud).
8. **UI States (Các trạng thái giao diện):** Empty, Loading, Authenticated, Syncing, Error.
9. **Test Cases (Kịch bản kiểm thử):** Các bước xác minh tính năng hoạt động chuẩn xác.
10. **Definition of Done (Định nghĩa hoàn thành):** Bảng kiểm tra điều kiện để tính năng được coi là sẵn sàng xuất xưởng.
11. **Out of Scope (Ngoài phạm vi):** Giới hạn rõ những gì CHƯA làm để tránh phình phạm vi dự án.

---

## 📑 Danh Sách Các Bản Specs (Feature Catalog)

| Mã Spec | Tên Tính Năng | Trạng Thái | Tài Liệu Chi Tiết |
| :--- | :--- | :--- | :--- |
| **SPEC-01** | **Firebase Backend (Auth & Firestore Sync)** | 🟢 In-Progress | [01-firebase-auth-firestore/spec.md](01-firebase-auth-firestore/spec.md) |
| **SPEC-02** | **My 24 Hours Ecosystem (Quick Capture & Branching)** | 🟡 Backlog | *Đang soạn thảo* |
| **SPEC-03** | **Dictation Lab (Nghe chép chính tả đục lỗ)** | 🟡 Backlog | *Đang soạn thảo* |
| **SPEC-04** | **YouTube Study Suite (Lộ trình 6 bước)** | 🟡 Backlog | [docs/FEATURE_YOUTUBE_STUDY_SUITE.md](../FEATURE_YOUTUBE_STUDY_SUITE.md) |
