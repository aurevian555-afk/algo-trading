import React, { useState, useEffect, useRef } from 'react';
import { InstrumentInfo, ChartCustomizationConfig } from '../types/trading';
import { TradingViewChart } from '../components/TradingViewChart';
import { CustomChartCanvas } from '../components/CustomChartCanvas';
import { ChartCustomizationDrawer } from '../components/ChartCustomizationDrawer';
import { useTheme } from '../context/ThemeContext';
import { getStoredChartConfig, saveChartConfig } from '../utils/chartConfig';
import {
  Maximize2,
  Minimize2,
  Radio,
  CheckCircle2,
  SlidersHorizontal,
  Layers,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api';

interface Props {
  tickers: InstrumentInfo[];
  selectedPair: string;
  onSelectPair: (p: string) => void;
}

export type ChartMode = 'CANVAS' | 'WIDGET';

export const LiveMarketSection: React.FC<Props> = ({ tickers, selectedPair, onSelectPair }) => {
  const { isDark } = useTheme();
  const [timeframe, setTimeframe] = useState('15m');
  const [chartMode, setChartMode] = useState<ChartMode>('CANVAS');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load stored chart customization config for selected pair
  const [chartConfig, setChartConfig] = useState<ChartCustomizationConfig>(() =>
    getStoredChartConfig(selectedPair, isDark)
  );

  // Sync config when pair changes
  useEffect(() => {
    setChartConfig(getStoredChartConfig(selectedPair, isDark));
  }, [selectedPair]);

  const currentTicker = tickers.find(t => t.pair === selectedPair) || tickers[0];
  const timeframes = ['1m', '5m', '15m', '30m', '1H', '4H', '1D', '1W'];

  // Synchronize pair with backend bot / strategy engine when changed
  const handleSelectPair = (pair: string) => {
    onSelectPair(pair);
    api.configureBot({ pair, timeframe }).catch(() => {});
  };

  const handleSelectTimeframe = (tf: string) => {
    setTimeframe(tf);
    api.configureBot({ pair: selectedPair, timeframe: tf }).catch(() => {});
  };

  const handleConfigChange = (newConfig: ChartCustomizationConfig) => {
    setChartConfig(newConfig);
    saveChartConfig(selectedPair, newConfig);
  };

  // Toggle browser and in-app full-screen mode
  const toggleFullScreen = async () => {
    try {
      if (!isFullScreen) {
        if (containerRef.current?.requestFullscreen) {
          await containerRef.current.requestFullscreen().catch(() => {});
        } else if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen().catch(() => {});
        }
        setIsFullScreen(true);
      } else {
        if (document.fullscreenElement && document.exitFullscreen) {
          await document.exitFullscreen().catch(() => {});
        }
        setIsFullScreen(false);
      }
    } catch {
      setIsFullScreen(!isFullScreen);
    }
  };

  // Listen to browser fullscreenchange & Escape / F key
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isBrowserFs = Boolean(document.fullscreenElement);
      setIsFullScreen(isBrowserFs);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isDrawerOpen) {
          setIsDrawerOpen(false);
          return;
        }
        if (isFullScreen) {
          if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
          }
          setIsFullScreen(false);
        }
      } else if (
        (e.key === 'f' || e.key === 'F') &&
        !e.ctrlKey &&
        !e.metaKey &&
        !(e.target as HTMLElement)?.matches('input, textarea, select')
      ) {
        toggleFullScreen();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullScreen, isDrawerOpen]);

  return (
    <div
      ref={containerRef}
      className={`transition-colors select-none flex flex-col ${
        isFullScreen
          ? 'fixed inset-0 z-50 w-screen h-screen bg-[var(--bg-main)] p-2 space-y-1.5'
          : 'h-[calc(100vh-3.5rem)] w-full p-2 space-y-1.5 overflow-hidden'
      }`}
    >
      {/* Sleek High-Density Top Control Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg shadow-xs shrink-0 text-xs">
        {/* Left: Quick Pair Switcher Buttons */}
        <div className="flex items-center space-x-1.5 overflow-x-auto custom-scrollbar py-0.5">
          {tickers.map(ticker => {
            const isSelected = selectedPair === ticker.pair;
            const isUp = ticker.change24hPct >= 0;
            return (
              <button
                key={ticker.pair}
                onClick={() => handleSelectPair(ticker.pair)}
                title={`Switch to ${ticker.name} on Delta Exchange`}
                className={`flex items-center space-x-2 px-2.5 py-1 rounded text-xs transition-all font-mono cursor-pointer border ${
                  isSelected
                    ? 'bg-[var(--bg-card-sub)] border-[var(--accent-blue)] text-[var(--text-primary)] font-semibold shadow-xs ring-1 ring-[var(--accent-blue)]/20'
                    : 'bg-[var(--bg-card)] border-[var(--border-main)] text-[var(--text-secondary)] hover:border-[var(--border-sub)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span className="font-semibold">{ticker.pair}</span>
                <span className="text-[var(--text-primary)]">
                  ${ticker.price > 0 ? ticker.price.toLocaleString(undefined, { minimumFractionDigits: ticker.priceDecimals, maximumFractionDigits: ticker.priceDecimals }) : '--'}
                </span>
                <span className={`text-[11px] font-semibold ${isUp ? 'text-[var(--color-green)]' : 'text-[var(--color-red)]'}`}>
                  {isUp ? '+' : ''}{ticker.change24hPct.toFixed(2)}%
                </span>
              </button>
            );
          })}
        </div>

        {/* Center: Dual Mode Switcher & Timeframe Selectors */}
        <div className="flex items-center space-x-2">
          {/* Dual Engine Mode Toggle */}
          <div className="flex items-center bg-[var(--bg-card-sub)] p-0.5 rounded border border-[var(--border-main)] text-[11px]">
            <button
              onClick={() => setChartMode('CANVAS')}
              className={`flex items-center space-x-1 px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                chartMode === 'CANVAS'
                  ? 'bg-[var(--bg-card)] text-[var(--accent-blue)] font-semibold shadow-xs border border-[var(--border-main)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              title="AUREVIAN Precision Canvas (Deep candle, wick, grid and indicator customization)"
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>AUREVIAN Canvas</span>
            </button>
            <button
              onClick={() => setChartMode('WIDGET')}
              className={`flex items-center space-x-1 px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                chartMode === 'WIDGET'
                  ? 'bg-[var(--bg-card)] text-[var(--accent-blue)] font-semibold shadow-xs border border-[var(--border-main)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              title="TradingView Advanced Chart Widget (Official TV Toolbar and Drawing tools)"
            >
              <Layers className="w-3 h-3" />
              <span>TradingView Widget</span>
            </button>
          </div>

          {/* Timeframe Selectors */}
          <div className="hidden sm:flex items-center space-x-1">
            <div className="flex items-center bg-[var(--bg-card-sub)] p-0.5 rounded border border-[var(--border-main)]">
              {timeframes.map(tf => (
                <button
                  key={tf}
                  onClick={() => handleSelectTimeframe(tf)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                    timeframe === tf
                      ? 'bg-[var(--bg-card)] text-[var(--accent-blue)] font-semibold shadow-xs border border-[var(--border-main)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Quick BB Toggle + Customization Drawer Trigger + Delta Status + Full Screen Toggle */}
        <div className="flex items-center space-x-2">
          {/* Quick Bollinger Bands Toggle */}
          <button
            onClick={() => {
              const next = {
                ...chartConfig,
                indicators: {
                  ...chartConfig.indicators,
                  bollingerBands: {
                    ...chartConfig.indicators.bollingerBands,
                    enabled: !chartConfig.indicators.bollingerBands.enabled,
                  },
                },
              };
              handleConfigChange(next);
            }}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-mono font-semibold transition-colors border cursor-pointer ${
              chartConfig.indicators.bollingerBands.enabled
                ? 'bg-[var(--accent-blue)] text-white border-[var(--accent-blue)] shadow-xs'
                : 'bg-[var(--bg-card)] border-[var(--border-main)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-sub)]'
            }`}
            title="Toggle Bollinger Bands (Upper, Middle, Lower) on Chart"
          >
            <span>BB (20, 2)</span>
          </button>

          {/* Customize Chart Button */}
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="flex items-center space-x-1.5 px-2.5 py-1 bg-[var(--bg-card)] hover:bg-[var(--bg-card-sub)] text-[var(--text-primary)] border border-[var(--border-main)] rounded text-xs font-semibold transition-colors shadow-xs cursor-pointer"
            title="Open Candle, Canvas, Indicator, and Theme Customization"
          >
            <Sparkles className="w-3.5 h-3.5 text-[var(--accent-blue)]" />
            <span>Customize Chart</span>
          </button>

          {/* Delta Exchange Market Data Status */}
          <div className="hidden lg:flex items-center space-x-2 text-[11px] font-mono bg-[var(--bg-card-sub)] px-2.5 py-1 rounded border border-[var(--border-main)] text-[var(--text-secondary)]">
            <Radio className="w-3.5 h-3.5 text-[var(--color-green)] animate-pulse shrink-0" />
            <span className="font-medium text-[var(--text-primary)]">Delta Exchange India</span>
            <span className="text-[var(--border-main)]">|</span>
            <span>Bid: <strong className="text-[var(--text-primary)]">${currentTicker?.bid > 0 ? currentTicker.bid.toFixed(currentTicker.priceDecimals) : '--'}</strong></span>
            <span>Ask: <strong className="text-[var(--text-primary)]">${currentTicker?.ask > 0 ? currentTicker.ask.toFixed(currentTicker.priceDecimals) : '--'}</strong></span>
            <span className="text-[var(--color-green)] font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-[var(--color-green)]" />
              LIVE
            </span>
          </div>

          {/* Full Screen Button */}
          <button
            onClick={toggleFullScreen}
            title={isFullScreen ? 'Exit Full Screen [Escape]' : 'Expand Chart to Full Screen [F]'}
            className="flex items-center space-x-1.5 px-3 py-1 bg-[var(--accent-blue)] hover:opacity-90 text-white rounded text-xs font-semibold transition-all shadow-xs cursor-pointer shrink-0"
          >
            {isFullScreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Exit Full Screen</span>
                <span className="text-[10px] opacity-75 font-mono ml-0.5">[Esc]</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Full Screen</span>
                <span className="text-[10px] opacity-75 font-mono ml-0.5">[F]</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Full-Workspace Chart Viewport */}
      <div className="flex-1 w-full min-h-0 relative rounded-lg overflow-hidden flex flex-col border border-[var(--border-main)]">
        {chartMode === 'CANVAS' ? (
          <CustomChartCanvas
            pair={selectedPair}
            timeframe={timeframe}
            config={chartConfig}
            height="100%"
            isFullScreen={isFullScreen}
          />
        ) : (
          <TradingViewChart
            pair={selectedPair}
            timeframe={timeframe}
            height="100%"
            isFullScreen={isFullScreen}
            hideHeaderFooter={isFullScreen}
          />
        )}
      </div>

      {/* Customization Drawer Modal */}
      <ChartCustomizationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        pair={selectedPair}
        config={chartConfig}
        onChangeConfig={handleConfigChange}
      />
    </div>
  );
};
