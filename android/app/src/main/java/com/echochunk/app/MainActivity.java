package com.echochunk.app;

import android.app.Dialog;
import android.os.Bundle;
import android.os.Message;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

// Kế thừa từ lớp cha của Capacitor, không phải lớp cha gốc của Android
// Lớp này là cầu nối giữa ứng dụng Android và Capacitor
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // 1. Khởi tạo vòng đời Activity và thiết lập nền tảng cầu nối (Bridge) của Capacitor
        super.onCreate(savedInstanceState);

        // 2. Mở cổng gỡ lỗi từ xa: Cho phép mở trình duyệt máy tính gõ chrome://inspect để soi F12 Console/Network
        WebView.setWebContentsDebuggingEnabled(true);

        // 3. Lấy đối tượng WebView chính hiển thị trang web EchoChunk
        WebView webView = getBridge().getWebView();
        
        if (webView != null) {
            WebSettings settings = webView.getSettings();

            // Cho phép tự động phát âm thanh (audio nghe phát âm) mà không bắt buộc người dùng phải chạm tay vào màn hình
            settings.setMediaPlaybackRequiresUserGesture(false);

            // Bật bộ nhớ lưu trữ web (LocalStorage, SessionStorage, IndexedDB)
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);

            // Bật JavaScript và cho phép mở cửa sổ popup tự động
            settings.setJavaScriptEnabled(true);
            settings.setJavaScriptCanOpenWindowsAutomatically(true);

            // Cho phép mở nhiều cửa sổ (bắt buộc phải bật để mở được popup Đăng nhập Google)
            settings.setSupportMultipleWindows(true);

            // 4. Cấu hình Cookie: Cho phép nhận Cookie bên thứ ba (Google / Firebase) để không bị mất phiên đăng nhập
            CookieManager cookieManager = CookieManager.getInstance();
            cookieManager.setAcceptCookie(true);
            cookieManager.setAcceptThirdPartyCookies(webView, true);

            // 5. Cấu hình ChromeClient: Kế thừa BridgeWebChromeClient để giữ các tính năng Native (Micro, Plugin) của Capacitor
            webView.setWebChromeClient(new BridgeWebChromeClient(getBridge()) {
                
                // Bắt sự kiện khi trang web gọi lệnh window.open(...) (vd: bấm nút "Đăng nhập với Google")
                @Override
                public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
                    // Bước 5.1: Tạo gấp một WebView phụ để chứa trang đăng nhập Google
                    WebView popupWebView = new WebView(MainActivity.this);
                    WebSettings popupSettings = popupWebView.getSettings();
                    popupSettings.setJavaScriptEnabled(true);
                    popupSettings.setDomStorageEnabled(true);
                    popupSettings.setDatabaseEnabled(true);
                    popupSettings.setSupportMultipleWindows(true);
                    popupSettings.setJavaScriptCanOpenWindowsAutomatically(true);

                    // Bật Cookie cho WebView phụ để nhận token xác thực từ Google
                    CookieManager.getInstance().setAcceptCookie(true);
                    CookieManager.getInstance().setAcceptThirdPartyCookies(popupWebView, true);

                    // Bước 5.2: Tạo một Hộp thoại (Dialog) toàn màn hình phủ lên trên để hiển thị WebView phụ
                    Dialog dialog = new Dialog(MainActivity.this, android.R.style.Theme_DeviceDefault_Light_NoActionBar_Fullscreen);
                    dialog.setContentView(popupWebView, new ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                    ));
                    dialog.show();

                    // Bước 5.3: Lắng nghe khi Google đăng nhập xong và gọi window.close()
                    popupWebView.setWebChromeClient(new android.webkit.WebChromeClient() {
                        @Override
                        public void onCloseWindow(WebView window) {
                            dialog.dismiss(); // Tắt hộp thoại popup
                            window.destroy(); // Giải phóng bộ nhớ của WebView phụ
                        }
                    });

                    // Đảm bảo các chuyển hướng URL bên trong trang Google diễn ra bình thường trong popup
                    popupWebView.setWebViewClient(new WebViewClient() {
                        @Override
                        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                            return false;
                        }
                    });

                    // Nếu người dùng bấm phím Back/Hủy hộp thoại, giải phóng WebView phụ
                    dialog.setOnCancelListener(d -> popupWebView.destroy());

                    // Bước 5.4: Bàn giao luồng nạp trang Google vào WebView phụ và kích hoạt tải trang
                    ((WebView.WebViewTransport) resultMsg.obj).setWebView(popupWebView);
                    resultMsg.sendToTarget();
                    return true;
                }
            });
        }
    }
}
