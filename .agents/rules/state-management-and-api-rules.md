# State Management, Store & API Architecture Rules

> [!IMPORTANT]
> **QUY TẮC BẮT BUỘC VỀ QUẢN LÝ STATE, ZUSTAND STORE & CALL API**
> 
> 1. **Multi-Store Architecture (Tách riêng Store theo Domain):**
>    - Tuyệt đối **KHÔNG gộp tất cả state vào một monolithic "God Store"**.
>    - Phải tách riêng các store theo từng miền độc lập:
>      - `chunkStore.ts`: Quản lý kho từ vựng (Base Chunks & Custom Chunks).
>      - `progressStore.ts`: Quản lý tiến độ học tập, SRS ratings, streak & stats.
>      - `sessionStore.ts`: Trạng thái phiên luyện tập tạm thời (Queue, Filters, Search, Audio).
>      - `modalStore.ts`: Trạng thái hiển thị modal và quản lý các popup UI.
>      - `youtubeHistoryStore.ts`: Lịch sử học YouTube (độc lập).
>
> 2. **Tuyệt đối KHÔNG viết Raw API / Firestore SDK trực tiếp trong Store:**
>    - Store chỉ đóng vai trò là **Pure Data Container** (giữ state in-memory và các hàm cập nhật đồng bộ).
>    - Toàn bộ network request, fetch options, Firebase Firestore SDK calls (`setDoc`, `deleteDoc`, `getDocs`...) **bắt buộc phải nằm ở tầng Service Layer** (ví dụ: `src/lib/client/firebase/firestore/` hoặc `src/server/services/`).
>    - Khi cần gọi API/Firestore: Sử dụng Custom Hooks hoặc Service điều phối, sau đó mới cập nhật kết quả vào Store.
>
> 3. **Quy tắc về Khách vãng lai (Guest - Chưa đăng nhập):**
>    - Khách được phép học thử hoàn toàn **In-Memory (trong RAM của tab hiện tại)**.
>    - **TUYỆT ĐỐI KHÔNG ghi tiến độ học, stats hay chunk của Guest vào `localStorage`** (không tạo các key `_guest`). Reload trang sẽ trở về mặc định tự nhiên.
>    - **Chặn tạo dữ liệu ẩn danh ("Add..."):** Khi người dùng bấm tính năng tạo/thêm từ vựng mới (`openAddChunk`), bắt buộc kiểm tra trạng thái đăng nhập. Nếu chưa đăng nhập (`!user`), phải kích hoạt ngay luồng đăng nhập Google (`signInWithGoogle()`).
>
> 4. **Kiến trúc Cloud-First (Zero-LocalStorage cho User đã đăng nhập):**
>    - Cloud Firestore là nguồn chân lý duy nhất (**Single Source of Truth**).
>    - Khởi tạo dữ liệu từ Server SSR Next.js (`initialData`).
>    - Khi mutate (thêm, sửa, xóa, chấm điểm SRS): Cập nhật Store in-memory tức thì (0ms) + gọi Service cập nhật Firestore bất đồng bộ ngầm.
>    - **Tuyệt đối KHÔNG dùng cơ chế 2-way sync với LocalStorage, KHÔNG dùng mảng tombstones (`deletedChunkIds`), KHÔNG so sánh timestamps xung đột (`lastCustomChunksUpdatedAt`)**.

---

## Minh họa quy chuẩn

### ✅ ĐÚNG: Tách bạch Store thuần state và Service Layer
```ts
// 1. Tầng Service (src/lib/client/firebase/firestore/customChunks.ts)
export async function syncCustomChunk(uid: string, chunk: SpeakingChunk) {
  // Toàn bộ logic Firebase SDK nằm tại đây
  return setDoc(doc(db, 'users', uid, 'customChunks', chunk.id), chunk);
}

// 2. Store thuần State (src/stores/chunkStore.ts)
export const useChunkStore = create<ChunkState>((set) => ({
  customChunks: [],
  setCustomChunks: (chunks) => set({ customChunks: chunks }),
  addChunk: (chunk) => set((s) => ({ customChunks: [chunk, ...s.customChunks] })),
  removeChunk: (id) => set((s) => ({ customChunks: s.customChunks.filter(c => c.id !== id) })),
}));

// 3. Action gọi Service (Hook hoặc Service function)
export async function handleSaveChunk(chunk: SpeakingChunk, uid?: string | null) {
  useChunkStore.getState().addChunk(chunk); // Optimistic UI 0ms
  if (uid && uid !== 'guest') {
    await syncCustomChunk(uid, chunk); // Service
  }
}
```

### ❌ SAI: Nhét code Firebase / Fetch vào trong Store
```ts
// ❌ SAI: Store ôm đồm network logic, Firebase imports và try/catch
export const useChunkStore = create((set) => ({
  customChunks: [],
  saveChunk: async (chunk) => {
    const res = await fetch('/api/...'); // ❌ Không gọi fetch trực tiếp ở đây
    await setDoc(doc(db, 'users', ...), chunk); // ❌ Không gọi SDK trực tiếp ở đây
    set({ customChunks: ... });
  }
}));
```
