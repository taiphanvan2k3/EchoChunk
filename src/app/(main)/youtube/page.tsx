import { Metadata } from 'next';
import { YouTubeStudyRoom } from '@/components/youtube/YouTubeStudyRoom';

export const metadata: Metadata = {
  title: 'Học Tiếng Anh Qua Video YouTube với Phụ Đề Karaoke',
  description:
    'Luyện Shadowing, phản xạ phát âm và bắt nối âm trực tiếp từ video YouTube yêu thích với phụ đề Karaoke song ngữ thời gian thực.',
  alternates: {
    canonical: '/youtube',
  },
  openGraph: {
    title: 'Học Tiếng Anh Qua Video YouTube với Phụ Đề Karaoke | EchoChunk',
    description:
      'Luyện Shadowing, phản xạ phát âm và bắt nối âm trực tiếp từ video YouTube yêu thích với phụ đề Karaoke song ngữ.',
    url: '/youtube',
  },
};

export default function YouTubePage() {
  return (
    <div className="yt-page-wrapper">
      <YouTubeStudyRoom />
    </div>
  );
}
