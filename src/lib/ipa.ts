import ipaData from '@/data/american-ipa.json';

const ipaDict: Record<string, string> = ipaData as Record<string, string>;

/**
 * Returns American English (General American / en-US) IPA for a given word.
 * Always formats with forward slashes, e.g. "/ˈfivər/", "/sɪk/".
 */
export function getAmericanIpa(rawWord: string): string {
  if (!rawWord) return '';

  const clean = rawWord
    .toLowerCase()
    .replace(/^[+*`]/, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();

  if (!clean) return '';

  if (ipaDict[clean]) {
    return `/${ipaDict[clean]}/`;
  }

  // Check localStorage dynamic cache for any words fetched on the fly
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(`echo_ipa_${clean}`);
      if (cached) return cached;
    } catch (e) {
      // ignore
    }
  }

  return '';
}

/**
 * Asynchronously fetch American IPA from Free Dictionary API if a newly-added word is missing.
 */
export async function fetchMissingAmericanIpa(rawWord: string): Promise<string> {
  const clean = rawWord
    .toLowerCase()
    .replace(/^[+*`]/, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();

  if (!clean) return '';

  const local = getAmericanIpa(clean);
  if (local) return local;

  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${clean}`);
    if (!res.ok) return '';
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      const phonetics = data[0].phonetics || [];
      // Prioritize US phonetic or first available transcription
      const usPhonetic =
        phonetics.find((p: any) => (p.audio?.includes('-us') || p.audio?.includes('/us/')) && p.text) ||
        phonetics.find((p: any) => p.text) ||
        (data[0].phonetic ? { text: data[0].phonetic } : null);

      if (usPhonetic && usPhonetic.text) {
        let text = usPhonetic.text.trim();
        if (!text.startsWith('/')) text = `/${text}`;
        if (!text.endsWith('/')) text = `${text}/`;

        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(`echo_ipa_${clean}`, text);
          } catch (e) {
            // ignore
          }
        }
        return text;
      }
    }
  } catch (e) {
    // ignore
  }

  return '';
}
