import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Cpu,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Save,
  RotateCcw,
  Activity,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { BollingerStrategyConfig, StrategyRecord } from '../types/trading';

interface Props {
  selectedPair: string;
}

const DEFAULT_BOLLINGER_CONFIG: BollingerStrategyConfig = {
  name: 'AUREVIAN BOLLINGER BAND BREAKOUT',
  trendTimeframe: '1h',
  entryTimeframe: '15m',
  tradeDirection: 'BOTH',
  bollinger: {
    period: 20,
    stdDev: 2.0,
    basis: 'SMA',
    squeezeLookback: 20,
    squeezeThresholdPercentile: 20,
  },
  trendFilter: {
    enabled: true,
    indicator: 'EMA',
    period: 200,
  },
  volumeFilter: {
    enabled: true,
    period: 20,
  },
  risk: {
    atrPeriod: 14,
    atrMultiplierSL: 1.5,
    riskToReward: 2.0,
    riskPercentage: 2.0,
  },
};

export const StrategyEngineSection: React.FC<Props> = ({ selectedPair }) => {
  const [strategies, setStrategies] = useState<StrategyRecord[]>([]);
  const [selectedStrategyId, setSelectedStrategyId] = useState('aurevian-bollinger-breakout');
  const [evaluating, setEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState<any>(null);
  const [timeframe, setTimeframe] = useState('15m');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Parameter drawer / configuration state
  const [showConfigDrawer, setShowConfigDrawer] = useState(false);
  const [bbConfig, setBbConfig] = useState<BollingerStrategyConfig>(DEFAULT_BOLLINGER_CONFIG);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load strategies list
  const loadStrategies = async () => {
    try {
      const list = await api.getStrategies();
      setStrategies(list);
      // If the Bollinger strategy exists in DB with config_json, sync config
      const bbRecord = list.find(s => s.id === 'aurevian-bollinger-breakout');
      if (bbRecord && bbRecord.config_json) {
        try {
          const parsed = JSON.parse(bbRecord.config_json);
          setBbConfig(prev => ({ ...prev, ...parsed }));
        } catch {
          // ignore parse error
        }
      }
    } catch (err) {
      console.error('Failed to load strategies:', err);
    }
  };

  useEffect(() => {
    loadStrategies();
  }, []);

  const runEvaluation = async () => {
    setEvaluating(true);
    try {
      const configOverride = selectedStrategyId === 'aurevian-bollinger-breakout' ? bbConfig : undefined;
      const data = await api.evaluateStrategy(selectedPair, selectedStrategyId, timeframe, configOverride);
      if (data?.result) {
        setEvalResult(data.result);
      }
    } catch (err) {
      console.error('Failed to evaluate strategy:', err);
    } finally {
      setEvaluating(false);
    }
  };

  useEffect(() => {
    runEvaluation();
    let interval: NodeJS.Timeout | null = null;
    if (autoRefresh) {
      interval = setInterval(runEvaluation, 6000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [selectedPair, selectedStrategyId, timeframe, autoRefresh, bbConfig]);

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      await api.updateStrategy('aurevian-bollinger-breakout', {
        config: bbConfig,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      runEvaluation();
    } catch (err) {
      console.error('Failed to save strategy parameters:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setBbConfig(DEFAULT_BOLLINGER_CONFIG);
  };

  const currentStrategyRecord = strategies.find(s => s.id === selectedStrategyId);

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto text-xs">
      {/* Strategy Switcher Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl shadow-xs transition-colors">
        <div className="flex items-center space-x-2">
          <Layers className="w-4 h-4 text-[var(--accent-blue)]" />
          <span className="font-semibold text-[var(--text-primary)]">Select Strategy:</span>
          <div className="flex flex-wrap gap-1.5 ml-2">
            <button
              onClick={() => setSelectedStrategyId('aurevian-bollinger-breakout')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                selectedStrategyId === 'aurevian-bollinger-breakout'
                  ? 'bg-[var(--accent-blue)] text-white shadow-xs'
                  : 'bg-[var(--bg-card-sub)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-main)]'
              }`}
            >
              AUREVIAN BOLLINGER BREAKOUT
            </button>
            <button
              onClick={() => setSelectedStrategyId('aurevian-smc-momentum')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                selectedStrategyId === 'aurevian-smc-momentum'
                  ? 'bg-[var(--accent-blue)] text-white shadow-xs'
                  : 'bg-[var(--bg-card-sub)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-main)]'
              }`}
            >
              AUREVIAN SMC MOMENTUM
            </button>
            {strategies
              .filter(s => s.id !== 'aurevian-bollinger-breakout' && s.id !== 'aurevian-smc-momentum')
              .map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedStrategyId(s.id)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                    selectedStrategyId === s.id
                      ? 'bg-[var(--accent-blue)] text-white shadow-xs'
                      : 'bg-[var(--bg-card-sub)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-main)]'
                  }`}
                >
                  {s.name}
                </button>
              ))}
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex items-center space-x-3">
          {/* Timeframe selector */}
          <div className="flex items-center space-x-1.5 bg-[var(--bg-card-sub)] border border-[var(--border-main)] px-2.5 py-1 rounded-lg">
            <span className="text-[var(--text-secondary)]">TF:</span>
            <select
              value={timeframe}
              onChange={e => setTimeframe(e.target.value)}
              className="bg-transparent text-[var(--text-primary)] font-mono outline-none cursor-pointer"
            >
              <option value="5m">5m</option>
              <option value="15m">15m</option>
              <option value="30m">30m</option>
              <option value="1H">1H</option>
            </select>
          </div>

          <label className="flex items-center space-x-1.5 cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={e => setAutoRefresh(e.target.checked)}
              className="rounded border-[var(--border-main)] text-[var(--accent-blue)] focus:ring-0"
            />
            <span>Auto-Eval (6s)</span>
          </label>

          <button
            onClick={runEvaluation}
            disabled={evaluating}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-[var(--bg-card-sub)] hover:border-[var(--border-sub)] border border-[var(--border-main)] rounded-lg text-[var(--text-primary)] font-medium transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${evaluating ? 'animate-spin text-[var(--accent-blue)]' : ''}`} />
            <span>{evaluating ? 'Evaluating...' : 'Eval Now'}</span>
          </button>
        </div>
      </div>

      {/* Strategy Title & Parameter Header */}
      <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl shadow-xs transition-colors flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Cpu className="w-5 h-5 text-[var(--accent-blue)]" />
            <h2 className="text-sm md:text-base font-bold text-[var(--text-primary)]">
              {selectedStrategyId === 'aurevian-bollinger-breakout'
                ? 'AUREVIAN BOLLINGER BAND BREAKOUT'
                : selectedStrategyId === 'aurevian-smc-momentum'
                ? 'AUREVIAN SMC MOMENTUM STRATEGY'
                : currentStrategyRecord?.name || 'CUSTOM STRATEGY'}
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] font-mono border border-[var(--accent-blue)]/20 font-semibold">
              BUILT-IN
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] bg-[var(--color-green)]/10 text-[var(--color-green)] font-mono border border-[var(--color-green)]/20 font-semibold">
              CLOSED CANDLE (NO REPAINT)
            </span>
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] mt-1.5 leading-relaxed max-w-4xl">
            {selectedStrategyId === 'aurevian-bollinger-breakout'
              ? 'Quantitative Volatility Squeeze Breakout with 1H EMA-200 Macro Trend Filter, Volume Expansion Confirmation, and ATR 14 Stop-Loss. Evaluated exclusively on confirmed closed candles (length - 2) to eliminate repainting.'
              : 'Quantitative Smart Money Concepts (BOS / CHoCH / Liquidity Sweep) validated by 1H EMA-200 trend filter and 15M RSI momentum. Closed-candle evaluation with zero lookahead bias.'}
          </p>
        </div>

        {selectedStrategyId === 'aurevian-bollinger-breakout' && (
          <button
            onClick={() => setShowConfigDrawer(!showConfigDrawer)}
            className="flex items-center space-x-2 px-3.5 py-2 bg-[var(--bg-card-sub)] hover:border-[var(--border-sub)] border border-[var(--border-main)] rounded-lg text-[var(--text-primary)] font-semibold transition-colors cursor-pointer shrink-0"
          >
            <SlidersHorizontal className="w-4 h-4 text-[var(--accent-blue)]" />
            <span>{showConfigDrawer ? 'Hide Parameters' : 'Configure Parameters'}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showConfigDrawer ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {/* Expandable Configuration Drawer for Bollinger Breakout */}
      {selectedStrategyId === 'aurevian-bollinger-breakout' && showConfigDrawer && (
        <div className="p-5 bg-[var(--bg-card)] border border-[var(--accent-blue)]/30 rounded-xl shadow-md space-y-4 transition-all">
          <div className="flex items-center justify-between border-b border-[var(--border-main)] pb-3">
            <div className="flex items-center space-x-2">
              <SlidersHorizontal className="w-4 h-4 text-[var(--accent-blue)]" />
              <span className="font-bold text-sm text-[var(--text-primary)]">
                Bollinger Band Breakout Parameters
              </span>
            </div>
            {saveSuccess && (
              <span className="text-[var(--color-green)] font-semibold flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Saved & Applied to Engine!</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Bollinger Period & StdDev */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-[var(--text-secondary)]">
                Bollinger Period
              </label>
              <input
                type="number"
                min={5}
                max={100}
                value={bbConfig.bollinger.period}
                onChange={e =>
                  setBbConfig({
                    ...bbConfig,
                    bollinger: { ...bbConfig.bollinger, period: parseInt(e.target.value) || 20 },
                  })
                }
                className="w-full bg-[var(--bg-main)] border border-[var(--border-main)] rounded-lg px-3 py-1.5 text-[var(--text-primary)] font-mono outline-none focus:border-[var(--accent-blue)]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-[var(--text-secondary)]">
                Standard Deviation (σ)
              </label>
              <input
                type="number"
                step="0.1"
                min={1}
                max={4}
                value={bbConfig.bollinger.stdDev}
                onChange={e =>
                  setBbConfig({
                    ...bbConfig,
                    bollinger: { ...bbConfig.bollinger, stdDev: parseFloat(e.target.value) || 2.0 },
                  })
                }
                className="w-full bg-[var(--bg-main)] border border-[var(--border-main)] rounded-lg px-3 py-1.5 text-[var(--text-primary)] font-mono outline-none focus:border-[var(--accent-blue)]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-[var(--text-secondary)]">
                Moving Average Basis
              </label>
              <select
                value={bbConfig.bollinger.basis}
                onChange={e =>
                  setBbConfig({
                    ...bbConfig,
                    bollinger: { ...bbConfig.bollinger, basis: e.target.value as 'SMA' | 'EMA' },
                  })
                }
                className="w-full bg-[var(--bg-main)] border border-[var(--border-main)] rounded-lg px-3 py-1.5 text-[var(--text-primary)] font-mono outline-none focus:border-[var(--accent-blue)]"
              >
                <option value="SMA">SMA (Simple Moving Average)</option>
                <option value="EMA">EMA (Exponential Moving Average)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-[var(--text-secondary)]">
                Trade Direction Mode
              </label>
              <select
                value={bbConfig.tradeDirection}
                onChange={e =>
                  setBbConfig({
                    ...bbConfig,
                    tradeDirection: e.target.value as 'BOTH' | 'LONG_ONLY' | 'SHORT_ONLY',
                  })
                }
                className="w-full bg-[var(--bg-main)] border border-[var(--border-main)] rounded-lg px-3 py-1.5 text-[var(--text-primary)] font-mono outline-none focus:border-[var(--accent-blue)]"
              >
                <option value="BOTH">Both Long & Short</option>
                <option value="LONG_ONLY">Long Only</option>
                <option value="SHORT_ONLY">Short Only</option>
              </select>
            </div>

            {/* Squeeze Settings */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-[var(--text-secondary)]">
                Squeeze Lookback (Candles)
              </label>
              <input
                type="number"
                min={5}
                max={50}
                value={bbConfig.bollinger.squeezeLookback}
                onChange={e =>
                  setBbConfig({
                    ...bbConfig,
                    bollinger: {
                      ...bbConfig.bollinger,
                      squeezeLookback: parseInt(e.target.value) || 20,
                    },
                  })
                }
                className="w-full bg-[var(--bg-main)] border border-[var(--border-main)] rounded-lg px-3 py-1.5 text-[var(--text-primary)] font-mono outline-none focus:border-[var(--accent-blue)]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-[var(--text-secondary)]">
                Squeeze Percentile Threshold (%)
              </label>
              <input
                type="number"
                min={5}
                max={50}
                value={bbConfig.bollinger.squeezeThresholdPercentile}
                onChange={e =>
                  setBbConfig({
                    ...bbConfig,
                    bollinger: {
                      ...bbConfig.bollinger,
                      squeezeThresholdPercentile: parseInt(e.target.value) || 20,
                    },
                  })
                }
                className="w-full bg-[var(--bg-main)] border border-[var(--border-main)] rounded-lg px-3 py-1.5 text-[var(--text-primary)] font-mono outline-none focus:border-[var(--accent-blue)]"
              />
            </div>

            {/* 1H Trend Filter */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-medium text-[var(--text-secondary)]">
                  1H Trend Filter (EMA)
                </label>
                <label className="flex items-center space-x-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bbConfig.trendFilter.enabled}
                    onChange={e =>
                      setBbConfig({
                        ...bbConfig,
                        trendFilter: { ...bbConfig.trendFilter, enabled: e.target.checked },
                      })
                    }
                    className="rounded text-[var(--accent-blue)]"
                  />
                  <span className="text-[10px] text-[var(--text-secondary)]">Enabled</span>
                </label>
              </div>
              <input
                type="number"
                min={20}
                max={500}
                value={bbConfig.trendFilter.period}
                onChange={e =>
                  setBbConfig({
                    ...bbConfig,
                    trendFilter: { ...bbConfig.trendFilter, period: parseInt(e.target.value) || 200 },
                  })
                }
                disabled={!bbConfig.trendFilter.enabled}
                className="w-full bg-[var(--bg-main)] border border-[var(--border-main)] rounded-lg px-3 py-1.5 text-[var(--text-primary)] font-mono outline-none focus:border-[var(--accent-blue)] disabled:opacity-50"
              />
            </div>

            {/* Volume Filter */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-medium text-[var(--text-secondary)]">
                  Volume Surge Filter
                </label>
                <label className="flex items-center space-x-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bbConfig.volumeFilter.enabled}
                    onChange={e =>
                      setBbConfig({
                        ...bbConfig,
                        volumeFilter: { ...bbConfig.volumeFilter, enabled: e.target.checked },
                      })
                    }
                    className="rounded text-[var(--accent-blue)]"
                  />
                  <span className="text-[10px] text-[var(--text-secondary)]">Enabled</span>
                </label>
              </div>
              <input
                type="number"
                min={5}
                max={100}
                value={bbConfig.volumeFilter.period}
                onChange={e =>
                  setBbConfig({
                    ...bbConfig,
                    volumeFilter: { ...bbConfig.volumeFilter, period: parseInt(e.target.value) || 20 },
                  })
                }
                disabled={!bbConfig.volumeFilter.enabled}
                className="w-full bg-[var(--bg-main)] border border-[var(--border-main)] rounded-lg px-3 py-1.5 text-[var(--text-primary)] font-mono outline-none focus:border-[var(--accent-blue)] disabled:opacity-50"
              />
            </div>

            {/* ATR Multiplier SL */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-[var(--text-secondary)]">
                ATR 14 Stop-Loss Multiplier
              </label>
              <input
                type="number"
                step="0.1"
                min={0.5}
                max={5}
                value={bbConfig.risk.atrMultiplierSL}
                onChange={e =>
                  setBbConfig({
                    ...bbConfig,
                    risk: { ...bbConfig.risk, atrMultiplierSL: parseFloat(e.target.value) || 1.5 },
                  })
                }
                className="w-full bg-[var(--bg-main)] border border-[var(--border-main)] rounded-lg px-3 py-1.5 text-[var(--text-primary)] font-mono outline-none focus:border-[var(--accent-blue)]"
              />
            </div>

            {/* Risk to Reward */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-[var(--text-secondary)]">
                Risk-to-Reward Ratio (1 : X)
              </label>
              <input
                type="number"
                step="0.1"
                min={1}
                max={10}
                value={bbConfig.risk.riskToReward}
                onChange={e =>
                  setBbConfig({
                    ...bbConfig,
                    risk: { ...bbConfig.risk, riskToReward: parseFloat(e.target.value) || 2.0 },
                  })
                }
                className="w-full bg-[var(--bg-main)] border border-[var(--border-main)] rounded-lg px-3 py-1.5 text-[var(--text-primary)] font-mono outline-none focus:border-[var(--accent-blue)]"
              />
            </div>

            {/* Risk Percentage */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-[var(--text-secondary)]">
                Risk Per Trade (% Virtual Balance)
              </label>
              <input
                type="number"
                step="0.5"
                min={0.5}
                max={10}
                value={bbConfig.risk.riskPercentage}
                onChange={e =>
                  setBbConfig({
                    ...bbConfig,
                    risk: { ...bbConfig.risk, riskPercentage: parseFloat(e.target.value) || 2.0 },
                  })
                }
                className="w-full bg-[var(--bg-main)] border border-[var(--border-main)] rounded-lg px-3 py-1.5 text-[var(--text-primary)] font-mono outline-none focus:border-[var(--accent-blue)]"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[var(--border-main)]">
            <button
              onClick={handleResetDefaults}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-main)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-sub)] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>
            <button
              onClick={handleSaveConfig}
              disabled={saving}
              className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-[var(--accent-blue)] hover:opacity-90 text-white font-semibold transition-opacity cursor-pointer disabled:opacity-50 shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Save & Apply to Engine'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Live Strategy Output Banner */}
      {evalResult && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Signal Card */}
          <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl shadow-xs flex flex-col justify-between transition-colors">
            <div className="text-[11px] text-[var(--text-secondary)] uppercase tracking-wider font-mono font-medium flex items-center justify-between">
              <span>Current Signal</span>
              <Activity className="w-3.5 h-3.5 text-[var(--accent-blue)]" />
            </div>
            <div className="my-2 flex items-center space-x-2">
              {evalResult.signal === 'LONG' && (
                <div className="flex items-center space-x-1.5 text-2xl font-bold text-[var(--color-green)] font-mono">
                  <ArrowUpRight className="w-6 h-6" />
                  <span>LONG</span>
                </div>
              )}
              {evalResult.signal === 'SHORT' && (
                <div className="flex items-center space-x-1.5 text-2xl font-bold text-[var(--color-red)] font-mono">
                  <ArrowDownRight className="w-6 h-6" />
                  <span>SHORT</span>
                </div>
              )}
              {evalResult.signal === 'HOLD' && (
                <div className="text-xl font-light text-[var(--text-secondary)] font-mono">
                  WAITING SETUP
                </div>
              )}
            </div>
            <div className="text-[11px] text-[var(--text-secondary)] font-mono truncate">
              Last Closed: {new Date(evalResult.candleTime * 1000).toLocaleTimeString()}
            </div>
          </div>

          {/* Bollinger Band Metrics Card */}
          {selectedStrategyId === 'aurevian-bollinger-breakout' ? (
            <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl shadow-xs flex flex-col justify-between transition-colors">
              <div className="text-[11px] text-[var(--text-secondary)] uppercase tracking-wider font-mono font-medium">
                Bollinger Bands (20, 2)
              </div>
              <div className="my-1.5 space-y-0.5 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-[var(--color-red)]">Upper:</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    ${evalResult.metrics?.bbUpper ? evalResult.metrics.bbUpper.toFixed(2) : '--'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--accent-blue)]">Mid (SMA):</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    ${evalResult.metrics?.bbMiddle ? evalResult.metrics.bbMiddle.toFixed(2) : '--'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-green)]">Lower:</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    ${evalResult.metrics?.bbLower ? evalResult.metrics.bbLower.toFixed(2) : '--'}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)] font-mono pt-1 border-t border-[var(--border-main)]">
                <span>BandWidth:</span>
                <span className="font-bold text-[var(--text-primary)]">
                  {evalResult.metrics?.bandWidth ? `${evalResult.metrics.bandWidth.toFixed(2)}%` : '--'}
                </span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                    evalResult.metrics?.isSqueeze
                      ? 'bg-[var(--accent-purple)]/20 text-[var(--accent-purple)]'
                      : 'bg-[var(--bg-card-sub)] text-[var(--text-secondary)]'
                  }`}
                >
                  {evalResult.metrics?.isSqueeze ? 'SQUEEZE' : 'NORMAL'}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl shadow-xs flex flex-col justify-between transition-colors">
              <div className="text-[11px] text-[var(--text-secondary)] uppercase tracking-wider font-mono font-medium">
                15M Momentum & Volume
              </div>
              <div className="my-2 text-xl font-bold font-mono text-[var(--text-primary)]">
                RSI: {evalResult.metrics?.rsi?.toFixed(1) || '--'}
              </div>
              <div className="text-[11px] text-[var(--text-secondary)] font-mono">
                Vol: {evalResult.metrics?.currentVolume ? evalResult.metrics.currentVolume.toFixed(1) : '--'} (SMA:{' '}
                {evalResult.metrics?.volumeSma20?.toFixed(1) || '--'})
              </div>
            </div>
          )}

          {/* 1H Trend Confirmation */}
          <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl shadow-xs flex flex-col justify-between transition-colors">
            <div className="text-[11px] text-[var(--text-secondary)] uppercase tracking-wider font-mono font-medium">
              1H Macro Trend Filter
            </div>
            <div className="my-2 text-xl font-mono text-[var(--text-primary)] flex items-center space-x-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  evalResult.metrics?.trendStatus === 'BULLISH'
                    ? 'bg-[var(--color-green)]'
                    : evalResult.metrics?.trendStatus === 'BEARISH'
                    ? 'bg-[var(--color-red)]'
                    : 'bg-zinc-400'
                }`}
              />
              <span className="font-bold">{evalResult.metrics?.trendStatus || 'ANALYZING'}</span>
            </div>
            <div className="text-[11px] text-[var(--text-secondary)] font-mono">
              1H EMA 200: ${evalResult.metrics?.trendEma200?.toFixed(2) || '--'}
            </div>
          </div>

          {/* Sizing & Risk Parameters */}
          <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl shadow-xs flex flex-col justify-between transition-colors">
            <div className="text-[11px] text-[var(--text-secondary)] uppercase tracking-wider font-mono font-medium">
              Risk-to-Reward Ratio
            </div>
            <div className="my-2 text-xl font-mono text-[var(--accent-blue)] font-bold">
              1 : {evalResult.riskReward || '2.0'}
            </div>
            <div className="text-[11px] text-[var(--text-secondary)] font-mono">
              ATR (14): ${evalResult.atr?.toFixed(2) || '--'} (SL: 1.5x)
            </div>
          </div>
        </div>
      )}

      {/* Step-by-Step Reasons & Detailed Conditions Checklist */}
      {evalResult && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Passed Conditions Checklist */}
          <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl shadow-xs transition-colors">
            <div className="flex items-center space-x-2 text-xs font-bold text-[var(--color-green)] uppercase tracking-wider mb-3">
              <CheckCircle2 className="w-4 h-4" />
              <span>Passed Conditions ({evalResult.passedConditions?.length || 0})</span>
            </div>
            <div className="space-y-2">
              {evalResult.passedConditions?.length > 0 ? (
                evalResult.passedConditions.map((cond: string, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-start space-x-2 text-xs p-2.5 rounded-lg bg-[var(--bg-card-sub)] border border-[var(--border-main)]"
                  >
                    <span className="text-[var(--color-green)] font-bold mt-0.5">✓</span>
                    <span className="text-[var(--text-primary)] font-medium leading-relaxed">
                      {cond}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-[var(--text-secondary)] italic p-2">
                  No entry conditions passed on the latest closed candle.
                </div>
              )}
            </div>
          </div>

          {/* Failed / Unmet Conditions Checklist */}
          <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl shadow-xs transition-colors">
            <div className="flex items-center space-x-2 text-xs font-bold text-[var(--color-red)] uppercase tracking-wider mb-3">
              <XCircle className="w-4 h-4" />
              <span>Unmet Conditions ({evalResult.failedConditions?.length || 0})</span>
            </div>
            <div className="space-y-2">
              {evalResult.failedConditions?.length > 0 ? (
                evalResult.failedConditions.map((cond: string, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-start space-x-2 text-xs p-2.5 rounded-lg bg-[var(--bg-card-sub)] border border-[var(--border-main)]"
                  >
                    <span className="text-[var(--color-red)] font-bold mt-0.5">✕</span>
                    <span className="text-[var(--text-secondary)] leading-relaxed">{cond}</span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-[var(--color-green)] italic p-2 font-medium">
                  All 5 conditions passed! Valid breakout setup active for paper trading execution.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Engine Diagnostic Summary */}
      {evalResult && (
        <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl shadow-xs text-xs space-y-2 transition-colors">
          <div className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[var(--accent-blue)]" />
            <span>Engine Diagnostic Log & Rationale:</span>
          </div>
          <div className="text-[var(--text-secondary)] leading-relaxed">
            {evalResult.reasons?.join(' ')}
          </div>
          {evalResult.metrics?.latestSmcEvent && (
            <div className="pt-2 text-[11px] text-[var(--text-secondary)] font-mono border-t border-[var(--border-main)]">
              Latest SMC Event: {evalResult.metrics.latestSmcEvent}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
