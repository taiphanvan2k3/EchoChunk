import { NextRequest, NextResponse } from 'next/server';
import { getYouTubeTranscript } from '@/server/services/youtube.service';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const urlOrId = searchParams.get('v') || searchParams.get('url');

  if (!urlOrId) {
    return NextResponse.json(
      { success: false, error: 'Thiếu tham số video "v" hoặc "url".' },
      { status: 400 }
    );
  }

  try {
    const data = await getYouTubeTranscript(urlOrId);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi khi tải phụ đề.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
