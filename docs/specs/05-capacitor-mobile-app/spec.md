# Feature Specification: Physical Mobile App (Capacitor Native Shell, Notifications & Speech Adapter)

> **Feature:** Physical Mobile App Package (Capacitor Native Container, Hybrid Push/Local Notifications & Speech Engine Adapter)  
> **Version:** 1.0  
> **Date:** 2026-10-01  
> **Author:** Product & Engineering Team  
> **Spec ID:** `SPEC-05`  
> **Status:** APPROVED / READY FOR IMPLEMENTATION  
> **Target Platform:** Android (Phase 1) ➔ iOS (Phase 2)  
> **Format Standard:** 11-Part Industry Standard Feature Specification (*Anatomy of a Good Feature Spec*)  
> **Kế Hoạch Triển Khai:** [plan.md](plan.md)

---

## 🎯 1. Objective (Mục Tiêu)

Tại sao chúng ta xây dựng phiên bản Physical Mobile thay vì PWA đơn thuần?

- **Giải quyết bài toán thói quen & tỷ lệ giữ chân (Retention & Daily Streak):** 
  Người học tiếng Anh thường chỉ học khi có lời nhắc nhở trực quan trên màn hình điện thoại. PWA Web Push trên di động (đặc biệt là iOS Safari) có tỷ lệ hiển thị kém, bị giới hạn quyền chạy ngầm và không hiển thị icon badge. Việc đóng gói thành ứng dụng di động thực thụ (Physical Mobile App) cho phép tích hợp **Hệ thống thông báo đẩy chuẩn Native (Local Notifications & FCM)** rung chuông chính xác mỗi ngày.
- **Tối ưu quyền hạn phần cứng & Độ nhạy của Micro (Hardware Mic & Speech Stability):**
  Trình duyệt web di động thường xuyên thu hồi quyền truy cập Micro khi ngắt kết nối, gặp lỗi insecure context hoặc xung đột luồng nhận diện giọng nói (stutter/duplicate). Ứng dụng Native cho phép xin quyền Micro cấp hệ điều hành (`RECORD_AUDIO`) một lần duy nhất vĩnh viễn và sẵn sàng kích hoạt Native Speech Recognition plugin.
- **Tận dụng 100% mã nguồn Next.js 16 hiện có (Zero UI Rewrite Cost):**
  Sử dụng công nghệ **Capacitor Hosted Webview Shell** để biến toàn bộ giao diện Next.js 16, hệ thống Server Route Handlers (Edge Neural TTS, Google Gemini AI, YouTube InnerTube Proxy) thành app di động trong vài giờ, hỗ trợ cập nhật tính năng tức thì (Over-The-Air - OTA) qua Vercel mà không cần chờ duyệt Store mỗi lần sửa code.
- **Lộ trình tiết kiệm chi phí ($0 đầu tư ban đầu):**
  Xuất file `.apk` cài đặt trực tiếp lên điện thoại Android thật để kiểm thử và trải nghiệm ngay lập tức mà chưa cần tốn chi phí mở tài khoản Google Play Developer ($25) hay Apple Developer ($99/năm).

---

## 👤 2. User Story (Câu Chuyện Người Dùng)

> **Là một** người bận rộn đang tự rèn luyện phản xạ tiếng Anh qua các Speaking Chunks hàng ngày,  
> **Tôi muốn** cài đặt EchoChunk trực tiếp lên điện thoại Android như một ứng dụng độc lập có biểu tượng trên màn hình chính,  
> **Để** tôi nhận được thông báo nhắc nhở luyện 5 phút buổi sáng và ôn tập SRS vào buổi tối, đồng thời có thể bấm mic nói phản xạ mượt mà không bị trình duyệt web làm phiền về quyền micro.

---

## ✅ 3. Acceptance Criteria (Tiêu Chí Nghiệm Thu)

- [ ] **AC-1 (Capacitor Container Setup):**
  - Khởi tạo thành công cấu hình Capacitor với `appId: 'com.echochunk.app'`, `appName: 'EchoChunk'`, `webDir: 'public'`.
  - Sinh thành công thư mục native Android (`/android`) qua `@capacitor/android`.
- [ ] **AC-2 (Hosted URL & OTA Architecture):**
  - Cấu hình `capacitor.config.ts` ở chế độ Hosted URL trỏ tới domain production trên Vercel (`https://echochunk.vercel.app` hoặc IP dev LAN khi test cục bộ).
  - Giữ nguyên 100% chức năng của Server Routes (`/api/tts`, `/api/gemini`, `/api/youtube/*`) mà không cần chuyển đổi sang Static Export.
  - Các chỉnh sửa giao diện web khi deploy lên Vercel tự động cập nhật ngay trên điện thoại mà không cần build lại APK.
- [ ] **AC-3 (Hardware Permissions - Android):**
  - Khai báo đầy đủ các quyền trong `android/app/src/main/AndroidManifest.xml`:
    - `android.permission.RECORD_AUDIO`: Quyền ghi âm micro cho Shadowing & Reflex.
    - `android.permission.MODIFY_AUDIO_SETTINGS`: Quản lý luồng âm thanh.
    - `android.permission.POST_NOTIFICATIONS`: Quyền hiển thị thông báo trên Android 13+ (API 33+).
    - `android.permission.INTERNET`: Quyền kết nối mạng.
- [ ] **AC-4 (Hệ thống Thông Báo Hẹn Giờ Local Notifications):**
  - Tích hợp `@capacitor/local-notifications` chạy 100% offline trên thiết bị không phụ thuộc vào server hay chi phí mạng:
    - **7:00 AM:** Chuông nhắc thói quen buổi sáng *"🌅 5 phút khởi động: Luyện nhanh 3 câu Speaking Chunks hôm nay để giữ chuỗi streak!"*.
    - **20:00 PM:** Chuông nhắc ôn tập *"🌙 Giờ vàng Spaced Repetition: Bạn có các câu cần ôn tập trước khi đi ngủ!"*.
  - Hỗ trợ lưu trữ cấu hình bật/tắt giờ nhắc và cập nhật lịch hẹn giờ trên máy.
- [ ] **AC-5 (Cổng Kết Nối Remote Push - FCM Ready):**
  - Tích hợp sẵn module nhận token Push từ Firebase Cloud Messaging (`@capacitor/push-notifications`) để sẵn sàng nhận thông báo động khi chia sẻ Deck hoặc cập nhật hệ thống.
- [ ] **AC-6 (Kiến Trúc Speech Engine 2 Tầng):**
  - Xây dựng tầng trung gian `SpeechAdapter`:
    - Khi chạy trên trình duyệt Web (Desktop/Laptop): Tiếp tục sử dụng `Web Speech API` (`speech.ts`).
    - Khi chạy trong Capacitor Native: Tự động điều phối và cấp quyền micro trực tiếp, tương thích tốt với phần cứng di động.
- [ ] **AC-7 (Trải Nghiệm Màn Hình Di Động & Safe Area Insets):**
  - Giao diện tự động căn chỉnh khoảng đệm an toàn (`safe-area-inset-top`, `safe-area-inset-bottom`) để không bị che khuất bởi tai thỏ (Notch), Dynamic Island hay thanh điều hướng vuốt của Android.
  - Thanh cuộn và thanh điều hướng dưới đáy (Bottom Navigation) hoạt động êm ái, thân thiện với ngón tay cái.
- [ ] **AC-8 (Build & Test APK Thành Công):**
  - Biên dịch thành công file `app-debug.apk` qua Android Studio hoặc lệnh Gradle.
  - Cài đặt và hoạt động ổn định trên điện thoại Android vật lý.

---

## 🎨 4. UI / UX (Thiết Kế Giao Diện & Trải Nghiệm Mobile)

### 4.1. Triết lý thẩm mỹ Notion Clean Light trên Mobile
- Nền trắng tinh khiết `#ffffff`, các đường viền nhẹ `rgba(55, 53, 47, 0.08)`.
- Không gian hiển thị tối ưu cho màn hình cảm ứng: Các nút bấm (Tap Targets) có chiều cao tối thiểu 44px để dễ dàng chạm bằng ngón tay cái.
- Biểu tượng ứng dụng (App Icon) mang phong cách tối giản: Chữ `EC` cách điệu kèm biểu tượng sóng âm thanh phát âm.

### 4.2. Modal Cài Đặt Thông Báo (Notification Settings Modal)

Người dùng có thể chủ động tùy chỉnh giờ nhắc nhở trong ứng dụng:

```text
+-------------------------------------------------------+
|  🔔 Cài Đặt Nhắc Nhở Học Tập                     [✕]  |
+-------------------------------------------------------+
|                                                       |
|  🌅 Nhắc nhở buổi sáng (Morning 5-Min)                |
|     Giúp rèn phản xạ đầu ngày không mất streak        |
|     [ Gạt Bật / Tắt: ON ]        [ Giờ: 07:00 AM ]    |
|                                                       |
|  ---------------------------------------------------  |
|                                                       |
|  🌙 Ôn tập tối (Evening SRS Due)                      |
|     Nhắc nhở ôn lại các câu đến hạn Spaced Repetition |
|     [ Gạt Bật / Tắt: ON ]        [ Giờ: 20:00 PM ]    |
|                                                       |
|  ---------------------------------------------------  |
|                                                       |
|  📢 Trạng thái quyền thông báo: 🟢 Đã cấp phép        |
|                                                       |
|  [ Lưu Lịch Hẹn Giờ ]                                 |
+-------------------------------------------------------+
```

### 4.3. Xử lý khoảng an toàn tràn viền (Mobile Safe Area)
Trong `src/app/globals.css`, bổ sung biến CSS hỗ trợ thiết bị di động:
```css
:root {
  --sat: env(safe-area-inset-top, 0px);
  --sab: env(safe-area-inset-bottom, 0px);
  --sal: env(safe-area-inset-left, 0px);
  --sar: env(safe-area-inset-right, 0px);
}

body {
  padding-top: var(--sat);
  padding-bottom: var(--sab);
}
```

---

## 🔌 5. API & Service Contract (Hợp Đồng Dịch Vụ)

### 5.1. File Cấu Hình Capacitor (`capacitor.config.ts`)

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.echochunk.app',
  appName: 'EchoChunk',
  webDir: 'public',
  bundledWebRuntime: false,
  server: {
    // URL Production hoặc ngrok/LAN khi phát triển
    url: 'https://echochunk.vercel.app',
    cleartext: true,
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#37352f',
      sound: 'beep.wav',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
```

### 5.2. Service Quản Lý Thông Báo (`src/lib/client/notifications.ts`)

```typescript
export interface NotificationScheduleConfig {
  morningEnabled: boolean;
  morningTime: string; // "07:00"
  eveningEnabled: boolean;
  eveningTime: string; // "20:00"
}

export interface NotificationServiceContract {
  isSupported(): boolean;
  checkPermission(): Promise<'granted' | 'denied' | 'prompt'>;
  requestPermission(): Promise<boolean>;
  scheduleDailyHabitReminders(config: NotificationScheduleConfig): Promise<void>;
  cancelAllReminders(): Promise<void>;
}
```

### 5.3. Cấu hình Quyền Native Android (`android/app/src/main/AndroidManifest.xml`)

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <!-- Internet & Network -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <!-- Audio & Microphone Recording -->
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />

    <!-- Native Notifications (Android 13+) -->
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
</manifest>
```

---

## 🛡️ 6. Error Handling (Xử Lý Lỗi Ngoại Lệ)

| Tình huống lỗi | Nguyên nhân | Cơ chế xử lý của ứng dụng |
| :--- | :--- | :--- |
| **Người dùng từ chối quyền Micro** | Bấm nhầm "Từ chối" hoặc quyền bị tắt trong cài đặt Android. | Hiển thị Dialog thông báo thân thiện: *"EchoChunk cần quyền Micro để chấm điểm phát âm. Bấm vào đây để mở Cài đặt ứng dụng và cấp quyền."* |
| **Người dùng từ chối quyền Thông báo** | Chọn "Không cho phép" khi hệ điều hành hỏi quyền `POST_NOTIFICATIONS`. | Vẫn cho phép học bình thường, nhưng hiển thị banner cảnh báo nhắc nhở chuỗi streak sẽ không thể rung chuông nếu tắt thông báo. |
| **Mất kết nối Internet khi mở App** | Mở app trên ô tô hoặc khu vực sóng yếu khi đang tải Hosted URL. | Hiển thị màn hình fallback Offline trang nhã kèm nút "Thử lại", cho phép truy cập các chunk đã cache trong bộ nhớ IndexedDB của Firestore. |
| **Khởi động lại điện thoại (Reboot)** | Thiết bị tắt nguồn làm mất lịch hẹn tạm thời trong memory. | Nhờ quyền `RECEIVE_BOOT_COMPLETED`, Capacitor Local Notifications tự động đăng ký lại toàn bộ lịch hẹn 7h và 20h ngay sau khi khởi động xong. |

---

## 🔍 7. Edge Cases (Các Trường Hợp Biên)

1. **Người dùng thay đổi Múi giờ (Change Timezone):**
   - Khi người dùng đi du lịch hoặc đổi múi giờ, lịch Local Notification có thể bị lệch. 
   - *Giải pháp:* Mỗi khi app mở lên (`appStateChange: active`), hệ thống tự động kiểm tra múi giờ hiện tại và tái đăng ký (reschedule) lại lịch nhắc 7h/20h theo múi giờ địa phương mới nhất.
2. **App bị đóng hoàn toàn (Force Stop / Task Killer):**
   - Hệ điều hành Android có thể đóng tiến trình webview.
   - *Giải pháp:* `@capacitor/local-notifications` sử dụng `AlarmManager` của Android nên chuông báo thức vẫn kích hoạt đúng giờ ngay cả khi app không chạy. Khi người dùng nhấn vào thông báo, hệ điều hành sẽ khởi động lại app và mở màn hình luyện tập.
3. **Màn hình xoay ngang (Landscape Mode):**
   - Mặc định khóa hướng màn hình theo chiều dọc (Portrait) trong `AndroidManifest.xml` (`android:screenOrientation="portrait"`) để đảm bảo bố cục phòng luyện tập không bị vỡ.

---

## 📱 8. UI States (Các Trạng Thái Giao Diện)

- **Trạng thái Môi Trường Web vs Native:**
  - Nếu `Capacitor.isNativePlatform() === true`: Ẩn nút "Thêm vào màn hình chính / Install PWA" trên Navbar vì người dùng đã đang sử dụng app native thật.
  - Kích hoạt menu "Cài đặt thông báo điện thoại" trong trang cá nhân.
- **Trạng thái Cấp Quyền Thông Báo:**
  - `prompt`: Hiển thị nút "Bật thông báo nhắc học".
  - `granted`: Hiển thị biểu tượng chuông xanh kèm thời gian hẹn giờ tiếp theo.
  - `denied`: Hiển thị icon cảnh báo màu hổ phách kèm nút dẫn đến Cài đặt máy.

---

## 🧪 9. Test Cases (Kịch Bản Kiểm Thử Chi Tiết)

### TC-1: Kiểm tra Cấp Quyền Micro trên Thiết Bị Thật
1. Cài đặt file `app-debug.apk` lên điện thoại Android.
2. Mở app lần đầu, chọn chế độ **Shadowing Lab**.
3. Bấm vào nút Micro 🎙️.
4. **Kết quả mong đợi:** Hộp thoại hệ thống Android hiển thị: *"Cho phép EchoChunk ghi âm?"*. Khi chọn *"Trong khi dùng ứng dụng"*, micro bắt đầu thu âm ngay lập tức và sóng âm thanh hiển thị mượt mà.

### TC-2: Kiểm tra Hẹn Giờ Thông Báo Chuỗi Streak (Local Notification)
1. Mở Cài đặt thông báo trong app, chọn giờ nhắc nhở sau thời điểm hiện tại 2 phút.
2. Nhấn nút "Lưu Lịch Hẹn Giờ".
3. Tắt màn hình điện thoại (khóa máy).
4. **Kết quả mong đợi:** Sau 2 phút, điện thoại rung chuông và màn hình khóa sáng lên với thông báo: *"🌅 5 phút khởi động: Luyện nhanh 3 câu Speaking Chunks hôm nay..."*. Nhấp vào thông báo sẽ mở thẳng ứng dụng EchoChunk.

### TC-3: Kiểm tra Cập Nhật Tức Thì (Over-The-Air OTA)
1. Đang mở app trên điện thoại.
2. Thực hiện thay đổi 1 dòng chữ trên web và đẩy commit lên Vercel.
3. Vuốt nhẹ tải lại hoặc mở lại app trên điện thoại.
4. **Kết quả mong đợi:** Giao diện mới hiển thị ngay lập tức mà không cần gỡ app ra cài lại file APK mới.

---

## 🏆 10. Definition of Done (Định Nghĩa Hoàn Thành)

- [ ] Cấu hình Capacitor hoàn chỉnh và sinh thành công thư mục Android (`/android`).
- [ ] File `AndroidManifest.xml` chứa đầy đủ các quyền: `RECORD_AUDIO`, `POST_NOTIFICATIONS`, `SCHEDULE_EXACT_ALARM`.
- [ ] Module `notifications.ts` được tích hợp, cung cấp API hẹn giờ 7h sáng & 20h tối.
- [ ] Đã thêm hỗ trợ CSS Safe Area Insets trong `globals.css`.
- [ ] Biên dịch thành công file APK (`app-debug.apk`) và xác nhận hoạt động ổn định trên điện thoại Android vật lý.
- [ ] Tài liệu đặc tả `SPEC-05` được lưu trữ tại `docs/specs/05-capacitor-mobile-app/spec.md` và liên kết trong `docs/specs/README.md`.

---

## 🚫 11. Out of Scope (Ngoài Phạm Vi Giai Đoạn 1)

- **Phát hành lên Apple App Store:** Chưa triển khai trong giai đoạn 1 (yêu cầu máy tính macOS có Xcode và tài khoản Apple Developer $99/năm). Sẽ thực hiện ở Giai đoạn 2 sau khi hoàn thiện trên Android.
- **Hệ thống thanh toán trong ứng dụng (In-App Purchases / Google Play Billing):** Chưa tích hợp mua gói trả phí trong app.
- **Biết viết lại UI bằng React Native / Flutter:** Không thực hiện để tránh lãng phí thời gian và phân mảnh mã nguồn.
