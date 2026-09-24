import { Metadata } from 'next';
import { YouTubeStudyRoom } from '@/components/youtube/YouTubeStudyRoom';

export const metadata: Metadata = {
  title: 'Học tiếng Anh qua YouTube | EchoChunk',
  description:
    'Luyện Shadowing, phản xạ phát âm và bắt nối âm trực tiếp từ video YouTube yêu thích với phụ đề Karaoke thời gian thực.',
};

export default function YouTubePage() {
  return (
    <div className="yt-page-wrapper">
      <YouTubeStudyRoom />
    </div>
  );
}
