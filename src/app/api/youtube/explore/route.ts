import { NextResponse } from 'next/server';
import { getTranscribedVideosList } from '@/lib/firebase/firestore/youtubeTranscript';

export const revalidate = 60;

export async function GET() {
  try {
    const videos = await getTranscribedVideosList(24);
    return NextResponse.json(
      { success: true, videos },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (error) {
    console.warn('Error in /api/youtube/explore:', error);
    return NextResponse.json({ success: true, videos: [] });
  }
}

