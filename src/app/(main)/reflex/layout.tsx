import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Luyện Phản Xạ Nói Tiếng Anh 5 Giây',
  description:
    'Rèn luyện phản xạ bật câu nói tiếng Anh tức thì trong 5 giây mà không cần dịch nhẩm trong đầu với phương pháp Quick Reflex Drill.',
  alternates: {
    canonical: '/phan-xa',
  },
  openGraph: {
    title: 'Luyện Phản Xạ Nói Tiếng Anh 5 Giây | EchoChunk',
    description:
      'Rèn luyện phản xạ bật câu nói tiếng Anh tức thì trong 5 giây không cần dịch nhẩm trong đầu.',
    url: '/phan-xa',
  },
};

export default function ReflexLayout({ children }: { children: React.ReactNode }) {
  return children;
}
