import { NextRequest, NextResponse } from 'next/server';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

// Explicitly require Node.js runtime for Vercel serverless functions (msedge-tts requires WebSocket & Node streams)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// In-memory audio buffer cache to avoid re-synthesizing identical sentences
const audioCache = new Map<string, { buffer: Buffer; timestamp: number }>();
const MAX_CACHE_SIZE = 800;

async function synthesizeText(text: string, voice: string = 'en-US-JennyNeural', rate: number = 1.0) {
  const cleanText = text.replace(/[*_`]/g, '').trim();
  if (!cleanText) {
    return { error: 'Clean text is empty', status: 400 };
  }

  // Convert numeric rate multiplier (e.g. 0.75, 1.0) to prosody rate string (e.g. "-25%", "+0%")
  const ratePercent = Math.round((rate - 1.0) * 100);
  const rateStr = ratePercent >= 0 ? `+${ratePercent}%` : `${ratePercent}%`;

  const cacheKey = `${voice}:${rateStr}:${cleanText}`;

  // Return from in-memory cache if available
  if (audioCache.has(cacheKey)) {
    const cached = audioCache.get(cacheKey)!;
    return { buffer: cached.buffer, cacheHit: true };
  }

  // Synthesize using Microsoft Edge Neural TTS
  const tts = new MsEdgeTTS();
  await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

  const { audioStream } = await tts.toStream(cleanText, {
    rate: rateStr,
    pitch: '+0Hz',
  });

  const chunks: Buffer[] = [];

  await new Promise<void>((resolve, reject) => {
    audioStream.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });
    audioStream.on('end', () => {
      resolve();
    });
    audioStream.on('error', (err: Error) => {
      reject(err);
    });
  });

  const buffer = Buffer.concat(chunks);

  // Save to LRU in-memory cache
  if (audioCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = audioCache.keys().next().value;
    if (oldestKey) audioCache.delete(oldestKey);
  }
  audioCache.set(cacheKey, { buffer, timestamp: Date.now() });

  return { buffer, cacheHit: false };
}

function createAudioResponse(buffer: Buffer) {
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'audio/mpeg',
      'Content-Length': buffer.length.toString(),
      // Leverage Vercel Edge Network CDN caching
      'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400, immutable',
      'CDN-Cache-Control': 'public, max-age=31536000, immutable',
      'Vercel-CDN-Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}

// GET support allows Vercel Edge CDN to cache audio responses globally
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const text = searchParams.get('text');
    const voice = searchParams.get('voice') || 'en-US-JennyNeural';
    const rate = parseFloat(searchParams.get('rate') || '1.0');

    if (!text) {
      return NextResponse.json({ error: 'Text query parameter is required' }, { status: 400 });
    }

    const result = await synthesizeText(text, voice, isNaN(rate) ? 1.0 : rate);
    if ('error' in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return createAudioResponse(result.buffer!);
  } catch (error) {
    console.error('Edge TTS Synthesis GET Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'TTS synthesis failed' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, voice = 'en-US-JennyNeural', rate = 1.0 } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const result = await synthesizeText(text, voice, rate);
    if ('error' in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return createAudioResponse(result.buffer!);
  } catch (error) {
    console.error('Edge TTS Synthesis POST Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'TTS synthesis failed' },
      { status: 500 }
    );
  }
}
