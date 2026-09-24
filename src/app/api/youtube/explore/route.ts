import { NextRequest, NextResponse } from 'next/server';
import { getTranscribedVideosList } from '@/lib/client/firebase/firestore/youtubeTranscript';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = parseInt(searchParams.get('limit') || '12', 10);
    const limit = Math.min(Math.max(isNaN(limitParam) ? 12 : limitParam, 1), 30);

    const cursorParam = searchParams.get('cursor');
    const cursor = cursorParam ? parseInt(cursorParam, 10) : null;

    const result = await getTranscribedVideosList(limit, cursor);

    return NextResponse.json(
      {
        success: true,
        videos: result.videos,
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
        },
      }
    );
  } catch (error) {
    console.warn('Error in /api/youtube/explore:', error);
    return NextResponse.json({ success: true, videos: [], nextCursor: null, hasMore: false });
  }
}


