# 🧠 Tổng Hợp Kỹ Thuật & React Hooks Nâng Cao Đã Sử Dụng Trong EchoChunk

Tài liệu này ghi lại các pattern, kỹ thuật tối ưu hóa và React Hooks nâng cao đã được áp dụng trong quá trình xây dựng và tối ưu giao diện phòng học **YouTube Study Room** (`/youtube`).

---

## 1. `flushSync` (từ `react-dom`) — Phản Hồi UI Tức Thì 0ms

### 🔴 Vấn Đề Gặp Phải:
Khi người dùng bấm nút **"Load Video"**, một request bất đồng bộ (`fetch`) được gửi lên server. Do cơ chế tự động gom nhóm (Automatic Batching) của React, việc cập nhật state `setIsLoading(true)` có thể bị hoãn lại một vài frame, khiến người dùng cảm giác nút bấm bị "đơ" hoặc "khựng" trước khi thấy spinner xuất hiện.

### 🟢 Giải Pháp:
Sử dụng `flushSync` để ép React ghi đè Batching và cập nhật trực tiếp lên DOM ngay lập tức:

```tsx
import { flushSync } from 'react-dom';

const handleLoadVideo = async (targetUrl?: string) => {
  // Ép React vẽ Spinner lên màn hình NGAY TỨC THÌ (0ms)
  // trước khi bất kỳ network call bất đồng bộ nào bắt đầu
  flushSync(() => {
    setIsFetching(true);
    setErrorMessage(null);
  });

  try {
    const res = await getYoutubeTranscriptAction(url);
    // ...
  } finally {
    setIsFetching(false);
  }
};
```

---

## 2. `useTransition` — Render Hàng Nghìn Node DOM Không Làm Đơ Trình Duyệt

### 🔴 Vấn Đề Gặp Phải:
Một video YouTube dài 20-30 phút có từ **500 đến 1.500 câu**, tương đương hàng chục nghìn thẻ `<span>` (Karaoke word tokens). Nếu dùng `setState` thông thường, React sẽ đồng bộ render toàn bộ cây DOM khổng lồ này, chiếm dụng hoàn toàn Main Thread (CPU 100%). Hậu quả: **Spinner bị đứng im (freeze)** và người dùng không thể click hay cuộn trang.

### 🟢 Giải Pháp:
Sử dụng Concurrent React với `useTransition`:

```tsx
import { useTransition } from 'react';

const [isFetching, setIsFetching] = useState(false);
const [isPending, startTransition] = useTransition();

// isLoading duy trì suốt từ lúc gọi network đến khi React render xong 1.000 câu
const isLoading = isFetching || isPending;

// Trong hàm xử lý dữ liệu:
startTransition(() => {
  // Đánh dấu đây là Non-blocking Low Priority Update
  setLessonData(data);
  setActiveSentenceId(data.sentences[0]?.id || null);
});
```

- **Lợi ích:** Trình duyệt không bị giật lag, spinner tiếp tục quay đều và người dùng vẫn có thể tương tác với các thành phần khác trên trang.

---

## 3. `useSyncExternalStore` — Đọc LocalStorage Chuẩn React 19 (Zero Hydration Mismatch)

### 🔴 Vấn Đề Gặp Phải:
Trong Next.js App Router (SSR), `localStorage` chỉ tồn tại trên Client.
- Nếu đọc trực tiếp trong render: Bị lỗi **Hydration Mismatch** (HTML phía server không khớp với client).
- Nếu đọc trong `useEffect` rồi `setState`: Bị vi phạm quy tắc ESLint React 19 (`react-hooks/set-state-in-effect`) vì gây ra **Cascading Render** (render thừa 2 lần).

### 🟢 Giải Pháp:
Kết hợp `useSyncExternalStore` để xác định môi trường Client an toàn + `useMemo` và phiên bản store (`storeVersion`):

```tsx
import { useState, useMemo, useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {};

export const YouTubeStudyRoom: React.FC = () => {
  const { user } = useAuth();
  const [storeVersion, setStoreVersion] = useState(0);

  // Nhận diện Client-side an toàn tuyệt đối mà không cần useEffect
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,  // Client snapshot
    () => false  // Server snapshot
  );

  // Đọc LocalStorage an toàn theo User UID
  const history = useMemo(() => {
    void storeVersion; // Lắng nghe khi có thao tác thêm/xóa video
    if (!isClient) return [];
    return getYouTubeHistory(user?.uid);
  }, [isClient, storeVersion, user?.uid]);

  // Khi thêm/xóa video: chỉ cần tăng version -> useMemo tự tính lại
  const handleRemoveHistory = (videoId: string) => {
    removeYouTubeHistoryItem(videoId, user?.uid);
    setStoreVersion((v) => v + 1);
  };
};
```

---

## 4. Tối Ưu Re-render 50ms Karaoke (Chỉ Re-render Đúng 1 Dòng Duy Nhất)

### 🔴 Vấn Đề Gặp Phải:
Để chữ chạy Karaoke mượt theo khẩu hình video, `currentTime` của Player phải được phát ra mỗi **50ms (20 lần/giây)**.
Nếu truyền `currentTime` vào cả danh sách 1.000 câu:
`20 ticks/giây x 1.000 câu = 20.000 lần re-render mỗi giây` ➔ Trình duyệt sập hoặc giật lag nghiêm trọng!

### 🟢 Giải Pháp: Kỹ Thuật "Zero Time Prop"
Tách biệt triệt để giữa dòng đang phát (Active) và các dòng không phát (Non-active):

```tsx
// src/components/youtube/SentenceList.tsx

// 1. Dùng React.memo cho từng hàng
const SentenceRow = React.memo(function SentenceRow({
  sentence,
  isActive,
  currentTime, // Với dòng không active, luôn nhận giá trị 0
}) {
  // ...
});

// 2. Trong danh sách cha:
{sentences.map((sentence) => {
  const isActive = sentence.id === effectiveActiveId;
  return (
    <SentenceRow
      key={sentence.id}
      sentence={sentence}
      isActive={isActive}
      // ĐIỂM SÁNG: 999 câu còn lại luôn nhận 0 -> React.memo chặn re-render 100%!
      // Chỉ DUY NHẤT 1 câu đang active mới nhận currentTime thật mỗi 50ms.
      currentTime={isActive ? currentTime : 0}
    />
  );
})}
```

---

## 5. Chống Layout Shift Tuyệt Đối Khi Highlight Karaoke & Đổi Trạng Thái

### 🔴 Vấn Đề Gặp Phải:
Khi từ được highlight (tô vàng):
- Nếu thêm `font-weight: bold`: Bề ngang ký tự tăng lên -> đẩy các từ phía sau dịch chuyển -> cả đoạn văn bị giật nảy.
- Nếu đổi `padding` hoặc `margin`: Làm thay đổi chiều cao dòng -> gây nhảy layout (Cumulative Layout Shift - CLS).

### 🟢 Giải Pháp (CSS Pure Styling):

```css
/* Không thay đổi font-weight, không đổi padding */
.yt-word-token {
  display: inline;
  padding: 0.08rem 0.22rem;
  border-radius: 4px;
  /* CHỈ transition màu sắc, KHÔNG transition kích thước */
  transition: background 0.05s ease, color 0.05s ease;
}

.yt-word-token.is-singing {
  background: #fef08a !important; /* Vàng nhạt */
  color: #854d0e !important;      /* Nâu đậm dễ đọc */
  /* GIỮ NGUYÊN font-weight thông thường */
}

/* Badge số thứ tự: cố định kích thước khung để tránh co dãn */
.yt-sentence-index-badge {
  min-width: 24px;
  height: 24px;
  box-sizing: border-box;
  flex-shrink: 0;
}
```

---

## 6. CSS `:has()` Selector — Phá Vỡ Giới Hạn Container Cha (Container Breakout)

### 🔴 Vấn Đề Gặp Phải:
Layout gốc trong `layout.tsx` có `<main className="main-content">` bị áp đặt `max-width: 920px` cho các bài học dạng flashcard. Khi vào trang YouTube (cần 2 cột rộng gồm Video 16:9 + Danh sách câu), trang bị ép nhỏ lại, để thừa 2 khoảng trắng mênh mông 2 bên.

### 🟢 Giải Pháp:
Thay vì viết lại toàn bộ `layout.tsx` làm ảnh hưởng các trang khác, sử dụng CSS `:has()` hiện đại:

```css
/* Mặc định cho toàn bộ app */
.main-content {
  max-width: 920px;
  margin: 0 auto;
}

/* Khi bên trong có chứa phòng học YouTube -> tự động mở rộng 1440px */
.main-content:has(.yt-study-room-container),
.main-content:has(.yt-page-wrapper) {
  max-width: 1440px !important;
  padding: 1.25rem 2rem 4rem 2rem;
  width: 100%;
}
```

---

## 7. Auto-scroll Nội Bộ Mượt Mà (Tránh Rung Giật Toàn Trang)

### 🔴 Vấn Đề Gặp Phải:
Nếu dùng `element.scrollIntoView({ behavior: 'smooth' })`, trình duyệt sẽ cuộn toàn bộ cửa sổ (cả thanh Navbar và toàn màn hình bị nhảy theo).

### 🟢 Giải Pháp:
Tính khoảng cách tương đối và chỉ cuộn trong khung nhìn nội bộ (`container.scrollTo`):

```tsx
useEffect(() => {
  if (activeItemRef.current && listContainerRef.current) {
    const container = listContainerRef.current;
    const item = activeItemRef.current;

    // Khoảng cách tương đối của item so với khung cuộn
    const itemTop = item.offsetTop - container.offsetTop;
    const itemBottom = itemTop + item.clientHeight;
    const scrollTop = container.scrollTop;
    const viewH = container.clientHeight;

    // Chỉ cuộn khi item sắp trượt ra khỏi vùng nhìn (Buffer an toàn 30px)
    if (itemTop < scrollTop + 30 || itemBottom > scrollTop + viewH - 30) {
      container.scrollTo({
        top: Math.max(0, itemTop - viewH / 2 + item.clientHeight / 2),
        behavior: 'smooth',
      });
    }
  }
}, [effectiveActiveId]);
```

---

## 8. Multi-User LocalStorage Isolation (Cách Ly Dữ Liệu Theo UID)

### 🟢 Nguyên Tắc Thực Hiện:
- Key lưu trữ: `${BASE_KEY}_${uid || 'guest'}`.
- Khi người dùng đăng nhập tài khoản khác hoặc chuyển sang chế độ Khách, dữ liệu hoàn toàn độc lập, không bị ghi đè hay lộ lẫn nhau.
