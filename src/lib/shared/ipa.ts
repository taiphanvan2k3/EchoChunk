/**
 * General American IPA Transcription Engine
 *
 * Core offline dictionary source:
 * - Dataset: The CMU Pronouncing Dictionary converted to IPA (124,000+ words)
 * - Source: https://github.com/menelik3/cmudict-ipa (menelik3/cmudict-ipa)
 * - File: src/data/american-ipa.json
 */

let ipaDict: Record<string, string> | null = null;
let ipaLoadPromise: Promise<Record<string, string>> | null = null;

/**
 * Lazy-load bộ từ điển 124,000 từ IPA khi cần thiết
 * để tránh nhúng file JSON 3.26MB vào critical path của bundle ban đầu.
 */
export async function ensureIpaDict(): Promise<Record<string, string>> {
  if (ipaDict) return ipaDict;

  if (!ipaLoadPromise) {
    ipaLoadPromise = import("@/data/american-ipa.json").then((m) => {
      ipaDict = (m.default || m) as Record<string, string>;
      return ipaDict;
    });
  }

  return ipaLoadPromise;
}

// Prefetch tự động trong background khi trình duyệt rảnh rỗi (idle), hoàn toàn không chặn LCP / FCP
if (typeof window !== "undefined") {
  const triggerIdleLoad = () => {
    ensureIpaDict().catch(() => {});
  };

  // Safari và một số trình duyệt cũ không hỗ trợ requestIdleCallback
  // https://caniuse.com/?search=requestIdleCallback
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(triggerIdleLoad);
  } else {
    setTimeout(triggerIdleLoad, 2000);
  }
}

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

  if (ipaDict && ipaDict[alpha]) {
    return `/${ipaDict[alpha]}/`;
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
    if (ipaDict && ipaDict[singular]) {
      return `/${ipaDict[singular]}z/`;
    }
    if (alpha.endsWith("es")) {
      const singularEs = alpha.slice(0, -2);
      if (ipaDict && ipaDict[singularEs]) {
        return `/${ipaDict[singularEs]}ɪz/`;
      }
    }
  }

  return "";
}

/**
 * Resolves American IPA for a word offline.
 * Note: External dictionary API has been removed in favor of the complete 124,000+ CMUdict offline dataset.
 */
export async function fetchMissingAmericanIpa(rawWord: string): Promise<string> {
  return getAmericanIpa(rawWord);
}

/**
 * Chuẩn hóa các ký tự IPA đặc thù của Mỹ (như ɝ, ɚ) về dạng quen thuộc dễ đọc (ɜːr, ər)
 * phù hợp với thói quen học tiếng Anh của người Việt Nam.
 */
export function normalizeFriendlyIpa(ipa: string): string {
  if (!ipa) return "";
  return ipa
    .replace(/ɝː?/g, "ɜːr")
    .replace(/ɚ/g, "ər");
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
  if (tokens.length === 0) return "";

  const ipaParts: string[] = [];
  let resolvedCount = 0;

  for (const token of tokens) {
    const rawIpa = getAmericanIpa(token);
    if (rawIpa) {
      ipaParts.push(rawIpa.replace(/^\/|\/$/g, "").replace(/'/g, "ˈ"));
      resolvedCount++;
    } else {
      ipaParts.push(token.toLowerCase());
    }
  }

  // Nếu từ điển chưa tải xong (hoặc không tra được từ nào trong câu),
  // không trả về câu tiếng Anh thô để tránh hiển thị nhầm vào vị trí phiên âm IPA
  if (resolvedCount === 0 || (tokens.length > 2 && resolvedCount / tokens.length < 0.35)) {
    return "";
  }

  return normalizeFriendlyIpa(`/${ipaParts.join(" ")}/`);
}

/**
 * Extracts chunk IPA from full sentence IPA if the chunk is a substring of the example sentence.
 */
function extractChunkIpaFromSentenceIpa(chunkText: string, exampleText: string, sentenceIpa: string): string {
  if (!chunkText || !exampleText || !sentenceIpa) return "";

  // Chuẩn hóa dấu gạch ngang/nối thành khoảng trắng để các từ ghép như "problem-solving"
  // tách thành "problem" và "solving", khớp 1:1 với các âm vị trong sentenceIpa
  const cleanChunkWords = chunkText
    .toLowerCase()
    .replace(/[-–—/]/g, " ")
    .replace(/[^a-z0-9\s']/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  const cleanExampleWords = exampleText
    .toLowerCase()
    .replace(/[-–—/]/g, " ")
    .replace(/[^a-z0-9\s']/g, " ")
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

  if (matchIndex !== -1 && matchIndex + cleanChunkWords.length <= ipaTokens.length) {
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

  return {
    chunkIpa: normalizeFriendlyIpa(chunkIpa),
    sentenceIpa: normalizeFriendlyIpa(sentenceIpa),
  };
}
