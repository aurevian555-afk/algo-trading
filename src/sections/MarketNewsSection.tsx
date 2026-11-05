import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Newspaper,
  RefreshCw,
  Search,
  ExternalLink,
  Flame,
  Clock,
  AlertCircle,
  TrendingUp,
  Globe,
  SlidersHorizontal,
} from 'lucide-react';
import { api } from '../services/api';
import { NewsItem } from '../types/trading';

type AssetFilter = 'ALL' | 'BTC' | 'ETH' | 'PAXG' | 'MACRO';
type SortOption = 'NEWEST' | 'BREAKING_FIRST';

export const MarketNewsSection: React.FC = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<number>(0);
  const [fromCache, setFromCache] = useState(false);

  // Filters & Search
  const [selectedAsset, setSelectedAsset] = useState<AssetFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('NEWEST');

  // Auto-refresh countdown (3 minutes = 180s)
  const [secondsRemaining, setSecondsRemaining] = useState(180);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchNewsData = async (force = false) => {
    if (force) setRefreshing(true);
    else if (news.length === 0) setLoading(true);

    setError(null);
    try {
      const res = await api.getNews(force);
      if (res.success && Array.isArray(res.items)) {
        setNews(res.items);
        setLastFetchedAt(res.lastFetchedAt || Date.now());
        setFromCache(Boolean(res.fromCache));
        setSecondsRemaining(180);
      } else {
        setError(res.error || 'Market News connection is currently unavailable. Upstream feeds timed out.');
      }
    } catch (err: any) {
      setError(err.message || 'Network connection to the news service failed. Please check connectivity.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNewsData(false);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (secondsRemaining === 0) {
      fetchNewsData(true);
      setSecondsRemaining(180);
    }
  }, [secondsRemaining]);

  // Filter and Sort logic
  const filteredAndSortedNews = useMemo(() => {
    let result = [...news];

    // Asset Filter
    if (selectedAsset !== 'ALL') {
      result = result.filter(item => {
        if (selectedAsset === 'BTC') return item.asset === 'BTC';
        if (selectedAsset === 'ETH') return item.asset === 'ETH';
        if (selectedAsset === 'PAXG') return item.asset === 'PAXG';
        if (selectedAsset === 'MACRO') return item.asset === 'MACRO';
        return true;
      });
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        item =>
          item.title.toLowerCase().includes(q) ||
          item.summary.toLowerCase().includes(q) ||
          item.source.toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'BREAKING_FIRST') {
        if (a.isBreaking && !b.isBreaking) return -1;
        if (!a.isBreaking && b.isBreaking) return 1;
      }
      return b.publishedAt - a.publishedAt;
    });

    return result;
  }, [news, selectedAsset, searchQuery, sortBy]);

  // Breaking news highlights
  const breakingItems = useMemo(() => {
    return news.filter(n => n.isBreaking);
  }, [news]);

  const formatMinutesSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const getAssetBadgeLabel = (asset: string) => {
    switch (asset) {
      case 'BTC':
        return 'Bitcoin (BTC)';
      case 'ETH':
        return 'Ethereum (ETH)';
      case 'PAXG':
        return 'PAX Gold (PAXG)';
      case 'MACRO':
        return 'Macro & Fed';
      default:
        return 'Market';
    }
  };

  const getRelativeTime = (epochMs: number) => {
    const diffSec = Math.floor((Date.now() - epochMs) / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto transition-colors">
      {/* Header Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[var(--border-main)] pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Newspaper className="w-5 h-5 text-[var(--accent-blue)]" />
            <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
              Market News & Global Macro
            </h1>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Real-time verified financial and cryptocurrency coverage from Cointelegraph, Decrypt, CoinDesk, Federal Reserve & MarketWatch.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          {/* Refresh Countdown & Status */}
          <div className="flex items-center space-x-2 text-xs text-[var(--text-secondary)]">
            <Clock className="w-3.5 h-3.5" />
            <span>Next refresh in <strong className="font-mono text-[var(--text-primary)]">{formatMinutesSeconds(secondsRemaining)}</strong></span>
            {fromCache && <span className="opacity-75">(cached)</span>}
          </div>

          <button
            onClick={() => fetchNewsData(true)}
            disabled={refreshing || loading}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-[var(--bg-card)] hover:bg-[var(--bg-card-sub)] text-[var(--text-primary)] border border-[var(--border-main)] rounded-md text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
            title="Refresh news feeds now"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[var(--accent-blue)]' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Breaking News Ribbon (if breaking stories present) */}
      {breakingItems.length > 0 && (
        <div className="bg-[var(--color-red)]/10 border border-[var(--color-red)]/30 rounded-lg p-3 text-xs flex items-start space-x-3">
          <div className="p-1.5 bg-[var(--color-red)] text-white rounded shrink-0">
            <Flame className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-[var(--color-red)] uppercase tracking-wider text-[10px]">
                Breaking Market Alert
              </span>
              <span className="text-[var(--text-secondary)]">·</span>
              <span className="text-[var(--text-secondary)] font-mono">
                {getRelativeTime(breakingItems[0].publishedAt)}
              </span>
            </div>
            <a
              href={breakingItems[0].url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-sm text-[var(--text-primary)] hover:text-[var(--accent-blue)] block mt-0.5 transition-colors line-clamp-1"
            >
              {breakingItems[0].title}
            </a>
            <p className="text-[var(--text-secondary)] mt-1 line-clamp-2">
              {breakingItems[0].summary}
            </p>
          </div>
          <a
            href={breakingItems[0].url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 flex items-center space-x-1 text-xs font-medium text-[var(--color-red)] hover:underline pt-1"
          >
            <span>Read full</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* Filter and Search Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[var(--bg-card)] border border-[var(--border-main)] p-2.5 rounded-lg text-xs">
        {/* Asset Category Filters */}
        <div className="flex items-center space-x-1 overflow-x-auto pb-1 md:pb-0 custom-scrollbar">
          {(['ALL', 'BTC', 'ETH', 'PAXG', 'MACRO'] as AssetFilter[]).map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedAsset(cat)}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap cursor-pointer ${
                selectedAsset === cat
                  ? 'bg-[var(--accent-blue)] text-white font-semibold shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-sub)]'
              }`}
            >
              {cat === 'ALL' && 'All Coverage'}
              {cat === 'BTC' && 'Bitcoin (BTC)'}
              {cat === 'ETH' && 'Ethereum (ETH)'}
              {cat === 'PAXG' && 'PAX Gold (PAXG)'}
              {cat === 'MACRO' && 'Macro & Fed'}
            </button>
          ))}
        </div>

        {/* Search & Sort */}
        <div className="flex items-center space-x-2 shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search headlines or sources..."
              className="bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md pl-8 pr-3 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] outline-none focus:border-[var(--accent-blue)] w-48 md:w-60"
            />
          </div>

          <div className="flex items-center space-x-1 border border-[var(--border-main)] bg-[var(--bg-main)] rounded-md px-2 py-1">
            <SlidersHorizontal className="w-3 h-3 text-[var(--text-secondary)]" />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortOption)}
              className="bg-transparent text-xs text-[var(--text-primary)] outline-none cursor-pointer"
            >
              <option value="NEWEST" className="bg-[var(--bg-card)] text-[var(--text-primary)]">Newest First</option>
              <option value="BREAKING_FIRST" className="bg-[var(--bg-card)] text-[var(--text-primary)]">Breaking First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Boundary Notice */}
      {error && (
        <div className="p-4 bg-[var(--color-red)]/10 border border-[var(--color-red)]/30 rounded-lg text-xs space-y-2">
          <div className="flex items-center space-x-2 text-[var(--color-red)] font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Market News Connection Error</span>
          </div>
          <p className="text-[var(--text-secondary)] leading-relaxed">
            {error}
          </p>
          <button
            onClick={() => fetchNewsData(true)}
            className="px-3 py-1.5 bg-[var(--color-red)] text-white font-medium rounded hover:opacity-90 transition-opacity cursor-pointer inline-flex items-center space-x-1"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry Connection</span>
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div
              key={i}
              className="p-4 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg space-y-3 animate-pulse"
            >
              <div className="h-4 bg-[var(--bg-card-sub)] rounded w-3/4" />
              <div className="h-3 bg-[var(--bg-card-sub)] rounded w-full" />
              <div className="h-3 bg-[var(--bg-card-sub)] rounded w-5/6" />
              <div className="flex justify-between pt-2">
                <div className="h-3 bg-[var(--bg-card-sub)] rounded w-20" />
                <div className="h-3 bg-[var(--bg-card-sub)] rounded w-16" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* News Grid */}
      {!loading && !error && filteredAndSortedNews.length === 0 && (
        <div className="p-12 text-center bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg text-xs space-y-2">
          <Globe className="w-8 h-8 text-[var(--text-secondary)] mx-auto opacity-50" />
          <h3 className="font-semibold text-sm text-[var(--text-primary)]">No matching articles found</h3>
          <p className="text-[var(--text-secondary)] max-w-sm mx-auto">
            Try adjusting your search keywords or switching category filters to view broader market coverage.
          </p>
        </div>
      )}

      {!loading && filteredAndSortedNews.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAndSortedNews.map(item => (
            <article
              key={item.id}
              className={`p-4 bg-[var(--bg-card)] border rounded-lg hover:border-[var(--accent-blue)] transition-all flex flex-col justify-between group ${
                item.isBreaking
                  ? 'border-[var(--color-red)]/40 bg-[var(--color-red)]/5'
                  : 'border-[var(--border-main)]'
              }`}
            >
              <div className="space-y-2.5">
                {/* Meta Header */}
                <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
                  <div className="flex items-center space-x-1.5">
                    <span className="font-semibold text-[var(--text-primary)]">{item.source}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">{getRelativeTime(item.publishedAt)}</span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    {item.isBreaking && (
                      <span className="text-[10px] font-bold text-[var(--color-red)] flex items-center space-x-0.5">
                        <Flame className="w-3 h-3" />
                        <span>BREAKING</span>
                      </span>
                    )}
                    <span className="text-[10px] font-medium text-[var(--text-secondary)] opacity-80">
                      {getAssetBadgeLabel(item.asset)}
                    </span>
                  </div>
                </div>

                {/* Headline */}
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-sm text-[var(--text-primary)] group-hover:text-[var(--accent-blue)] transition-colors leading-snug line-clamp-2 block"
                >
                  {item.title}
                </a>

                {/* Summary */}
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-3">
                  {item.summary}
                </p>
              </div>

              {/* Card Footer with Verified External Link */}
              <div className="pt-3 mt-3 border-t border-[var(--border-main)]/60 flex items-center justify-between text-[11px]">
                <span className="text-[var(--text-secondary)] font-mono text-[10px]">
                  {item.publishedDateString}
                </span>

                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1 text-[var(--accent-blue)] hover:underline font-medium transition-colors"
                >
                  <span>Open article</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
