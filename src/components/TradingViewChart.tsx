import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck, Info } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

declare global {
  interface Window {
    TradingView: any;
  }
}

interface Props {
  pair: string;
  timeframe?: string;
  height?: number | string;
  isFullScreen?: boolean;
  hideHeaderFooter?: boolean;
}

// Verified TradingView Symbol Mapping with Delta Exchange Strategy Separation
const TRADINGVIEW_SYMBOL_MAP: Record<string, {
  tvSymbol: string;
  name: string;
  exchange: string;
  assetType: string;
  deltaSymbol: string;
  deltaProductId: number;
  notes?: string;
}> = {
  'ETHUSD': {
    tvSymbol: 'BINANCE:ETHUSDT',
    name: 'Ethereum Perpetual Futures (USD)',
    exchange: 'TradingView Widget (Binance Feed)',
    assetType: 'Perpetual Contract',
    deltaSymbol: 'ETHUSD',
    deltaProductId: 3136,
    notes: 'Chart visual rendered via official TradingView widget. Execution engine and paper trades run on Delta Exchange India (Symbol: ETHUSD, Product ID: 3136).',
  },
  'BTCUSD.P': {
    tvSymbol: 'BINANCE:BTCUSDT.P',
    name: 'Bitcoin Perpetual Futures (USD)',
    exchange: 'TradingView Widget (Binance Futures Feed)',
    assetType: 'Perpetual Contract',
    deltaSymbol: 'BTCUSD',
    deltaProductId: 27,
    notes: 'Chart visual rendered via official TradingView widget. Execution engine and paper trades run on Delta Exchange India (Symbol: BTCUSD, Product ID: 27).',
  },
  'PAXGUSD.P': {
    tvSymbol: 'BINANCE:PAXGUSDT',
    name: 'PAX Gold Perpetual (USD)',
    exchange: 'TradingView Widget (Spot Index Feed)',
    assetType: 'Perpetual Contract',
    deltaSymbol: 'PAXGUSD',
    deltaProductId: 123006,
    notes: 'Chart visual rendered via official TradingView widget. Execution engine and paper trades run on Delta Exchange India (Symbol: PAXGUSD, Product ID: 123006).',
  },
};

const TIMEFRAME_MAP: Record<string, string> = {
  '1m': '1',
  '5m': '5',
  '15m': '15',
  '30m': '30',
  '1H': '60',
  '4H': '240',
  '1D': 'D',
  '1W': 'W',
};

export const TradingViewChart: React.FC<Props> = ({
  pair,
  timeframe = '15m',
  height = '100%',
  isFullScreen = false,
  hideHeaderFooter = false,
}) => {
  const { isDark } = useTheme();
  const containerIdRef = useRef(`tradingview_${Math.random().toString(36).substring(2, 9)}`);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const mapped = TRADINGVIEW_SYMBOL_MAP[pair] || {
    tvSymbol: 'BINANCE:ETHUSDT',
    name: pair,
    exchange: 'Binance',
    assetType: 'Cryptocurrency',
    deltaSymbol: pair,
    deltaProductId: 0,
  };

  const tvInterval = TIMEFRAME_MAP[timeframe] || '15';

  // Load official TradingView tv.js script once
  useEffect(() => {
    if (window.TradingView) {
      setScriptLoaded(true);
      return;
    }

    const existingScript = document.getElementById('tradingview-widget-script');
    if (existingScript) {
      existingScript.addEventListener('load', () => setScriptLoaded(true));
      return;
    }

    const script = document.createElement('script');
    script.id = 'tradingview-widget-script';
    script.src = 'https://s3.tradingview.com/tv.js';
    script.type = 'text/javascript';
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => setLoadError('Failed to load official TradingView widget script from s3.tradingview.com.');

    document.head.appendChild(script);
  }, []);

  // Initialize or re-initialize widget on symbol, interval, theme, or fullscreen change
  useEffect(() => {
    if (!scriptLoaded || !window.TradingView) return;

    const container = document.getElementById(containerIdRef.current);
    if (!container) return;

    container.innerHTML = '';

    try {
      new window.TradingView.widget({
        autosize: true,
        symbol: mapped.tvSymbol,
        interval: tvInterval,
        timezone: 'Etc/UTC',
        theme: isDark ? 'dark' : 'light',
        style: '1', // Candlestick style
        locale: 'en',
        toolbar_bg: isDark ? '#101010' : '#FFFFFF',
        enable_publishing: false,
        allow_symbol_change: true,
        container_id: containerIdRef.current,
        hide_side_toolbar: false,
        withdateranges: true,
        details: true,
        hotlist: false,
        calendar: false,
        show_popup_button: true,
        popup_width: '1000',
        popup_height: '650',
        studies: [
          'Volume@tv-basicstudies',
          'MASimple@tv-basicstudies',
          'RSI@tv-basicstudies',
        ],
        disabled_features: [],
        enabled_features: ['study_templates', 'use_localstorage_for_settings'],
      });
    } catch (err: any) {
      console.error('TradingView Widget Error:', err);
      setLoadError(err.message || 'Error initializing TradingView widget.');
    }
  }, [scriptLoaded, mapped.tvSymbol, tvInterval, isDark, isFullScreen]);

  const heightStyle = typeof height === 'number' ? `${height}px` : height;

  return (
    <div className="flex flex-col flex-1 w-full h-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg shadow-xs overflow-hidden transition-colors min-h-0">
      {/* Official TradingView Data Transparency Header */}
      {!hideHeaderFooter && (
        <div className="flex flex-wrap items-center justify-between px-3 py-1.5 bg-[var(--bg-card)] border-b border-[var(--border-main)] text-xs shrink-0">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-3.5 h-3.5 text-[var(--color-green)]" />
            <span className="font-medium text-[var(--text-primary)]">
              Official TradingView Advanced Chart
            </span>
            <span className="text-[var(--border-main)]">|</span>
            <span className="font-mono text-[var(--text-secondary)] text-[11px]">
              Visual: <strong className="text-[var(--text-primary)]">{mapped.tvSymbol}</strong>
            </span>
            <span className="text-[var(--border-main)]">|</span>
            <span className="font-mono text-[var(--text-secondary)] text-[11px]">
              Delta Contract: <strong className="text-[var(--accent-blue)]">{mapped.deltaSymbol}</strong>
            </span>
          </div>

          <div className="flex items-center space-x-2 text-[11px] text-[var(--text-secondary)]">
            <span className="bg-[var(--bg-card-sub)] px-1.5 py-0.2 rounded text-[var(--text-primary)] font-mono border border-[var(--border-main)]">
              {mapped.assetType}
            </span>
            <span className="text-[var(--color-green)] font-medium flex items-center gap-1 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-green)]" />
              TradingView Live
            </span>
          </div>
        </div>
      )}

      {/* Disclaimers & Notes if applicable */}
      {mapped.notes && !isFullScreen && !hideHeaderFooter && (
        <div className="px-3 py-1 bg-[var(--bg-card-sub)] border-b border-[var(--border-main)] text-[10px] text-[var(--text-secondary)] flex items-center space-x-1.5 shrink-0">
          <Info className="w-3 h-3 text-[var(--accent-blue)] shrink-0" />
          <span className="truncate">{mapped.notes}</span>
        </div>
      )}

      {/* TradingView Widget Container */}
      <div className="relative flex-1 w-full min-h-0" style={{ height: heightStyle }}>
        {loadError && (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-card-sub)] text-[var(--color-red)] text-xs p-4">
            {loadError}
          </div>
        )}
        <div id={containerIdRef.current} className="w-full h-full" />
      </div>

      {/* Footer Attribution Notice */}
      {!hideHeaderFooter && (
        <div className="px-3 py-1 bg-[var(--bg-card-sub)] border-t border-[var(--border-main)] text-[10px] text-[var(--text-secondary)] flex flex-wrap items-center justify-between gap-1 shrink-0">
          <div>
            Powered by <strong>TradingView</strong>. Candlestick drawing and indicators stream via TradingView CDN.
          </div>
          <div className="font-mono text-[10px] text-[var(--text-muted)]">
            Strategy signals & simulated paper execution stream via Delta Exchange India engine.
          </div>
        </div>
      )}
    </div>
  );
};
