import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Luyện Nghe & Điền Từ Vào Chỗ Trống',
  description:
    'Thử thách nghe hiểu câu tiếng Anh thực tế và điền cụm Speaking Chunk chính xác vào chỗ trống, củng cố phản xạ ghi nhớ ngữ cảnh.',
  alternates: {
    canonical: '/dien-tu',
  },
  openGraph: {
    title: 'Luyện Nghe & Điền Từ Vào Chỗ Trống | EchoChunk',
    description:
      'Thử thách nghe hiểu câu tiếng Anh thực tế và điền cụm Speaking Chunk chính xác vào chỗ trống.',
    url: '/dien-tu',
  },
};

export default function BlanksLayout({ children }: { children: React.ReactNode }) {
  return children;
}
