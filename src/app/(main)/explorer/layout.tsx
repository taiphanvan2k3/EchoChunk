import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kho 500+ Cụm Từ Giao Tiếp Tiếng Anh (Speaking Chunks)',
  description:
    'Khám phá hơn 500 cụm từ tiếng Anh giao tiếp thông dụng nhất chia theo chủ đề: Công sở, Đời sống, Du lịch, Thuyết trình kèm phiên âm IPA chuẩn Mỹ.',
  alternates: {
    canonical: '/kho-tu-vung',
  },
  openGraph: {
    title: 'Kho 500+ Cụm Từ Giao Tiếp Tiếng Anh (Speaking Chunks) | EchoChunk',
    description:
      'Khám phá hơn 500 cụm từ tiếng Anh giao tiếp thông dụng nhất chia theo chủ đề kèm phiên âm IPA chuẩn Mỹ.',
    url: '/kho-tu-vung',
  },
};

export default function ExplorerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
