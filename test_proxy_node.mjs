/**
 * Test script: Webshare Proxy + Node.js native fetch
 * Chạy: node test_proxy_node.mjs
 * Mô phỏng đúng logic youtube.service.ts
 */
import { HttpsProxyAgent } from 'https-proxy-agent';

const PROXY_URL = 'http://quomavrt-rotate:8x9pyh5q2q9v@p.webshare.io:80';
const VIDEO_ID = 'ABJMp1n8TfE'; // "The World is our English Classroom"
const agent = new HttpsProxyAgent(PROXY_URL);
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Danh sách clients — giống youtube.service.ts
const CLIENTS = [
  {
    clientName: 'WEB_EMBEDDED_PLAYER',
    clientVersion: '1.20250915.01.00',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    embedUrl: `https://www.youtube.com/embed/${VIDEO_ID}`,
  },
  {
    clientName: 'TVHTML5_SIMPLY_EMBEDDED_PLAYER',
    clientVersion: '2.0',
    userAgent: 'Mozilla/5.0 (SMART-TV; Linux; Tizen 6.0) AppleWebKit/538.1 (KHTML, like Gecko) Version/6.0 TV Safari/538.1',
    embedUrl: `https://www.youtube.com/embed/${VIDEO_ID}`,
  },
  {
    clientName: 'WEB',
    clientVersion: '2.20250915.01.00',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    embedUrl: `https://www.youtube.com/embed/${VIDEO_ID}`,
  },
  {
    clientName: 'ANDROID',
    clientVersion: '20.10.38',
    userAgent: 'com.google.android.youtube/20.10.38 (Linux; U; Android 14)',
  },
];

async function main() {
  // Step 0: Verify exit IP
  console.log('=== Step 0: Exit IP via Webshare ===');
  const ipRes = await fetch('http://ipv4.webshare.io/', { agent });
  console.log('Exit IP:', (await ipRes.text()).trim());

  // Step 1: InnerTube API (fetchPlayerResponse logic)
  console.log('\n=== Step 1: InnerTube API via Proxy ===');
  let foundTracks = null;

  for (const client of CLIENTS) {
    const body = {
      context: {
        client: {
          clientName: client.clientName,
          clientVersion: client.clientVersion,
          hl: 'en',
          gl: 'US',
        },
        ...(client.embedUrl ? { thirdParty: { embedUrl: client.embedUrl } } : {}),
      },
      videoId: VIDEO_ID,
    };

    try {
      const res = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': client.userAgent,
          'Accept-Language': 'en-US,en;q=0.9',
          'Origin': 'https://www.youtube.com',
          'Referer': client.embedUrl || `https://www.youtube.com/watch?v=${VIDEO_ID}`,
        },
        body: JSON.stringify(body),
        agent,
      });

      if (!res.ok) {
        console.log(`  [${client.clientName}] HTTP ${res.status}`);
        continue;
      }

      const data = await res.json();
      const status = data?.playabilityStatus?.status;
      const reason = data?.playabilityStatus?.reason ?? '';
      const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];

      console.log(`  [${client.clientName}] status=${status} | reason=${reason || 'OK'} | tracks=${tracks.length}`);

      if (tracks.length > 0) {
        foundTracks = tracks;
        break;
      }
    } catch (err) {
      console.error(`  [${client.clientName}] Error:`, err.message);
    }
  }

  // Step 2: HTML scrape fallback (fetchPlayerResponseFallback logic)
  if (!foundTracks) {
    console.log('\n=== Step 2: HTML Scrape Fallback via Proxy ===');
    try {
      const htmlRes = await fetch(`https://www.youtube.com/watch?v=${VIDEO_ID}`, {
        headers: { 'User-Agent': BROWSER_UA, 'Accept-Language': 'en-US,en;q=0.9' },
        agent,
      });
      const html = await htmlRes.text();
      console.log(`  HTML status: ${htmlRes.status}, length: ${html.length} bytes`);

      // bracket-counter parse — giống parseInlineJson trong service
      const startToken = 'var ytInitialPlayerResponse = ';
      let startIdx = html.indexOf(startToken);
      if (startIdx !== -1) {
        startIdx += startToken.length;
        let depth = 0;
        for (let i = startIdx; i < html.length; i++) {
          if (html[i] === '{') depth++;
          else if (html[i] === '}') {
            depth--;
            if (depth === 0) {
              try {
                const scraped = JSON.parse(html.slice(startIdx, i + 1));
                const scrapedTracks = scraped?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
                console.log(`  Scraped status=${scraped?.playabilityStatus?.status}, tracks=${scrapedTracks.length}`);
                if (scrapedTracks.length > 0) foundTracks = scrapedTracks;
              } catch {
                console.log('  JSON parse failed');
              }
              break;
            }
          }
        }
      } else {
        console.log('  ytInitialPlayerResponse not found in HTML');
      }
    } catch (err) {
      console.error('  HTML scrape error:', err.message);
    }
  }

  // Step 3: Download Caption XML — giống tryFetchNativeYouTube
  if (foundTracks) {
    const track = foundTracks.find(t => t.languageCode === 'en' || t.languageCode?.startsWith('en')) ?? foundTracks[0];
    console.log(`\n=== Step 3: Download Caption XML via Proxy ===`);
    console.log(`  Track: ${track.languageCode} | "${track.name?.simpleText ?? ''}"`);

    let xmlUrl = track.baseUrl;
    if (!xmlUrl.includes('fmt=')) xmlUrl += '&fmt=srv3';

    const xmlRes = await fetch(xmlUrl, {
      headers: { 'User-Agent': BROWSER_UA, 'Accept-Language': 'en-US,en;q=0.9' },
      agent,
    });

    const xml = await xmlRes.text();
    console.log(`  XML status: ${xmlRes.status}, length: ${xml.length} chars`);
    console.log(`  Has <p> sentences: ${xml.includes('<p ')}`);
    console.log(`  Has <s> word timestamps: ${xml.includes('<s ')}`);
    console.log(`\n  Snippet:\n${xml.slice(0, 300)}`);
    console.log('\n  [SUCCESS] Transcript fetched via Webshare proxy!');
  } else {
    console.log('\n  [FAIL] No caption tracks found via proxy.');
  }
}

main().catch(console.error);
