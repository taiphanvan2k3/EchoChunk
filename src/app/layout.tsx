import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono, Lora } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { PracticeProvider } from "@/context/PracticeContext";
import { Navbar } from "@/components/Navbar";
import { PracticeModals } from "@/components/PracticeModals";
import { getBaseUrl } from "@/lib/shared/site";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap"
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jetbrains",
  display: "swap"
});

const lora = Lora({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-lora",
  display: "swap"
});

const BASE_URL = getBaseUrl();

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "EchoChunk - Học Nói Tiếng Anh Theo Cụm (Speaking Chunks Fluency Engine)",
    template: "%s | EchoChunk"
  },
  description:
    "Nền tảng luyện nói tiếng Anh giao tiếp phản xạ tự nhiên theo phương pháp Speaking Chunks, Shadowing nhại giọng chuẩn Mỹ, phản xạ 5 giây và Spaced Repetition thông minh.",
  keywords: [
    "EchoChunk",
    "học tiếng anh giao tiếp",
    "speaking chunks",
    "luyện nói tiếng anh",
    "shadowing tiếng anh",
    "phản xạ tiếng anh 5 giây",
    "spaced repetition tiếng anh",
    "cụm từ tiếng anh giao tiếp",
    "phát âm tiếng anh chuẩn mỹ",
    "từ điển ipa"
  ],
  authors: [{ name: "EchoChunk Team", url: BASE_URL }],
  creator: "EchoChunk",
  publisher: "EchoChunk",
  formatDetection: {
    email: false,
    address: false,
    telephone: false
  },
  alternates: {
    canonical: "/"
  },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: BASE_URL,
    siteName: "EchoChunk",
    title: "EchoChunk - Luyện Nói Tiếng Anh Giao Tiếp Theo Cụm Đột Phá",
    description:
      "Luyện nói tiếng Anh phản xạ tự nhiên với phương pháp Speaking Chunks, Voice Shadowing AI và Spaced Repetition.",
    images: [
      {
        url: "/demo-shadowing.png",
        width: 1200,
        height: 630,
        alt: "EchoChunk - Speaking Chunks Fluency Engine"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "EchoChunk - Luyện Nói Tiếng Anh Theo Cụm (Speaking Chunks)",
    description: "Tự tin giao tiếp tiếng Anh trôi chảy với phương pháp Shadowing và Flashcard phản xạ 5s thông minh.",
    images: ["/demo-shadowing.png"]
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "32x32" }
    ],
    apple: "/icon.svg"
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1
    }
  }
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "EchoChunk",
  alternateName: "EchoChunk Speaking Engine",
  url: BASE_URL,
  applicationCategory: "EducationalApplication",
  operatingSystem: "All",
  inLanguage: ["vi", "en"],
  description:
    "Ứng dụng luyện nói tiếng Anh giao tiếp thông minh theo phương pháp Speaking Chunks, Voice Shadowing, Phản xạ 5 giây và Spaced Repetition.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "VND"
  },
  featureList: [
    "Luyện nói Shadowing nhại giọng bản ngữ",
    "Luyện phản xạ nói 5 giây",
    "Luyện nghe & điền từ vào chỗ trống",
    "Kho 500+ Speaking Chunks phân cấp độ",
    "Học tiếng Anh qua video YouTube với phụ đề Karaoke"
  ]
};

import { getInitialServerData } from "@/lib/server/practiceData";

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { initialUser, initialPracticeData } = await getInitialServerData();

  return (
    <html
      lang="vi"
      className={`${plusJakartaSans.variable} ${jetbrainsMono.variable} ${lora.variable}`}
      suppressHydrationWarning
    >
      <body suppressHydrationWarning>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <AuthProvider initialUser={initialUser}>
          <PracticeProvider initialData={initialPracticeData}>
            <div className="flex flex-col min-h-screen bg-white">
              <Navbar />
              <main className="flex-1 w-full max-w-[1120px] mx-auto px-3 sm:px-6 pt-3.5 sm:pt-4 pb-5 has-[.yt-study-room-container]:max-w-[1440px] has-[.yt-study-room-container]:px-3 sm:has-[.yt-study-room-container]:px-8 has-[.yt-study-room-container]:pt-4 sm:has-[.yt-study-room-container]:pt-5 has-[.yt-study-room-container]:pb-16 has-[.yt-page-wrapper]:max-w-[1440px] has-[.yt-page-wrapper]:px-3 sm:has-[.yt-page-wrapper]:px-8 has-[.yt-page-wrapper]:pt-4 sm:has-[.yt-page-wrapper]:pt-5 has-[.yt-page-wrapper]:pb-16 has-[.explorer-fullwidth-wrapper]:max-w-none has-[.explorer-fullwidth-wrapper]:p-0">
                {children}
              </main>
              <PracticeModals />
            </div>
          </PracticeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
