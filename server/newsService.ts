import https from 'https';
import http from 'http';

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: number;
  publishedDateString: string;
  asset: 'BTC' | 'ETH' | 'PAXG' | 'MACRO' | 'GENERAL';
  isBreaking: boolean;
  category?: string;
}

interface FeedConfig {
  source: string;
  url: string;
  defaultAsset: 'BTC' | 'ETH' | 'PAXG' | 'MACRO' | 'GENERAL';
}

const FEEDS: FeedConfig[] = [
  {
    source: 'Cointelegraph',
    url: 'https://cointelegraph.com/rss',
    defaultAsset: 'GENERAL',
  },
  {
    source: 'Decrypt',
    url: 'https://decrypt.co/feed',
    defaultAsset: 'GENERAL',
  },
  {
    source: 'CoinDesk',
    url: 'https://www.coindesk.com/arc/outboundfeeds/rss',
    defaultAsset: 'GENERAL',
  },
  {
    source: 'Federal Reserve',
    url: 'https://www.federalreserve.gov/feeds/press_all.xml',
    defaultAsset: 'MACRO',
  },
  {
    source: 'MarketWatch',
    url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories',
    defaultAsset: 'MACRO',
  },
];

class NewsService {
  private cache: NewsItem[] = [];
  private lastFetchedAt = 0;
  private readonly CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes
  private isFetching = false;

  public async getNews(forceRefresh = false): Promise<{ items: NewsItem[]; lastFetchedAt: number; fromCache: boolean }> {
    const now = Date.now();
    if (!forceRefresh && this.cache.length > 0 && now - this.lastFetchedAt < this.CACHE_TTL_MS) {
      return { items: this.cache, lastFetchedAt: this.lastFetchedAt, fromCache: true };
    }

    if (this.isFetching && this.cache.length > 0) {
      return { items: this.cache, lastFetchedAt: this.lastFetchedAt, fromCache: true };
    }

    try {
      this.isFetching = true;
      const allItems: NewsItem[] = [];

      const feedPromises = FEEDS.map(async feed => {
        try {
          const xml = await this.fetchWithRedirects(feed.url, 3);
          const parsed = this.parseXmlRss(xml, feed.source, feed.defaultAsset);
          return parsed;
        } catch (err: any) {
          console.warn(`[NEWS SERVICE] Failed to fetch feed ${feed.source}:`, err.message);
          return [];
        }
      });

      const results = await Promise.all(feedPromises);
      for (const list of results) {
        allItems.push(...list);
      }

      if (allItems.length === 0 && this.cache.length > 0) {
        // Keep cached if network failed completely
        return { items: this.cache, lastFetchedAt: this.lastFetchedAt, fromCache: true };
      }

      if (allItems.length === 0) {
        throw new Error('Unable to fetch live news from verified feeds. All upstream endpoints timed out or returned empty.');
      }

      // Deduplicate by normalized title
      const seenTitles = new Set<string>();
      const deduplicated: NewsItem[] = [];

      for (const item of allItems) {
        const norm = item.title.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!seenTitles.has(norm)) {
          seenTitles.add(norm);
          deduplicated.push(item);
        }
      }

      // Sort newest first
      deduplicated.sort((a, b) => b.publishedAt - a.publishedAt);

      this.cache = deduplicated;
      this.lastFetchedAt = Date.now();
      return { items: this.cache, lastFetchedAt: this.lastFetchedAt, fromCache: false };
    } finally {
      this.isFetching = false;
    }
  }

  private fetchWithRedirects(targetUrl: string, maxRedirects = 3): Promise<string> {
    return new Promise((resolve, reject) => {
      if (maxRedirects < 0) {
        return reject(new Error('Too many redirects'));
      }

      const client = targetUrl.startsWith('https') ? https : http;
      const req = client.get(
        targetUrl,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 AUREVIAN/1.0',
            'Accept': 'application/rss+xml, application/xml, text/xml, */*',
          },
          timeout: 8000,
        },
        res => {
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            let nextUrl = res.headers.location;
            if (nextUrl.startsWith('/')) {
              const u = new URL(targetUrl);
              nextUrl = `${u.protocol}//${u.host}${nextUrl}`;
            }
            res.resume();
            return resolve(this.fetchWithRedirects(nextUrl, maxRedirects - 1));
          }

          if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
            res.resume();
            return reject(new Error(`HTTP ${res.statusCode}`));
          }

          let data = '';
          res.setEncoding('utf8');
          res.on('data', chunk => (data += chunk));
          res.on('end', () => resolve(data));
        }
      );

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timed out'));
      });
    });
  }

  private parseXmlRss(xml: string, source: string, defaultAsset: 'BTC' | 'ETH' | 'PAXG' | 'MACRO' | 'GENERAL'): NewsItem[] {
    const items: NewsItem[] = [];
    const itemRegex = /<item[\s>]([\s\S]*?)<\/item>/gi;
    let match: RegExpExecArray | null;

    while ((match = itemRegex.exec(xml)) !== null) {
      const itemContent = match[1];

      const title = this.extractTag(itemContent, 'title');
      if (!title) continue;

      let link = this.extractTag(itemContent, 'link');
      if (!link) {
        // try atom:link or guid
        const guid = this.extractTag(itemContent, 'guid');
        if (guid && guid.startsWith('http')) link = guid;
      }

      let description = this.extractTag(itemContent, 'description') || this.extractTag(itemContent, 'content:encoded') || '';
      // Strip HTML tags and entities
      description = this.cleanHtml(description);

      const pubDateStr = this.extractTag(itemContent, 'pubDate') || this.extractTag(itemContent, 'dc:date') || '';
      let publishedAt = Date.now();
      if (pubDateStr) {
        const parsed = Date.parse(pubDateStr);
        if (!isNaN(parsed)) publishedAt = parsed;
      }

      // Detect asset categorization based on headline and summary keywords
      const asset = this.detectAsset(title, description, defaultAsset);

      // Detect if breaking news
      const isBreaking = this.detectBreaking(title, description, publishedAt);

      const cleanTitle = this.cleanHtml(title);
      const cleanSummary = description.length > 280 ? description.substring(0, 277) + '...' : description;

      const id = `news_${publishedAt}_${Math.abs(this.hashCode(cleanTitle + link))}`;

      items.push({
        id,
        title: cleanTitle,
        summary: cleanSummary || 'Click to view the full coverage on ' + source + '.',
        source,
        url: link || '#',
        publishedAt,
        publishedDateString: new Date(publishedAt).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        asset,
        isBreaking,
      });

      if (items.length >= 25) break; // cap per feed to keep top 25 fresh items
    }

    return items;
  }

  private extractTag(xml: string, tagName: string): string | null {
    // Check for CDATA first
    const cdataRegex = new RegExp(`<${tagName}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tagName}>`, 'i');
    const cdataMatch = cdataRegex.exec(xml);
    if (cdataMatch) return cdataMatch[1].trim();

    // Standard tag
    const standardRegex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
    const standardMatch = standardRegex.exec(xml);
    if (standardMatch) return standardMatch[1].trim();

    return null;
  }

  private cleanHtml(html: string): string {
    return html
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&rsquo;/g, "'")
      .replace(/&lsquo;/g, "'")
      .replace(/&rdquo;/g, '"')
      .replace(/&ldquo;/g, '"')
      .replace(/&mdash;/g, '—')
      .replace(/&ndash;/g, '–')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private detectAsset(title: string, summary: string, defaultAsset: 'BTC' | 'ETH' | 'PAXG' | 'MACRO' | 'GENERAL'): 'BTC' | 'ETH' | 'PAXG' | 'MACRO' | 'GENERAL' {
    const text = `${title} ${summary}`.toLowerCase();

    // Gold / PAX Gold checks
    if (text.includes('paxg') || text.includes('pax gold') || text.includes('gold bullion') || text.includes('gold price') || text.includes('spot gold')) {
      return 'PAXG';
    }

    // Bitcoin checks
    if (text.includes('bitcoin') || text.includes('btc') || text.includes('satoshi') || text.includes('halving') || text.includes('spot btc etf')) {
      return 'BTC';
    }

    // Ethereum checks
    if (text.includes('ethereum') || text.includes('eth') || text.includes('vitalik') || text.includes('ether') || text.includes('spot eth etf')) {
      return 'ETH';
    }

    // Federal Reserve / Macro checks
    if (
      text.includes('federal reserve') ||
      text.includes('fed ') ||
      text.includes('fomc') ||
      text.includes('powell') ||
      text.includes('interest rate') ||
      text.includes('inflation') ||
      text.includes('cpi') ||
      text.includes('treasury') ||
      text.includes('sec ') ||
      defaultAsset === 'MACRO'
    ) {
      return 'MACRO';
    }

    return defaultAsset;
  }

  private detectBreaking(title: string, summary: string, publishedAt: number): boolean {
    const text = `${title} ${summary}`.toLowerCase();
    const isVeryRecent = Date.now() - publishedAt < 2 * 3600 * 1000; // within 2 hours

    const urgentKeywords = [
      'breaking',
      'just in',
      'fomc rate decision',
      'interest rate decision',
      'emergency',
      'sec approves',
      'sec denies',
      'etf approved',
      'all-time high',
      'record high',
      'plunges',
      'surges',
      'flash crash',
    ];

    const hasKeyword = urgentKeywords.some(kw => text.includes(kw));
    return hasKeyword && isVeryRecent;
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }
}

export const newsService = new NewsService();
