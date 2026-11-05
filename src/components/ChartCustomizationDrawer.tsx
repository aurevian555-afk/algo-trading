import React, { useState } from 'react';
import {
  X,
  Sliders,
  Palette,
  Eye,
  RotateCcw,
  Save,
  Check,
  Layers,
  Sparkles,
} from 'lucide-react';
import { ChartCustomizationConfig } from '../types/trading';
import { THEME_PRESETS, saveChartConfig, resetChartConfigToPreset } from '../utils/chartConfig';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  pair: string;
  config: ChartCustomizationConfig;
  onChangeConfig: (newConfig: ChartCustomizationConfig) => void;
}

type TabType = 'CANDLES' | 'CANVAS' | 'INDICATORS' | 'THEMES';

export const ChartCustomizationDrawer: React.FC<Props> = ({
  isOpen,
  onClose,
  pair,
  config,
  onChangeConfig,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('CANDLES');
  const [savedNotice, setSavedNotice] = useState(false);

  if (!isOpen) return null;

  const handleUpdate = (updater: (prev: ChartCustomizationConfig) => ChartCustomizationConfig) => {
    const next = updater(config);
    onChangeConfig(next);
    saveChartConfig(pair, next);
  };

  const handlePresetSelect = (preset: 'aurevian_black' | 'tradingview_dark' | 'tradingview_light') => {
    const next = resetChartConfigToPreset(pair, preset);
    onChangeConfig(next);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  const handleResetToDefault = () => {
    const next = resetChartConfigToPreset(pair, 'aurevian_black');
    onChangeConfig(next);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[var(--bg-card)] border-l border-[var(--border-main)] shadow-2xl flex flex-col text-xs transition-colors select-none">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border-main)] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Palette className="w-4 h-4 text-[var(--accent-blue)]" />
          <h2 className="text-sm font-bold text-[var(--text-primary)]">
            Chart Appearance & Styling
          </h2>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-main)] text-[var(--text-secondary)] font-mono">
            {pair}
          </span>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)] rounded transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-[var(--border-main)] bg-[var(--bg-main)] px-2 pt-2 gap-1 overflow-x-auto custom-scrollbar">
        {[
          { id: 'CANDLES', label: 'Candles', icon: Sliders },
          { id: 'CANVAS', label: 'Canvas', icon: Palette },
          { id: 'INDICATORS', label: 'Indicators', icon: Layers },
          { id: 'THEMES', label: 'Themes & Presets', icon: Sparkles },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-t font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[var(--bg-card)] text-[var(--accent-blue)] border-t-2 border-[var(--accent-blue)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
        {/* ================= CANDLES TAB ================= */}
        {activeTab === 'CANDLES' && (
          <div className="space-y-4">
            {/* Bullish Candle Styling */}
            <div className="space-y-2 border border-[var(--border-main)] p-3 rounded-lg bg-[var(--bg-main)]">
              <h3 className="font-bold text-[var(--text-primary)] flex items-center justify-between">
                <span>Bullish (Up) Candles</span>
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: config.candles.upColor }} />
              </h3>

              <div className="grid grid-cols-3 gap-2 pt-1">
                <div>
                  <label className="text-[10px] text-[var(--text-secondary)] block mb-1">Body</label>
                  <div className="flex items-center space-x-1.5">
                    <input
                      type="color"
                      value={config.candles.upColor}
                      onChange={e =>
                        handleUpdate(prev => ({
                          ...prev,
                          themePreset: 'custom',
                          candles: { ...prev.candles, upColor: e.target.value },
                        }))
                      }
                      className="w-7 h-7 rounded border border-[var(--border-main)] cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={config.candles.upColor}
                      onChange={e =>
                        handleUpdate(prev => ({
                          ...prev,
                          themePreset: 'custom',
                          candles: { ...prev.candles, upColor: e.target.value },
                        }))
                      }
                      className="w-16 bg-[var(--bg-card)] border border-[var(--border-main)] rounded px-1.5 py-1 text-[10px] font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-[var(--text-secondary)] block mb-1">Border</label>
                  <div className="flex items-center space-x-1.5">
                    <input
                      type="color"
                      value={config.candles.borderUpColor}
                      onChange={e =>
                        handleUpdate(prev => ({
                          ...prev,
                          themePreset: 'custom',
                          candles: { ...prev.candles, borderUpColor: e.target.value },
                        }))
                      }
                      className="w-7 h-7 rounded border border-[var(--border-main)] cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={config.candles.borderUpColor}
                      onChange={e =>
                        handleUpdate(prev => ({
                          ...prev,
                          themePreset: 'custom',
                          candles: { ...prev.candles, borderUpColor: e.target.value },
                        }))
                      }
                      className="w-16 bg-[var(--bg-card)] border border-[var(--border-main)] rounded px-1.5 py-1 text-[10px] font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-[var(--text-secondary)] block mb-1">Wick</label>
                  <div className="flex items-center space-x-1.5">
                    <input
                      type="color"
                      value={config.candles.wickUpColor}
                      onChange={e =>
                        handleUpdate(prev => ({
                          ...prev,
                          themePreset: 'custom',
                          candles: { ...prev.candles, wickUpColor: e.target.value },
                        }))
                      }
                      className="w-7 h-7 rounded border border-[var(--border-main)] cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={config.candles.wickUpColor}
                      onChange={e =>
                        handleUpdate(prev => ({
                          ...prev,
                          themePreset: 'custom',
                          candles: { ...prev.candles, wickUpColor: e.target.value },
                        }))
                      }
                      className="w-16 bg-[var(--bg-card)] border border-[var(--border-main)] rounded px-1.5 py-1 text-[10px] font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Bearish Candle Styling */}
            <div className="space-y-2 border border-[var(--border-main)] p-3 rounded-lg bg-[var(--bg-main)]">
              <h3 className="font-bold text-[var(--text-primary)] flex items-center justify-between">
                <span>Bearish (Down) Candles</span>
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: config.candles.downColor }} />
              </h3>

              <div className="grid grid-cols-3 gap-2 pt-1">
                <div>
                  <label className="text-[10px] text-[var(--text-secondary)] block mb-1">Body</label>
                  <div className="flex items-center space-x-1.5">
                    <input
                      type="color"
                      value={config.candles.downColor}
                      onChange={e =>
                        handleUpdate(prev => ({
                          ...prev,
                          themePreset: 'custom',
                          candles: { ...prev.candles, downColor: e.target.value },
                        }))
                      }
                      className="w-7 h-7 rounded border border-[var(--border-main)] cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={config.candles.downColor}
                      onChange={e =>
                        handleUpdate(prev => ({
                          ...prev,
                          themePreset: 'custom',
                          candles: { ...prev.candles, downColor: e.target.value },
                        }))
                      }
                      className="w-16 bg-[var(--bg-card)] border border-[var(--border-main)] rounded px-1.5 py-1 text-[10px] font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-[var(--text-secondary)] block mb-1">Border</label>
                  <div className="flex items-center space-x-1.5">
                    <input
                      type="color"
                      value={config.candles.borderDownColor}
                      onChange={e =>
                        handleUpdate(prev => ({
                          ...prev,
                          themePreset: 'custom',
                          candles: { ...prev.candles, borderDownColor: e.target.value },
                        }))
                      }
                      className="w-7 h-7 rounded border border-[var(--border-main)] cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={config.candles.borderDownColor}
                      onChange={e =>
                        handleUpdate(prev => ({
                          ...prev,
                          themePreset: 'custom',
                          candles: { ...prev.candles, borderDownColor: e.target.value },
                        }))
                      }
                      className="w-16 bg-[var(--bg-card)] border border-[var(--border-main)] rounded px-1.5 py-1 text-[10px] font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-[var(--text-secondary)] block mb-1">Wick</label>
                  <div className="flex items-center space-x-1.5">
                    <input
                      type="color"
                      value={config.candles.wickDownColor}
                      onChange={e =>
                        handleUpdate(prev => ({
                          ...prev,
                          themePreset: 'custom',
                          candles: { ...prev.candles, wickDownColor: e.target.value },
                        }))
                      }
                      className="w-7 h-7 rounded border border-[var(--border-main)] cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={config.candles.wickDownColor}
                      onChange={e =>
                        handleUpdate(prev => ({
                          ...prev,
                          themePreset: 'custom',
                          candles: { ...prev.candles, wickDownColor: e.target.value },
                        }))
                      }
                      className="w-16 bg-[var(--bg-card)] border border-[var(--border-main)] rounded px-1.5 py-1 text-[10px] font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Candle Settings */}
            <div className="space-y-3 border border-[var(--border-main)] p-3 rounded-lg bg-[var(--bg-main)]">
              <h3 className="font-bold text-[var(--text-primary)]">Geometry & Visibility</h3>

              <div className="space-y-2">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-[var(--text-secondary)]">Hollow Candlesticks</span>
                  <input
                    type="checkbox"
                    checked={config.candles.hollow}
                    onChange={e =>
                      handleUpdate(prev => ({
                        ...prev,
                        themePreset: 'custom',
                        candles: { ...prev.candles, hollow: e.target.checked },
                      }))
                    }
                    className="rounded accent-[var(--accent-blue)] cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-[var(--text-secondary)]">Show Candle Borders</span>
                  <input
                    type="checkbox"
                    checked={config.candles.showBorders}
                    onChange={e =>
                      handleUpdate(prev => ({
                        ...prev,
                        themePreset: 'custom',
                        candles: { ...prev.candles, showBorders: e.target.checked },
                      }))
                    }
                    className="rounded accent-[var(--accent-blue)] cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-[var(--text-secondary)]">Show Candle Wicks</span>
                  <input
                    type="checkbox"
                    checked={config.candles.showWicks}
                    onChange={e =>
                      handleUpdate(prev => ({
                        ...prev,
                        themePreset: 'custom',
                        candles: { ...prev.candles, showWicks: e.target.checked },
                      }))
                    }
                    className="rounded accent-[var(--accent-blue)] cursor-pointer"
                  />
                </label>

                <div className="pt-2 border-t border-[var(--border-main)]">
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-[var(--text-secondary)]">Candle Bar Spacing</span>
                    <span className="font-mono text-[var(--text-primary)]">{config.candles.barSpacing}px</span>
                  </div>
                  <input
                    type="range"
                    min={4}
                    max={24}
                    step={1}
                    value={config.candles.barSpacing}
                    onChange={e =>
                      handleUpdate(prev => ({
                        ...prev,
                        themePreset: 'custom',
                        candles: { ...prev.candles, barSpacing: parseInt(e.target.value, 10) },
                      }))
                    }
                    className="w-full accent-[var(--accent-blue)] cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Volume Bar Styling */}
            <div className="space-y-3 border border-[var(--border-main)] p-3 rounded-lg bg-[var(--bg-main)]">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-[var(--text-primary)]">Volume Histogram</h3>
                <label className="flex items-center space-x-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.volume.visible}
                    onChange={e =>
                      handleUpdate(prev => ({
                        ...prev,
                        themePreset: 'custom',
                        volume: { ...prev.volume, visible: e.target.checked },
                      }))
                    }
                    className="rounded accent-[var(--accent-blue)] cursor-pointer"
                  />
                  <span className="text-[10px] text-[var(--text-secondary)]">Show Volume</span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="text-[10px] text-[var(--text-secondary)] block mb-1">Bullish Volume</label>
                  <div className="flex items-center space-x-1.5">
                    <input
                      type="color"
                      value={config.volume.upColor.slice(0, 7)}
                      onChange={e =>
                        handleUpdate(prev => ({
                          ...prev,
                          themePreset: 'custom',
                          volume: { ...prev.volume, upColor: e.target.value + '80' },
                        }))
                      }
                      className="w-7 h-7 rounded border border-[var(--border-main)] cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={config.volume.upColor}
                      onChange={e =>
                        handleUpdate(prev => ({
                          ...prev,
                          themePreset: 'custom',
                          volume: { ...prev.volume, upColor: e.target.value },
                        }))
                      }
                      className="w-20 bg-[var(--bg-card)] border border-[var(--border-main)] rounded px-1.5 py-1 text-[10px] font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-[var(--text-secondary)] block mb-1">Bearish Volume</label>
                  <div className="flex items-center space-x-1.5">
                    <input
                      type="color"
                      value={config.volume.downColor.slice(0, 7)}
                      onChange={e =>
                        handleUpdate(prev => ({
                          ...prev,
                          themePreset: 'custom',
                          volume: { ...prev.volume, downColor: e.target.value + '80' },
                        }))
                      }
                      className="w-7 h-7 rounded border border-[var(--border-main)] cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={config.volume.downColor}
                      onChange={e =>
                        handleUpdate(prev => ({
                          ...prev,
                          themePreset: 'custom',
                          volume: { ...prev.volume, downColor: e.target.value },
                        }))
                      }
                      className="w-20 bg-[var(--bg-card)] border border-[var(--border-main)] rounded px-1.5 py-1 text-[10px] font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= CANVAS TAB ================= */}
        {activeTab === 'CANVAS' && (
          <div className="space-y-4">
            {/* Background Colors */}
            <div className="space-y-2 border border-[var(--border-main)] p-3 rounded-lg bg-[var(--bg-main)]">
              <h3 className="font-bold text-[var(--text-primary)]">Backgrounds</h3>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[10px] text-[var(--text-secondary)] block mb-1">Chart Background</label>
                  <div className="flex items-center space-x-1.5">
                    <input
                      type="color"
                      value={config.canvas.backgroundColor}
                      onChange={e =>
                        handleUpdate(prev => ({
                          ...prev,
                          themePreset: 'custom',
                          canvas: { ...prev.canvas, backgroundColor: e.target.value },
                        }))
                      }
                      className="w-7 h-7 rounded border border-[var(--border-main)] cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={config.canvas.backgroundColor}
                      onChange={e =>
                        handleUpdate(prev => ({
                          ...prev,
                          themePreset: 'custom',
                          canvas: { ...prev.canvas, backgroundColor: e.target.value },
                        }))
                      }
                      className="w-20 bg-[var(--bg-card)] border border-[var(--border-main)] rounded px-1.5 py-1 text-[10px] font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-[var(--text-secondary)] block mb-1">Plot Area Background</label>
                  <div className="flex items-center space-x-1.5">
                    <input
                      type="color"
                      value={config.canvas.plotBackgroundColor}
                      onChange={e =>
                        handleUpdate(prev => ({
                          ...prev,
                          themePreset: 'custom',
                          canvas: { ...prev.canvas, plotBackgroundColor: e.target.value },
                        }))
                      }
                      className="w-7 h-7 rounded border border-[var(--border-main)] cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={config.canvas.plotBackgroundColor}
                      onChange={e =>
                        handleUpdate(prev => ({
                          ...prev,
                          themePreset: 'custom',
                          canvas: { ...prev.canvas, plotBackgroundColor: e.target.value },
                        }))
                      }
                      className="w-20 bg-[var(--bg-card)] border border-[var(--border-main)] rounded px-1.5 py-1 text-[10px] font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Grid Lines */}
            <div className="space-y-3 border border-[var(--border-main)] p-3 rounded-lg bg-[var(--bg-main)]">
              <h3 className="font-bold text-[var(--text-primary)]">Grid Lines</h3>

              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[var(--text-secondary)]">Grid Line Color</span>
                <div className="flex items-center space-x-1.5">
                  <input
                    type="color"
                    value={config.canvas.gridColor}
                    onChange={e =>
                      handleUpdate(prev => ({
                        ...prev,
                        themePreset: 'custom',
                        canvas: { ...prev.canvas, gridColor: e.target.value },
                      }))
                    }
                    className="w-6 h-6 rounded border border-[var(--border-main)] cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={config.canvas.gridColor}
                    onChange={e =>
                      handleUpdate(prev => ({
                        ...prev,
                        themePreset: 'custom',
                        canvas: { ...prev.canvas, gridColor: e.target.value },
                      }))
                    }
                    className="w-16 bg-[var(--bg-card)] border border-[var(--border-main)] rounded px-1.5 py-0.5 text-[10px] font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-[var(--text-secondary)]">Horizontal Grid Visible</span>
                  <input
                    type="checkbox"
                    checked={config.canvas.horzGridVisible}
                    onChange={e =>
                      handleUpdate(prev => ({
                        ...prev,
                        themePreset: 'custom',
                        canvas: { ...prev.canvas, horzGridVisible: e.target.checked },
                      }))
                    }
                    className="rounded accent-[var(--accent-blue)] cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-[var(--text-secondary)]">Vertical Grid Visible</span>
                  <input
                    type="checkbox"
                    checked={config.canvas.vertGridVisible}
                    onChange={e =>
                      handleUpdate(prev => ({
                        ...prev,
                        themePreset: 'custom',
                        canvas: { ...prev.canvas, vertGridVisible: e.target.checked },
                      }))
                    }
                    className="rounded accent-[var(--accent-blue)] cursor-pointer"
                  />
                </label>
              </div>
            </div>

            {/* Scales & Crosshairs */}
            <div className="space-y-3 border border-[var(--border-main)] p-3 rounded-lg bg-[var(--bg-main)]">
              <h3 className="font-bold text-[var(--text-primary)]">Scales & Crosshairs</h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-[var(--text-secondary)] block mb-1">Scale Text Color</label>
                  <div className="flex items-center space-x-1.5">
                    <input
                      type="color"
                      value={config.canvas.scaleTextColor}
                      onChange={e =>
                        handleUpdate(prev => ({
                          ...prev,
                          themePreset: 'custom',
                          canvas: { ...prev.canvas, scaleTextColor: e.target.value },
                        }))
                      }
                      className="w-6 h-6 rounded border border-[var(--border-main)] cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={config.canvas.scaleTextColor}
                      onChange={e =>
                        handleUpdate(prev => ({
                          ...prev,
                          themePreset: 'custom',
                          canvas: { ...prev.canvas, scaleTextColor: e.target.value },
                        }))
                      }
                      className="w-16 bg-[var(--bg-card)] border border-[var(--border-main)] rounded px-1.5 py-0.5 text-[10px] font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-[var(--text-secondary)] block mb-1">Crosshair Color</label>
                  <div className="flex items-center space-x-1.5">
                    <input
                      type="color"
                      value={config.canvas.crosshairColor}
                      onChange={e =>
                        handleUpdate(prev => ({
                          ...prev,
                          themePreset: 'custom',
                          canvas: { ...prev.canvas, crosshairColor: e.target.value },
                        }))
                      }
                      className="w-6 h-6 rounded border border-[var(--border-main)] cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={config.canvas.crosshairColor}
                      onChange={e =>
                        handleUpdate(prev => ({
                          ...prev,
                          themePreset: 'custom',
                          canvas: { ...prev.canvas, crosshairColor: e.target.value },
                        }))
                      }
                      className="w-16 bg-[var(--bg-card)] border border-[var(--border-main)] rounded px-1.5 py-0.5 text-[10px] font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= INDICATORS TAB ================= */}
        {activeTab === 'INDICATORS' && (
          <div className="space-y-4">
            {/* Moving Averages */}
            <div className="space-y-3 border border-[var(--border-main)] p-3 rounded-lg bg-[var(--bg-main)]">
              <h3 className="font-bold text-[var(--text-primary)]">Exponential Moving Averages (EMA)</h3>

              {(['ema20', 'ema50', 'ema100', 'ema200'] as const).map(k => {
                const ind = config.indicators[k];
                return (
                  <div key={k} className="flex items-center justify-between p-2 rounded bg-[var(--bg-card)] border border-[var(--border-main)]">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ind.enabled}
                        onChange={e =>
                          handleUpdate(prev => ({
                            ...prev,
                            themePreset: 'custom',
                            indicators: {
                              ...prev.indicators,
                              [k]: { ...prev.indicators[k], enabled: e.target.checked },
                            },
                          }))
                        }
                        className="rounded accent-[var(--accent-blue)] cursor-pointer"
                      />
                      <span className="font-semibold text-[var(--text-primary)] uppercase">{k}</span>
                    </label>

                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] text-[var(--text-secondary)]">Period:</span>
                      <input
                        type="number"
                        min={2}
                        max={500}
                        value={ind.period}
                        onChange={e =>
                          handleUpdate(prev => ({
                            ...prev,
                            themePreset: 'custom',
                            indicators: {
                              ...prev.indicators,
                              [k]: { ...prev.indicators[k], period: parseInt(e.target.value, 10) || 20 },
                            },
                          }))
                        }
                        className="w-12 bg-[var(--bg-main)] border border-[var(--border-main)] rounded px-1.5 py-0.5 text-[10px] font-mono text-center"
                      />

                      <input
                        type="color"
                        value={ind.color}
                        onChange={e =>
                          handleUpdate(prev => ({
                            ...prev,
                            themePreset: 'custom',
                            indicators: {
                              ...prev.indicators,
                              [k]: { ...prev.indicators[k], color: e.target.value },
                            },
                          }))
                        }
                        className="w-6 h-6 rounded border border-[var(--border-main)] cursor-pointer bg-transparent"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* SMA & Bollinger Bands */}
            <div className="space-y-3 border border-[var(--border-main)] p-3 rounded-lg bg-[var(--bg-main)]">
              <h3 className="font-bold text-[var(--text-primary)]">Simple MA & Bollinger Bands</h3>

              {/* SMA */}
              <div className="flex items-center justify-between p-2 rounded bg-[var(--bg-card)] border border-[var(--border-main)]">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.indicators.sma.enabled}
                    onChange={e =>
                      handleUpdate(prev => ({
                        ...prev,
                        themePreset: 'custom',
                        indicators: {
                          ...prev.indicators,
                          sma: { ...prev.indicators.sma, enabled: e.target.checked },
                        },
                      }))
                    }
                    className="rounded accent-[var(--accent-blue)] cursor-pointer"
                  />
                  <span className="font-semibold text-[var(--text-primary)]">SMA</span>
                </label>

                <div className="flex items-center space-x-2">
                  <span className="text-[10px] text-[var(--text-secondary)]">Period:</span>
                  <input
                    type="number"
                    min={2}
                    max={500}
                    value={config.indicators.sma.period}
                    onChange={e =>
                      handleUpdate(prev => ({
                        ...prev,
                        themePreset: 'custom',
                        indicators: {
                          ...prev.indicators,
                          sma: { ...prev.indicators.sma, period: parseInt(e.target.value, 10) || 20 },
                        },
                      }))
                    }
                    className="w-12 bg-[var(--bg-main)] border border-[var(--border-main)] rounded px-1.5 py-0.5 text-[10px] font-mono text-center"
                  />
                  <input
                    type="color"
                    value={config.indicators.sma.color}
                    onChange={e =>
                      handleUpdate(prev => ({
                        ...prev,
                        themePreset: 'custom',
                        indicators: {
                          ...prev.indicators,
                          sma: { ...prev.indicators.sma, color: e.target.value },
                        },
                      }))
                    }
                    className="w-6 h-6 rounded border border-[var(--border-main)] cursor-pointer bg-transparent"
                  />
                </div>
              </div>

              {/* Bollinger Bands */}
              <div className="p-2 rounded bg-[var(--bg-card)] border border-[var(--border-main)] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.indicators.bollingerBands.enabled}
                      onChange={e =>
                        handleUpdate(prev => ({
                          ...prev,
                          themePreset: 'custom',
                          indicators: {
                            ...prev.indicators,
                            bollingerBands: { ...prev.indicators.bollingerBands, enabled: e.target.checked },
                          },
                        }))
                      }
                      className="rounded accent-[var(--accent-blue)] cursor-pointer"
                    />
                    <span className="font-semibold text-[var(--text-primary)]">Bollinger Bands (BB)</span>
                  </label>

                  <div className="flex items-center space-x-1.5">
                    <input
                      type="color"
                      value={config.indicators.bollingerBands.upperColor}
                      onChange={e =>
                        handleUpdate(prev => ({
                          ...prev,
                          themePreset: 'custom',
                          indicators: {
                            ...prev.indicators,
                            bollingerBands: { ...prev.indicators.bollingerBands, upperColor: e.target.value, lowerColor: e.target.value },
                          },
                        }))
                      }
                      className="w-6 h-6 rounded border border-[var(--border-main)] cursor-pointer bg-transparent"
                      title="Bands color"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)] pt-1 border-t border-[var(--border-main)]">
                  <span>Period (20) & StdDev (2.0)</span>
                  <span className="font-mono text-[10px] text-[var(--text-primary)]">Upper / Middle / Lower</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= THEMES & PRESETS TAB ================= */}
        {activeTab === 'THEMES' && (
          <div className="space-y-4">
            <div className="space-y-3">
              <h3 className="font-bold text-[var(--text-primary)]">Curated Theme Presets</h3>
              <p className="text-[var(--text-secondary)] text-[11px]">
                Instantly switch the chart canvas, candle palettes, scale typography, and gridline styling.
              </p>

              {/* Theme 1: AUREVIAN Black */}
              <button
                onClick={() => handlePresetSelect('aurevian_black')}
                className={`w-full p-3 rounded-lg border text-left transition-all flex items-center justify-between cursor-pointer ${
                  config.themePreset === 'aurevian_black'
                    ? 'border-[var(--accent-blue)] bg-[var(--accent-blue)]/10 ring-1 ring-[var(--accent-blue)]'
                    : 'border-[var(--border-main)] bg-[var(--bg-main)] hover:border-[var(--border-sub)]'
                }`}
              >
                <div>
                  <div className="font-bold text-[var(--text-primary)]">AUREVIAN Black (Default Dark)</div>
                  <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                    Deep #050505 background with high-contrast emerald green & red candles.
                  </div>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-3.5 h-3.5 rounded bg-[#050505] border border-white/20" />
                  <span className="w-3.5 h-3.5 rounded bg-[#22c55e]" />
                  <span className="w-3.5 h-3.5 rounded bg-[#ef4444]" />
                </div>
              </button>

              {/* Theme 2: Classic TradingView Dark */}
              <button
                onClick={() => handlePresetSelect('tradingview_dark')}
                className={`w-full p-3 rounded-lg border text-left transition-all flex items-center justify-between cursor-pointer ${
                  config.themePreset === 'tradingview_dark'
                    ? 'border-[var(--accent-blue)] bg-[var(--accent-blue)]/10 ring-1 ring-[var(--accent-blue)]'
                    : 'border-[var(--border-main)] bg-[var(--bg-main)] hover:border-[var(--border-sub)]'
                }`}
              >
                <div>
                  <div className="font-bold text-[var(--text-primary)]">Classic TradingView Dark</div>
                  <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                    Signature #131722 dark navy slate with official teal (#089981) and crimson (#F23645).
                  </div>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-3.5 h-3.5 rounded bg-[#131722] border border-white/20" />
                  <span className="w-3.5 h-3.5 rounded bg-[#089981]" />
                  <span className="w-3.5 h-3.5 rounded bg-[#f23645]" />
                </div>
              </button>

              {/* Theme 3: Classic TradingView Light */}
              <button
                onClick={() => handlePresetSelect('tradingview_light')}
                className={`w-full p-3 rounded-lg border text-left transition-all flex items-center justify-between cursor-pointer ${
                  config.themePreset === 'tradingview_light'
                    ? 'border-[var(--accent-blue)] bg-[var(--accent-blue)]/10 ring-1 ring-[var(--accent-blue)]'
                    : 'border-[var(--border-main)] bg-[var(--bg-main)] hover:border-[var(--border-sub)]'
                }`}
              >
                <div>
                  <div className="font-bold text-[var(--text-primary)]">Classic TradingView Light</div>
                  <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                    Crisp white #FFFFFF background with clean high-legibility dark scales.
                  </div>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-3.5 h-3.5 rounded bg-[#ffffff] border border-black/20" />
                  <span className="w-3.5 h-3.5 rounded bg-[#26a69a]" />
                  <span className="w-3.5 h-3.5 rounded bg-[#ef5350]" />
                </div>
              </button>
            </div>

            {/* Custom Theme Status Indicator */}
            {config.themePreset === 'custom' && (
              <div className="p-2.5 bg-[var(--accent-purple)]/10 border border-[var(--accent-purple)]/30 rounded-lg text-[11px] text-[var(--text-primary)] flex items-center space-x-2">
                <Sliders className="w-3.5 h-3.5 text-[var(--accent-purple)] shrink-0" />
                <span>Custom Theme is currently active with your tailored candle and canvas settings.</span>
              </div>
            )}

            {/* Actions: Reset to Default */}
            <div className="pt-3 border-t border-[var(--border-main)] space-y-2">
              <button
                onClick={handleResetToDefault}
                className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-[var(--bg-main)] hover:bg-[var(--bg-card-sub)] border border-[var(--border-main)] rounded-lg font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset {pair} Chart Settings to Default</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Drawer Footer with Notification */}
      <div className="p-3 border-t border-[var(--border-main)] bg-[var(--bg-main)] flex items-center justify-between">
        <div className="flex items-center space-x-1.5 text-[11px] text-[var(--text-secondary)]">
          {savedNotice ? (
            <span className="text-[var(--color-green)] font-semibold flex items-center space-x-1">
              <Check className="w-3.5 h-3.5" />
              <span>Preferences saved for {pair}</span>
            </span>
          ) : (
            <span>Auto-saved to local browser storage</span>
          )}
        </div>

        <button
          onClick={onClose}
          className="px-4 py-1.5 bg-[var(--accent-blue)] hover:opacity-90 text-white rounded font-semibold transition-opacity cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  );
};
