import ipaData from "@/data/american-ipa.json";
import { getEnrichedIpaSync, prefetchEnrichedIpa } from "@/lib/firebase/firestore/ipaEnriched";

const ipaDict: Record<string, string> = ipaData as Record<string, string>;

// Kick off Firestore enrichment cache loading in the background (browser only)
if (typeof window !== 'undefined') {
  prefetchEnrichedIpa();
}

/** Words currently being fetched — prevents duplicate concurrent requests */
const inFlightWords = new Set<string>();

/** Sentinel stored in localStorage to permanently skip words not found in the API */
const IPA_FAILED_SENTINEL = "__NOTFOUND__";

const CONTRACTIONS_DICT: Record<string, string> = {
  "let's": "lɛts",
  lets: "lɛts",
  "don't": "doʊnt",
  dont: "doʊnt",
  "doesn't": "ˈdʌzənt",
  doesnt: "ˈdʌzənt",
  "didn't": "ˈdɪdənt",
  didnt: "ˈdɪdənt",
  "won't": "woʊnt",
  wont: "woʊnt",
  "can't": "kænt",
  cant: "kænt",
  "couldn't": "ˈkʊdənt",
  couldnt: "ˈkʊdənt",
  "shouldn't": "ˈʃʊdənt",
  shouldnt: "ˈʃʊdənt",
  "wouldn't": "ˈwʊdənt",
  wouldnt: "ˈwʊdənt",
  "isn't": "ˈɪzənt",
  isnt: "ˈɪzənt",
  "aren't": "ɑːrnt",
  arent: "ɑːrnt",
  "wasn't": "ˈwɑːzənt",
  wasnt: "ˈwɑːzənt",
  "weren't": "wɜːrnt",
  werent: "wɜːrnt",
  "haven't": "ˈhævənt",
  havent: "ˈhævənt",
  "hasn't": "ˈhæzənt",
  hasnt: "ˈhæzənt",
  "hadn't": "ˈhædənt",
  hadnt: "ˈhædənt",
  "there's": "ðɛrz",
  theres: "ðɛrz",
  "that's": "ðæts",
  thats: "ðæts",
  "what's": "wʌts",
  whats: "wʌts",
  "it's": "ɪts",
  its: "ɪts",
  "i'm": "aɪm",
  im: "aɪm",
  "you're": "jʊr",
  youre: "jʊr",
  "they're": "ðɛr",
  theyre: "ðɛr",
  "we're": "wɪr",
  "who's": "huːz",
  whos: "huːz",
  "here's": "hɪrz",
  heres: "hɪrz",
  "how's": "haʊz",
  hows: "haʊz",
  "you'll": "jul",
  youll: "jul",
  "we'll": "wil",
  "they'll": "ðeɪl",
  theyll: "ðeɪl",
  "i'll": "aɪl",
  ill: "aɪl",
  "i've": "aɪv",
  ive: "aɪv",
  "we've": "wiv",
  weve: "wiv",
  "you've": "juv",
  youve: "juv",
  "they've": "ðeɪv",
  theyve: "ðeɪv",
  "i'd": "aɪd",
  id: "aɪd",
  "you'd": "jud",
  youd: "jud",
  "he'd": "hid",
  hed: "hid",
  "she'd": "ʃid",
  shed: "ʃid",
  "we'd": "wid",
  wed: "wid",
  "they'd": "ðeɪd",
  theyd: "ðeɪd"
};

const TECH_AND_BUSINESS_WORDS: Record<string, string> = {
  deliverables: "dɪˈlɪvərəbəlz",
  deliverable: "dɪˈlɪvərəbəl",
  onboarding: "ˈɑːnbɔːrdɪŋ",
  wifi: "ˈwaɪfaɪ",
  "wi-fi": "ˈwaɪfaɪ",
  roadmap: "ˈroʊdmæp",
  standup: "ˈstændʌp",
  workflow: "ˈwɜːrkfloʊ",
  workflows: "ˈwɜːrkfloʊz",
  stakeholder: "ˈsteɪkhoʊldər",
  stakeholders: "ˈsteɪkhoʊldərz",
  workstation: "ˈwɜːrksteɪʃən",
  workstations: "ˈwɜːrksteɪʃənz",
  lifecycle: "ˈlaɪfsaɪkəl",
  lifecycles: "ˈlaɪfsaɪkəlz",
  ecosystem: "ˈikoʊsɪstəm",
  ecosystems: "ˈikoʊsɪstəmz"
};

const NUMBER_MAP: Record<string, string> = {
  "0": "zero",
  "1": "one",
  "2": "two",
  "3": "three",
  "4": "four",
  "5": "five",
  "6": "six",
  "7": "seven",
  "8": "eight",
  "9": "nine",
  "10": "ten",
  "11": "eleven",
  "12": "twelve",
  "13": "thirteen",
  "14": "fourteen",
  "15": "fifteen",
  "16": "sixteen",
  "17": "seventeen",
  "18": "eighteen",
  "19": "nineteen",
  "20": "twenty",
  "30": "thirty",
  "38": "thirty eight",
  "40": "forty",
  "50": "fifty",
  "60": "sixty",
  "70": "seventy",
  "70s": "seventies",
  "75": "seventy five",
  "80": "eighty",
  "80s": "eighties",
  "90": "ninety",
  "90s": "nineties",
  "100": "one hundred",
  "00": "o'clock"
};

/**
 * Returns American English (General American / en-US) IPA for a given word.
 * Always formats with forward slashes, e.g. "/ˈfivər/", "/sɪk/".
 */
export function getAmericanIpa(rawWord: string): string {
  if (!rawWord) return "";

  const lower = rawWord.toLowerCase().trim();
  const cleanWithPunct = lower.replace(/^[+*`]/, "").replace(/[^a-z0-9'-]/g, "");
  if (!cleanWithPunct) return "";

  // 1. Direct match with contractions dictionary (handles apostrophes)
  if (CONTRACTIONS_DICT[cleanWithPunct]) {
    return `/${CONTRACTIONS_DICT[cleanWithPunct]}/`;
  }

  // 2. Direct match with tech & business vocabulary
  if (TECH_AND_BUSINESS_WORDS[cleanWithPunct]) {
    return `/${TECH_AND_BUSINESS_WORDS[cleanWithPunct]}/`;
  }

  // 3. Numbers conversion (e.g. "10", "30", "5")
  if (NUMBER_MAP[cleanWithPunct]) {
    const wordParts = NUMBER_MAP[cleanWithPunct].split(" ");
    const ipas = wordParts.map((w) => getAmericanIpa(w).replace(/^\/|\/$/g, "")).filter(Boolean);
    if (ipas.length > 0) return `/${ipas.join(" ")}/`;
  }

  // 4. Alpha-only word lookup
  const alpha = cleanWithPunct.replace(/[^a-z0-9]/g, "");
  if (CONTRACTIONS_DICT[alpha]) {
    return `/${CONTRACTIONS_DICT[alpha]}/`;
  }
  if (TECH_AND_BUSINESS_WORDS[alpha]) {
    return `/${TECH_AND_BUSINESS_WORDS[alpha]}/`;
  }
  if (NUMBER_MAP[alpha]) {
    const wordParts = NUMBER_MAP[alpha].split(" ");
    const ipas = wordParts.map((w) => getAmericanIpa(w).replace(/^\/|\/$/g, "")).filter(Boolean);
    if (ipas.length > 0) return `/${ipas.join(" ")}/`;
  }

  if (ipaDict[alpha]) {
    return `/${ipaDict[alpha]}/`;
  }

  // 4b. Enriched IPA from Firestore in-memory cache (runtime-discovered entries)
  const enrichedHit = getEnrichedIpaSync(alpha);
  if (enrichedHit) {
    return `/${enrichedHit}/`;
  }

  // 5. Check localStorage dynamic cache
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(`echo_ipa_${alpha}`);
      if (cached) return cached;
    } catch {
      // ignore
    }
  }

  // 6. Hyphenated compound breakdown (e.g. "hands-on" -> "hands" + "on")
  if (cleanWithPunct.includes("-")) {
    const parts = cleanWithPunct.split("-").filter(Boolean);
    const resolvedParts = parts.map((p) => getAmericanIpa(p).replace(/^\/|\/$/g, "")).filter(Boolean);
    if (resolvedParts.length === parts.length) {
      return `/${resolvedParts.join(" ")}/`;
    }
  }

  // 7. Possessive 's or s' (e.g. "today's", "someone's", "doctor's")
  if (cleanWithPunct.endsWith("'s") || cleanWithPunct.endsWith("s'")) {
    const base = cleanWithPunct.replace(/'s$|s'$/, "");
    const baseIpa = getAmericanIpa(base).replace(/^\/|\/$/g, "");
    if (baseIpa) {
      return `/${baseIpa}z/`;
    }
  }

  // 8. Plural / inflection fallback (e.g. "deliverables" -> "deliverable" + "z")
  if (alpha.length > 3 && alpha.endsWith("s")) {
    const singular = alpha.slice(0, -1);
    if (ipaDict[singular]) {
      return `/${ipaDict[singular]}z/`;
    }
    if (alpha.endsWith("es")) {
      const singularEs = alpha.slice(0, -2);
      if (ipaDict[singularEs]) {
        return `/${ipaDict[singularEs]}ɪz/`;
      }
    }
  }

  // 9. Asynchronously trigger background enrichment for unknown words
  // Guard: skip if already in-flight, already failed, or server-side
  if (typeof window !== "undefined" && alpha.length >= 3 && !inFlightWords.has(alpha)) {
    try {
      const failed = localStorage.getItem(`echo_ipa_${alpha}`);
      if (failed !== IPA_FAILED_SENTINEL) {
        void fetchMissingAmericanIpa(alpha);
      }
    } catch {
      void fetchMissingAmericanIpa(alpha);
    }
  }

  return "";
}

/**
 * Asynchronously fetch American IPA from Free Dictionary API if a newly-added word is missing.
 */
export async function fetchMissingAmericanIpa(rawWord: string): Promise<string> {
  const clean = rawWord
    .toLowerCase()
    .replace(/^[+*`]/, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();

  if (!clean) return "";

  // If already in the static dict, no need to fetch
  if (ipaDict[clean]) return `/${ipaDict[clean]}/`;

  // Check localStorage cache (including failure sentinel)
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(`echo_ipa_${clean}`);
      if (cached && cached !== IPA_FAILED_SENTINEL) return cached;
      if (cached === IPA_FAILED_SENTINEL) return ""; // permanently skipped
    } catch {
      /* ignore */
    }
  }

  // Guard: skip if already being fetched
  if (inFlightWords.has(clean)) return "";
  inFlightWords.add(clean);

  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${clean}`);
    if (!res.ok) {
      // Cache failure permanently so we never retry
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(`echo_ipa_${clean}`, IPA_FAILED_SENTINEL);
        } catch {
          /* ignore */
        }
      }
      return "";
    }
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      interface PhoneticItem {
        audio?: string;
        text?: string;
      }
      const phonetics: PhoneticItem[] = data[0].phonetics || [];
      // Prioritize US phonetic or first available transcription
      const usPhonetic =
        phonetics.find((p) => (p.audio?.includes("-us") || p.audio?.includes("/us/")) && p.text) ||
        phonetics.find((p) => p.text) ||
        (data[0].phonetic ? { text: data[0].phonetic } : null);

      if (usPhonetic && usPhonetic.text) {
        let text = usPhonetic.text.trim();
        if (!text.startsWith("/")) text = `/${text}`;
        if (!text.endsWith("/")) text = `${text}/`;

        if (typeof window !== 'undefined') {
          try { localStorage.setItem(`echo_ipa_${clean}`, text); } catch { /* ignore */ }
        }
        // Fire-and-forget: persist new entry back into the source dictionary
        void fetch('/api/enrich-ipa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ word: clean, ipa: text }),
        }).catch(() => { /* ignore — production read-only FS is expected */ });
        return text;
      }
    }
    // Data found but no phonetic — still cache as failed
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`echo_ipa_${clean}`, IPA_FAILED_SENTINEL);
      } catch {
        /* ignore */
      }
    }
  } catch {
    // Network error — do NOT cache, allow retry next session
  } finally {
    inFlightWords.delete(clean);
  }

  return "";
}

/**
 * Returns American English (General American) IPA for a full phrase/chunk or sentence,
 * e.g. "Hands-on experience with" -> "/ˈhændz ˈɑn ɪkspˈɪriəns ˈwɪð/"
 */
export function getPhraseIpa(phrase: string): string {
  if (!phrase) return "";
  const clean = phrase.replace(/[*_`#~]/g, "");
  const normalized = clean.replace(/[–—/]/g, " ").replace(/[^a-zA-Z0-9\s'-]/g, " ");

  const tokens = normalized.split(/\s+/).filter(Boolean);
  const ipaParts: string[] = [];

  for (const token of tokens) {
    const rawIpa = getAmericanIpa(token);
    if (rawIpa) {
      ipaParts.push(rawIpa.replace(/^\/|\/$/g, "").replace(/'/g, "ˈ"));
    } else {
      ipaParts.push(token.toLowerCase());
    }
  }

  if (ipaParts.length === 0) return "";
  return `/${ipaParts.join(" ")}/`;
}

/**
 * Extracts chunk IPA from full sentence IPA if the chunk is a substring of the example sentence.
 */
function extractChunkIpaFromSentenceIpa(chunkText: string, exampleText: string, sentenceIpa: string): string {
  if (!chunkText || !exampleText || !sentenceIpa) return "";

  const cleanChunkWords = chunkText
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  const cleanExampleWords = exampleText
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  const cleanIpaStr = sentenceIpa.trim().replace(/^\/|\/$/g, "");
  const ipaTokens = cleanIpaStr.split(/\s+/).filter(Boolean);

  if (cleanChunkWords.length === 0 || cleanExampleWords.length === 0) return "";

  let matchIndex = -1;
  for (let i = 0; i <= cleanExampleWords.length - cleanChunkWords.length; i++) {
    let match = true;
    for (let j = 0; j < cleanChunkWords.length; j++) {
      const exWord = cleanExampleWords[i + j].replace(/[^a-z0-9]/g, "");
      const chWord = cleanChunkWords[j].replace(/[^a-z0-9]/g, "");
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
      return `/${extracted.join(" ").replace(/[,;.]/g, "")}/`;
    }
  }

  return "";
}

/**
 * Cleanly resolves both Chunk IPA and Sentence IPA for any chunk,
 * ensuring backwards compatibility with datasets where chunk.ipa stored either.
 */
export function resolveChunkIpas(
  chunk:
    | {
        chunk?: string;
        ipa?: string;
        chunkIpa?: string;
        sentenceIpa?: string;
        cleanExample?: string;
        exampleSentence?: string;
      }
    | null
    | undefined
): { chunkIpa: string; sentenceIpa: string } {
  if (!chunk) return { chunkIpa: "", sentenceIpa: "" };

  const chunkText = (chunk.chunk || "").trim();
  const exampleText = (chunk.cleanExample || chunk.exampleSentence || "").replace(/[*_`#~]/g, "").trim();

  const chunkWordCount = chunkText.split(/\s+/).filter(Boolean).length;
  const ipaWordCount = (chunk.ipa || "").trim().split(/\s+/).filter(Boolean).length;
  // If stored ipa is noticeably longer than chunk word count, it was an old sentence-level IPA
  const isOldSentenceIpa = !chunk.sentenceIpa && ipaWordCount > chunkWordCount + 1;

  let chunkIpa = chunk.chunkIpa?.trim() || "";
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

  let sentenceIpa = chunk.sentenceIpa?.trim() || "";
  if (!sentenceIpa) {
    if (isOldSentenceIpa && chunk.ipa) {
      sentenceIpa = chunk.ipa.trim();
    } else if (exampleText) {
      sentenceIpa = getPhraseIpa(exampleText);
    }
  }

  return { chunkIpa, sentenceIpa };
}
