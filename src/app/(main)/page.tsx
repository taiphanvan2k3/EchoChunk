import type { Metadata } from "next";
import ShadowingPage from "./shadowing/page";

export const metadata: Metadata = {
  title: "Học Nói Tiếng Anh Theo Cụm - Luyện Phản Xạ & Shadowing AI",
  description:
    "Luyện nói tiếng Anh giao tiếp chuẩn ngữ điệu bản xứ theo phương pháp Speaking Chunks, Voice Shadowing và Spaced Repetition thông minh.",
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "EchoChunk - Luyện Nói Tiếng Anh Giao Tiếp Theo Cụm",
    description:
      "Luyện nói tiếng Anh phản xạ tự nhiên theo phương pháp Speaking Chunks, Voice Shadowing và Spaced Repetition.",
    url: "/"
  }
};

export default function RootPage() {
  return <ShadowingPage />;
}
