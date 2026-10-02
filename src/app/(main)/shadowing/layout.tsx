import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Luyện Nói Shadowing Tiếng Anh Theo Cụm',
  description:
    'Luyện nói Shadowing chuẩn ngữ điệu người bản xứ với giọng đọc chuẩn Mỹ, phiên âm IPA chi tiết và hệ thống chấm điểm thông minh.',
  alternates: {
    canonical: '/luyen-noi',
  },
  openGraph: {
    title: 'Luyện Nói Shadowing Tiếng Anh Theo Cụm | EchoChunk',
    description:
      'Luyện nói Shadowing chuẩn ngữ điệu người bản xứ với giọng đọc chuẩn Mỹ và phiên âm IPA chi tiết.',
    url: '/luyen-noi',
  },
};

export default function ShadowingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
