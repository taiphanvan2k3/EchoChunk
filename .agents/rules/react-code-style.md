# React Code Style & Component Architecture Conventions

> [!IMPORTANT]
> **QUY TẮC BẮT BUỘC KHI VIẾT REACT / NEXT.JS COMPONENTS**
> 1. **Dùng Function Component:** Luôn khai báo component dạng `export function ComponentName({ prop1, prop2 }: ComponentProps) { ... }`.
>    - **TUYỆT ĐỐI KHÔNG DÙNG:** `export const ComponentName: React.FC<ComponentProps> = (...) => { ... }`.
> 2. **Dùng Named Imports cho React Hooks & Types:**
>    - Luôn import trực tiếp từ `'react'`: `useCallback`, `useState`, `useEffect`, `useRef`, `useMemo`, `FormEvent`, `MouseEvent`, `ChangeEvent`, `RefObject`...
>    - **TUYỆT ĐỐI HẠN CHẾ:** Không gọi qua namespace `React.` (ví dụ: `React.FC`, `React.useCallback`, `React.useState`, `React.FormEvent`...).
> 3. **Tối Đa 1 Component Mỗi File `.tsx` (One Component Per File):**
>    - **TUYỆT ĐỐI KHÔNG:** Khai báo 2 hoặc nhiều component trong cùng 1 file `.tsx` (kể cả sub-component, item row, helper modal, card con...).
>    - **QUY CHUẨN:** Tách riêng mỗi component con/row thành một file `.tsx` độc lập (ví dụ: tách `SentenceRow.tsx` ra khỏi `SentenceList.tsx`, tách `TopicDropdown.tsx` & `ExampleCard.tsx` ra khỏi `ChunkModal.tsx`).

---

## 1. Chuẩn khai báo Component

### ✅ ĐÚNG (Function Component + Named Imports):
```tsx
import { useState, useCallback, useRef, FormEvent } from 'react';

interface UserCardProps {
  userId: string;
  onSelect: (id: string) => void;
}

export function UserCard({ userId, onSelect }: UserCardProps) {
  const [isActive, setIsActive] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSubmit = useCallback((e: FormEvent) => {
    e.preventDefault();
    onSelect(userId);
  }, [userId, onSelect]);

  return (
    <div ref={containerRef} onClick={handleSubmit}>
      {/* ... */}
    </div>
  );
}
```

### ❌ KHÔNG DÙNG (Arrow Function với React.FC & React.*):
```tsx
import React from 'react';

// ❌ Tránh dùng React.FC và arrow function cho Component
export const UserCard: React.FC<UserCardProps> = ({ userId, onSelect }) => {
  const [isActive, setIsActive] = React.useState(false); // ❌ Tránh React.useState
  const handleClick = React.useCallback((e: React.FormEvent) => {}, []); // ❌ Tránh React.useCallback

  return <div onClick={handleClick}>...</div>;
};
```

---

## 2. Lý do & Lợi ích
1. **Tự nhiên & Tinh gọn (Idiomatic React):** Cộng đồng React và core team đã khuyến nghị từ bỏ `React.FC` từ nhiều năm (do vấn đề ngầm định `children`, boilerplate rườm rà, và khó đọc stack trace trong React DevTools).
2. **Stack Trace rõ ràng:** `function ComponentName` hiển thị tên hàm tường minh ngay lập tức trong Error Stack Trace và React DevTools Profiler, không bị ẩn danh.
3. **Tree-shaking & Tối ưu Bundle:** Import tường minh các named functions và types giúp bundler (Turbopack, Webpack, PostCSS) tối ưu hóa static analysis.
4. **Nhất quán toàn codebase:** Mọi component trong `src/components/` đều tuân theo đúng 1 quy chuẩn duy nhất.
