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
    } catch {
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
      interface PhoneticItem {
        audio?: string;
        text?: string;
      }
      const phonetics: PhoneticItem[] = data[0].phonetics || [];
      // Prioritize US phonetic or first available transcription
      const usPhonetic =
        phonetics.find((p) => (p.audio?.includes('-us') || p.audio?.includes('/us/')) && p.text) ||
        phonetics.find((p) => p.text) ||
        (data[0].phonetic ? { text: data[0].phonetic } : null);

      if (usPhonetic && usPhonetic.text) {
        let text = usPhonetic.text.trim();
        if (!text.startsWith('/')) text = `/${text}`;
        if (!text.endsWith('/')) text = `${text}/`;

        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(`echo_ipa_${clean}`, text);
          } catch {
            // ignore
          }
        }
        return text;
      }
    }
  } catch {
    // ignore
  }

  return '';
}

/**
 * Returns American English (General American) IPA for a full phrase/chunk or sentence,
 * e.g. "Hands-on experience with" -> "/ˈhændz ˈɑn ɪkspˈɪriəns ˈwɪð/"
 */
export function getPhraseIpa(phrase: string): string {
  if (!phrase) return '';
  const clean = phrase.replace(/[*_`#~]/g, '');
  const words = clean
    .replace(/[–—]/g, ' ')
    .replace(/[^a-zA-Z0-9\s'-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const ipaParts = words.map((w) => {
    const rawIpa = getAmericanIpa(w);
    return rawIpa ? rawIpa.replace(/^\/|\/$/g, '').replace(/'/g, 'ˈ') : w.toLowerCase();
  });

  if (ipaParts.length === 0) return '';
  return `/${ipaParts.join(' ')}/`;
}

/**
 * Extracts chunk IPA from full sentence IPA if the chunk is a substring of the example sentence.
 */
function extractChunkIpaFromSentenceIpa(
  chunkText: string,
  exampleText: string,
  sentenceIpa: string
): string {
  if (!chunkText || !exampleText || !sentenceIpa) return '';

  const cleanChunkWords = chunkText
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const cleanExampleWords = exampleText
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const cleanIpaStr = sentenceIpa.trim().replace(/^\/|\/$/g, '');
  const ipaTokens = cleanIpaStr.split(/\s+/).filter(Boolean);

  if (cleanChunkWords.length === 0 || cleanExampleWords.length === 0) return '';

  let matchIndex = -1;
  for (let i = 0; i <= cleanExampleWords.length - cleanChunkWords.length; i++) {
    let match = true;
    for (let j = 0; j < cleanChunkWords.length; j++) {
      const exWord = cleanExampleWords[i + j].replace(/[^a-z0-9]/g, '');
      const chWord = cleanChunkWords[j].replace(/[^a-z0-9]/g, '');
      if (exWord !== chWord) {
        match = false;
        break;
      }
    }
    if (match) {
      matchIndex = i;
      break;
    }
  }

  if (matchIndex !== -1 && Math.abs(ipaTokens.length - cleanExampleWords.length) <= 2) {
    const extracted = ipaTokens.slice(matchIndex, matchIndex + cleanChunkWords.length);
    if (extracted.length === cleanChunkWords.length) {
      return `/${extracted.join(' ').replace(/[,;.]/g, '')}/`;
    }
  }

  return '';
}

/**
 * Cleanly resolves both Chunk IPA and Sentence IPA for any chunk,
 * ensuring backwards compatibility with datasets where chunk.ipa stored either.
 */
export function resolveChunkIpas(chunk: {
  chunk?: string;
  ipa?: string;
  chunkIpa?: string;
  sentenceIpa?: string;
  cleanExample?: string;
  exampleSentence?: string;
} | null | undefined): { chunkIpa: string; sentenceIpa: string } {
  if (!chunk) return { chunkIpa: '', sentenceIpa: '' };

  const chunkText = (chunk.chunk || '').trim();
  const exampleText = (chunk.cleanExample || chunk.exampleSentence || '').replace(/[*_`#~]/g, '').trim();

  const chunkWordCount = chunkText.split(/\s+/).filter(Boolean).length;
  const ipaWordCount = (chunk.ipa || '').trim().split(/\s+/).filter(Boolean).length;
  // If stored ipa is noticeably longer than chunk word count, it was an old sentence-level IPA
  const isOldSentenceIpa = !chunk.sentenceIpa && ipaWordCount > chunkWordCount + 1;

  let chunkIpa = chunk.chunkIpa?.trim() || '';
  if (!chunkIpa) {
    if (!isOldSentenceIpa && chunk.ipa) {
      chunkIpa = chunk.ipa.trim();
    } else {
      // Try to extract from curated sentence IPA first
      if (isOldSentenceIpa && chunk.ipa && exampleText) {
        const extracted = extractChunkIpaFromSentenceIpa(chunkText, exampleText, chunk.ipa);
        if (extracted) {
          chunkIpa = extracted;
        }
      }
      if (!chunkIpa && chunkText) {
        chunkIpa = getPhraseIpa(chunkText);
      }
    }
  }

  let sentenceIpa = chunk.sentenceIpa?.trim() || '';
  if (!sentenceIpa) {
    if (isOldSentenceIpa && chunk.ipa) {
      sentenceIpa = chunk.ipa.trim();
    } else if (exampleText) {
      sentenceIpa = getPhraseIpa(exampleText);
    }
  }

  return { chunkIpa, sentenceIpa };
}
