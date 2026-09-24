/**
 * Firestore-backed IPA enrichment store.
 *
 * Collection: ipa_enriched
 * Document ID: the cleaned word (e.g. "sailing")
 * Fields: { ipa: string, addedAt: Timestamp }
 *
 * In-memory cache is loaded once per server process and shared across requests.
 * Writes go directly to Firestore — works in both dev and production.
 */

import { db } from '@/lib/client/firebase/config';
import {
  collection,
  doc,
  setDoc,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';

const COLLECTION = 'ipa_enriched';

/** Module-level in-memory mirror — loaded once, O(1) lookups */
let memCache: Map<string, string> | null = null;
let loadPromise: Promise<void> | null = null;

/**
 * Load all enriched IPA entries from Firestore into memory.
 * Subsequent calls return immediately (already loaded).
 */
async function ensureLoaded(): Promise<void> {
  if (memCache !== null) return;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    memCache = new Map();
    try {
      const snap = await getDocs(collection(db, COLLECTION));
      snap.forEach((d) => {
        const data = d.data() as { ipa?: string };
        if (data.ipa) memCache!.set(d.id, data.ipa);
      });
    } catch (err) {
      console.error('[ipa-enriched] Failed to load from Firestore:', err);
    }
  })();

  return loadPromise;
}

/**
 * Look up an enriched IPA entry from the in-memory cache.
 * Returns the raw IPA string (no slashes) or empty string if not found.
 */
export async function getEnrichedIpa(word: string): Promise<string> {
  await ensureLoaded();
  return memCache?.get(word) ?? '';
}

/**
 * Look up synchronously — only works after ensureLoaded() has been awaited.
 * Used by getAmericanIpa() which is synchronous.
 */
export function getEnrichedIpaSync(word: string): string {
  return memCache?.get(word) ?? '';
}

/** Returns true if the in-memory cache has been initialized. */
export function isEnrichedCacheReady(): boolean {
  return memCache !== null;
}

/** Kicks off background loading (fire-and-forget). */
export function prefetchEnrichedIpa(): void {
  void ensureLoaded();
}

/**
 * Save a new IPA entry to Firestore and update the in-memory cache.
 * No-op if the word already exists in cache.
 * Returns 'added' | 'already_exists'.
 */
export async function saveEnrichedIpa(
  word: string,
  ipa: string
): Promise<'added' | 'already_exists'> {
  await ensureLoaded();

  const clean = word.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
  const cleanIpa = ipa.replace(/^\/+|\/+$/g, '').trim();

  if (!clean || !cleanIpa) return 'already_exists';
  if (memCache!.has(clean)) return 'already_exists';

  // Optimistic update in memory first
  memCache!.set(clean, cleanIpa);

  // Persist to Firestore (no await — fire-and-forget from caller)
  await setDoc(doc(db, COLLECTION, clean), {
    ipa: cleanIpa,
    addedAt: serverTimestamp(),
  });

  return 'added';
}
