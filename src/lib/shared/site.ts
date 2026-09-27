/**
 * Lấy Base URL của ứng dụng theo thứ tự ưu tiên:
 * 1. NEXT_PUBLIC_SITE_URL hoặc NEXT_PUBLIC_APP_URL (biến tuỳ chỉnh trong .env)
 * 2. VERCEL_PROJECT_PRODUCTION_URL (domain chính trên Vercel: e.g. speaking-english.taiphanvan.id.vn)
 * 3. VERCEL_URL (domain nhánh/preview trên Vercel: e.g. echochunk-abc.vercel.app)
 * 4. Fallback: localhost khi phát triển hoặc domain mặc định khi chạy production
 */
export function getBaseUrl(): string {
  console.log({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
    VERCEL_URL: process.env.VERCEL_URL,
    NODE_ENV: process.env.NODE_ENV
  });

  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }

  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000";
  }

  return "https://speaking-english.taiphanvan.id.vn";
}
