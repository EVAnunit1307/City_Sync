/**
 * Lightweight context collection for Optimize memo: fetch from allowlist only,
 * cache in memory (TTL 6h), extract snippets around relevant keywords.
 * No broad crawling; fixed URLs from official sources.
 */

const ALLOWLIST_HOSTS = new Set([
  'markham.ca',
  'york.ca',
  'yrt.ca',
  'yrrtc.ca',
  'infrastructureontario.ca',
]);

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const cache = new Map<string, { at: number; data: ContextSource[] }>();

const EXTRACT_KEYWORDS = [
  'markham road', '14th avenue', 'mccowan', 'highway 7', 'kennedy', 'major mackenzie',
  'brt', 'construction', 'widening', 'rehabilitation', 'viva', 'transit', 'road',
  'intersection', 'water', 'sewer', 'stormwater',
];

export interface ContextSource {
  title: string;
  url: string;
  snippet: string;
}

function isAllowlist(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase().replace(/^www\./, '');
    return ALLOWLIST_HOSTS.has(host);
  } catch {
    return false;
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractSnippets(text: string, maxSnippets = 3, snippetLen = 200): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];
  for (const kw of EXTRACT_KEYWORDS) {
    const idx = lower.indexOf(kw);
    if (idx === -1) continue;
    const start = Math.max(0, idx - 80);
    const end = Math.min(text.length, idx + snippetLen);
    let snip = text.slice(start, end).trim();
    if (snip.length > 50) found.push(snip);
    if (found.length >= maxSnippets) break;
  }
  return found.length ? found : [text.slice(0, snippetLen * 2)];
}

/** Fixed list of official URLs to fetch (no crawling). */
const OFFICIAL_URLS: { url: string; title: string }[] = [
  { url: 'https://www.markham.ca/wps/portal/Home/News/Construction', title: 'City of Markham - Construction' },
  { url: 'https://www.york.ca/road-construction', title: 'York Region - Road Construction' },
  { url: 'https://www.yrt.ca/en/index.aspx', title: 'YRT - York Region Transit' },
  { url: 'https://www.yrrtc.ca/', title: 'York Region Rapid Transit' },
];

export async function fetchEvidenceBundle(): Promise<ContextSource[]> {
  const cacheKey = 'evidence_bundle';
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.data;

  const results: ContextSource[] = [];
  const timeoutMs = 8000;
  for (const { url, title } of OFFICIAL_URLS) {
    if (!isAllowlist(url)) continue;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(url, {
        headers: { 'User-Agent': 'GrowthSync-ImpactBot/1.0 (planning tool)' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) continue;
      const html = await res.text();
      const text = stripHtml(html);
      const snippets = extractSnippets(text, 2, 180);
      const snippet = snippets.join(' … ');
      if (snippet.length > 100) {
        results.push({ title, url, snippet: snippet.slice(0, 400) });
      }
    } catch {
      // skip failed URL
    }
  }
  cache.set(cacheKey, { at: Date.now(), data: results });
  return results;
}
