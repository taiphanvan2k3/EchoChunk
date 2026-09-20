import { NextRequest, NextResponse } from 'next/server';
import { saveEnrichedIpa, getEnrichedIpaSync, isEnrichedCacheReady } from '@/lib/firebase/firestore/ipaEnriched';

/**
 * POST /api/enrich-ipa
 * Body: { word: string; ipa: string }
 *
 * Saves a runtime-discovered IPA entry to Firestore.
 * Works in both dev and production (no filesystem writes).
 */
export async function POST(req: NextRequest) {
  try {
    const { word, ipa } = (await req.json()) as { word?: string; ipa?: string };

    if (!word || !ipa) {
      return NextResponse.json({ ok: false, error: 'Missing word or ipa' }, { status: 400 });
    }

    const clean = word.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    const cleanIpa = ipa.replace(/^\/+|\/+$/g, '').trim();

    if (!clean || !cleanIpa) {
      return NextResponse.json({ ok: false, error: 'Invalid input' }, { status: 400 });
    }

    const status = await saveEnrichedIpa(clean, cleanIpa);
    return NextResponse.json({ ok: true, status, word: clean, ipa: cleanIpa });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

/**
 * GET /api/enrich-ipa?word=sailing
 * Returns the enriched IPA for a word (dev utility / debugging).
 */
export async function GET(req: NextRequest) {
  const word = req.nextUrl.searchParams.get('word') ?? '';
  const clean = word.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
  const ipa = clean ? getEnrichedIpaSync(clean) : '';

  return NextResponse.json({
    word: clean,
    ipa: ipa || null,
    cacheReady: isEnrichedCacheReady(),
  });
}
