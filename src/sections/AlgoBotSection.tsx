import React, { useState, useEffect } from 'react';
import { BotState, BotLog, Position, StrategyRecord, Signal, Trade } from '../types/trading';
import { api } from '../services/api';
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Bot,
  Activity,
  AlertOctagon,
  Terminal,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  XCircle,
  X,
  TrendingUp,
  Layers,
  ShieldAlert,
} from 'lucide-react';

interface Props {
  selectedPair: string;
}

export const AlgoBotSection: React.FC<Props> = ({ selectedPair }) => {
  const [botState, setBotState] = useState<BotState | null>(null);
  const [logs, setLogs] = useState<BotLog[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [strategies, setStrategies] = useState<StrategyRecord[]>([]);
  const [recentSignals, setRecentSignals] = useState<Signal[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);

  // Execution configuration state
  const [targetPair, setTargetPair] = useState(selectedPair);
  const [targetStrategy, setTargetStrategy] = useState('aurevian-bollinger-breakout');
  const [targetTimeframe, setTargetTimeframe] = useState('15m');
  const [riskPerTrade, setRiskPerTrade] = useState(2.0);
  const [maxPositions, setMaxPositions] = useState(1);
  const [actionLoading, setActionLoading] = useState(false);
  const [logFilter, setLogFilter] = useState<'ALL' | 'TRADE' | 'SIGNAL' | 'WARN' | 'ERROR'>('ALL');

  const fetchBotStatus = async () => {
    try {
      const [botData, sigData, tradeData] = await Promise.all([
        api.getBotState(),
        api.getSignals(10),
        api.getTrades({ limit: 50 }),
      ]);

      if (botData?.botState) {
        setBotState(botData.botState);
        setPositions(botData.openPositions || []);
        setLogs(botData.recentLogs || []);
      }
      if (Array.isArray(sigData)) {
        setRecentSignals(sigData);
      }
      if (tradeData) {
        setTrades(tradeData);
      }
    } catch (err) {
      console.error('Failed to sync bot status:', err);
    }
  };

  const fetchStrategies = async () => {
    try {
      const list = await api.getStrategies();
      setStrategies(list);
    } catch (err) {
      console.error('Failed to fetch strategies:', err);
    }
  };

  useEffect(() => {
    fetchStrategies();
    fetchBotStatus();
    const interval = setInterval(fetchBotStatus, 2500);
    return () => clearInterval(interval);
  }, []);

  // Sync selectedPair if user switches globally and bot is stopped
  useEffect(() => {
    if (botState?.status === 'STOPPED') {
      setTargetPair(selectedPair);
    }
  }, [selectedPair, botState?.status]);

  const handleStart = async () => {
    setActionLoading(true);
    try {
      await api.startBot({
        pair: targetPair,
        strategy_id: targetStrategy,
        timeframe: targetTimeframe,
        risk_per_trade: riskPerTrade,
        max_positions: maxPositions,
      });
      await fetchBotStatus();
    } catch (err) {
      console.error('Start error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePause = async () => {
    setActionLoading(true);
    try {
      await api.pauseBot('User clicked pause button');
      await fetchBotStatus();
    } catch (err) {
      console.error('Pause error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResume = async () => {
    setActionLoading(true);
    try {
      await api.resumeBot();
      await fetchBotStatus();
    } catch (err) {
      console.error('Resume error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStop = async () => {
    setActionLoading(true);
    try {
      await api.stopBot('User clicked stop button');
      await fetchBotStatus();
    } catch (err) {
      console.error('Stop error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestart = async () => {
    setActionLoading(true);
    try {
      await api.restartBot();
      await fetchBotStatus();
    } catch (err) {
      console.error('Restart error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleManualClosePosition = async (posId: string) => {
    try {
      await api.closePosition(posId);
      await fetchBotStatus();
    } catch (err) {
      console.error('Manual close error:', err);
    }
  };

  const currentStatus = botState?.status || 'STOPPED';
  const isStopped = currentStatus === 'STOPPED';
  const isPaused = currentStatus === 'PAUSED';
  const isError = currentStatus === 'ERROR';
  const isActiveRunning = !isStopped && !isPaused && !isError;

  // Accurate Status badge styling
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'WORKING':
        return {
          label: 'WORKING (EVALUATING)',
          className: 'text-[var(--color-green)] bg-[var(--color-green)]/10 border-[var(--color-green)]/30',
          dot: 'bg-[var(--color-green)] animate-pulse',
        };
      case 'POSITION_OPEN':
        return {
          label: 'POSITION OPEN (MONITORING)',
          className: 'text-[var(--accent-blue)] bg-[var(--accent-blue)]/10 border-[var(--accent-blue)]/30',
          dot: 'bg-[var(--accent-blue)] animate-pulse',
        };
      case 'WAITING_FOR_SETUP':
        return {
          label: 'WAITING FOR SETUP',
          className: 'text-sky-500 bg-sky-500/10 border-sky-500/30',
          dot: 'bg-sky-500',
        };
      case 'STARTING':
        return {
          label: 'STARTING UP',
          className: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
          dot: 'bg-amber-500 animate-spin',
        };
      case 'PAUSED':
        return {
          label: 'PAUSED (MONITORING EXITS)',
          className: 'text-purple-500 bg-purple-500/10 border-purple-500/30',
          dot: 'bg-purple-500',
        };
      case 'ERROR':
        return {
          label: 'ERROR',
          className: 'text-[var(--color-red)] bg-[var(--color-red)]/10 border-[var(--color-red)]/30',
          dot: 'bg-[var(--color-red)]',
        };
      case 'STOPPED':
      default:
        return {
          label: 'STOPPED',
          className: 'text-[var(--text-secondary)] bg-[var(--bg-card-sub)] border-[var(--border-main)]',
          dot: 'bg-zinc-400',
        };
    }
  };

  const badge = getStatusBadge(currentStatus);

  // Stats calculation
  const totalTrades = trades.length;
  const winTrades = trades.filter(t => t.net_pnl > 0);
  const winRate = totalTrades > 0 ? (winTrades.length / totalTrades) * 100 : null;
  const netPnlSum = trades.reduce((sum, t) => sum + t.net_pnl, 0);

  const filteredLogs = logs.filter(l => {
    if (logFilter === 'ALL') return true;
    return l.level === logFilter;
  });

  const latestSignal = recentSignals[0] || null;

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto text-xs">
      {/* Bot Control Ribbon */}
      <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl shadow-xs flex flex-wrap items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center space-x-2">
            <Bot className="w-5 h-5 text-[var(--accent-blue)]" />
            <h2 className="text-sm md:text-base font-bold text-[var(--text-primary)]">
              ALGO BOT — AUTOMATED PAPER TRADING DAEMON
            </h2>
            <div
              className={`flex items-center space-x-1.5 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold border ${badge.className}`}
            >
              <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
              <span>{badge.label}</span>
            </div>
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] mt-1 max-w-3xl leading-relaxed">
            Autonomous server-authoritative paper trading engine. Runs a continuous 5-second evaluation loop on Delta Exchange closed candles, enforcing volatility squeeze breakouts, dynamic ATR 14 stop losses, and 1:2 risk-to-reward targets.
          </p>
        </div>

        {/* Lifecycle Action Buttons */}
        <div className="flex items-center space-x-2 shrink-0">
          {isStopped || isError ? (
            <button
              onClick={handleStart}
              disabled={actionLoading}
              className="flex items-center space-x-1.5 px-4 py-2 bg-[var(--color-green)] hover:opacity-90 text-white rounded-lg font-bold transition-all disabled:opacity-50 shadow-xs cursor-pointer"
              title="Start persistent 5s paper-trading engine"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>START BOT</span>
            </button>
          ) : isPaused ? (
            <button
              onClick={handleResume}
              disabled={actionLoading}
              className="flex items-center space-x-1.5 px-4 py-2 bg-[var(--accent-blue)] hover:opacity-90 text-white rounded-lg font-bold transition-all disabled:opacity-50 shadow-xs cursor-pointer"
              title="Resume strategy evaluation and new trade entries"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>RESUME BOT</span>
            </button>
          ) : (
            <button
              onClick={handlePause}
              disabled={actionLoading}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold transition-all disabled:opacity-50 shadow-xs cursor-pointer"
              title="Pause new trade entries while continuing SL/TP monitoring"
            >
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span>PAUSE BOT</span>
            </button>
          )}

          {!isStopped && (
            <button
              onClick={handleStop}
              disabled={actionLoading}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-[var(--color-red)] hover:opacity-90 text-white rounded-lg font-bold transition-all disabled:opacity-50 shadow-xs cursor-pointer"
              title="Stop bot execution loops"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>STOP BOT</span>
            </button>
          )}

          <button
            onClick={handleRestart}
            disabled={actionLoading}
            className="flex items-center space-x-1.5 px-3 py-2 bg-[var(--bg-card-sub)] hover:border-[var(--border-sub)] border border-[var(--border-main)] rounded-lg text-[var(--text-primary)] font-medium transition-colors disabled:opacity-50 cursor-pointer"
            title="Restart bot daemon"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
            <span>Restart</span>
          </button>
        </div>
      </div>

      {/* Execution Parameter Configuration Form */}
      <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl shadow-xs space-y-3 transition-colors">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center space-x-1.5">
            <Layers className="w-3.5 h-3.5 text-[var(--accent-blue)]" />
            <span>Bot Execution Configuration</span>
          </div>
          {isActiveRunning && (
            <span className="text-[10px] text-[var(--color-green)] font-mono font-semibold">
              ● Active execution parameters locked during runtime
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          <div>
            <label className="text-[11px] text-[var(--text-secondary)] font-medium block mb-1">
              Trading Instrument
            </label>
            <select
              value={targetPair}
              onChange={e => setTargetPair(e.target.value)}
              disabled={isActiveRunning || isPaused}
              className="w-full bg-[var(--bg-main)] border border-[var(--border-main)] rounded-lg px-3 py-1.5 text-[var(--text-primary)] font-mono outline-none disabled:opacity-60"
            >
              <option value="ETHUSD">ETHUSD (Ethereum Spot/Perp)</option>
              <option value="BTCUSD.P">BTCUSD.P (Bitcoin Perpetual)</option>
              <option value="PAXGUSD.P">PAXGUSD.P (PAX Gold Perp)</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] text-[var(--text-secondary)] font-medium block mb-1">
              Strategy Algorithm
            </label>
            <select
              value={targetStrategy}
              onChange={e => setTargetStrategy(e.target.value)}
              disabled={isActiveRunning || isPaused}
              className="w-full bg-[var(--bg-main)] border border-[var(--border-main)] rounded-lg px-3 py-1.5 text-[var(--text-primary)] outline-none disabled:opacity-60"
            >
              <option value="aurevian-bollinger-breakout">AUREVIAN BOLLINGER BREAKOUT</option>
              <option value="aurevian-smc-momentum">AUREVIAN SMC MOMENTUM</option>
              {strategies
                .filter(s => s.id !== 'aurevian-bollinger-breakout' && s.id !== 'aurevian-smc-momentum')
                .map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] text-[var(--text-secondary)] font-medium block mb-1">
              Entry Timeframe
            </label>
            <select
              value={targetTimeframe}
              onChange={e => setTargetTimeframe(e.target.value)}
              disabled={isActiveRunning || isPaused}
              className="w-full bg-[var(--bg-main)] border border-[var(--border-main)] rounded-lg px-3 py-1.5 text-[var(--text-primary)] font-mono outline-none disabled:opacity-60"
            >
              {['5m', '15m', '30m', '1H'].map(tf => (
                <option key={tf} value={tf}>{tf}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] text-[var(--text-secondary)] font-medium block mb-1">
              Risk Per Trade (% Virtual Equity)
            </label>
            <input
              type="number"
              step="0.5"
              min="0.5"
              max="10"
              value={riskPerTrade}
              onChange={e => setRiskPerTrade(parseFloat(e.target.value) || 2.0)}
              disabled={isActiveRunning || isPaused}
              className="w-full bg-[var(--bg-main)] border border-[var(--border-main)] rounded-lg px-3 py-1.5 text-[var(--text-primary)] font-mono outline-none disabled:opacity-60"
            />
          </div>

          <div>
            <label className="text-[11px] text-[var(--text-secondary)] font-medium block mb-1">
              Max Open Positions
            </label>
            <input
              type="number"
              min="1"
              max="5"
              value={maxPositions}
              onChange={e => setMaxPositions(parseInt(e.target.value) || 1)}
              disabled={isActiveRunning || isPaused}
              className="w-full bg-[var(--bg-main)] border border-[var(--border-main)] rounded-lg px-3 py-1.5 text-[var(--text-primary)] font-mono outline-none disabled:opacity-60"
            />
          </div>
        </div>
      </div>

      {/* Telemetry & Performance KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metric 1: Market Feed & Strategy Loop */}
        <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl shadow-xs flex flex-col justify-between transition-colors">
          <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-mono font-medium flex items-center justify-between">
            <span>Market Data Feed</span>
            <span className="text-[var(--color-green)] font-semibold">5s CYCLE</span>
          </div>
          <div className="my-1.5 font-mono">
            <div className="text-base font-bold text-[var(--text-primary)]">
              {botState?.pair || targetPair}
            </div>
            <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
              Sync: {botState?.last_data_time ? new Date(botState.last_data_time).toLocaleTimeString() : '--'}
            </div>
          </div>
          <div className="text-[11px] text-[var(--color-green)] font-medium flex items-center space-x-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Delta Exchange Public Data</span>
          </div>
        </div>

        {/* Metric 2: Last Strategy Evaluation */}
        <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl shadow-xs flex flex-col justify-between transition-colors">
          <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-mono font-medium flex items-center justify-between">
            <span>Strategy Evaluation</span>
            <Activity className="w-3.5 h-3.5 text-[var(--accent-blue)]" />
          </div>
          <div className="my-1.5 font-mono">
            <div className="text-base font-bold text-[var(--text-primary)]">
              {botState?.last_eval_time ? new Date(botState.last_eval_time).toLocaleTimeString() : 'Awaiting start'}
            </div>
            <div className="text-[11px] text-[var(--text-secondary)] mt-0.5 truncate">
              {botState?.strategy_id === 'aurevian-bollinger-breakout' ? 'BB Breakout (20, 2)' : 'SMC Momentum'}
            </div>
          </div>
          <div className="text-[11px] text-[var(--text-secondary)] font-mono">
            Timeframe: <strong>{botState?.timeframe || targetTimeframe}</strong>
          </div>
        </div>

        {/* Metric 3: Latest Signal */}
        <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl shadow-xs flex flex-col justify-between transition-colors">
          <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-mono font-medium">
            Latest Signal
          </div>
          <div className="my-1.5 flex items-center space-x-2">
            {latestSignal ? (
              <>
                {latestSignal.direction === 'LONG' ? (
                  <div className="flex items-center space-x-1 text-base font-bold text-[var(--color-green)] font-mono">
                    <ArrowUpRight className="w-5 h-5" />
                    <span>LONG @ ${latestSignal.entry_price.toFixed(2)}</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1 text-base font-bold text-[var(--color-red)] font-mono">
                    <ArrowDownRight className="w-5 h-5" />
                    <span>SHORT @ ${latestSignal.entry_price.toFixed(2)}</span>
                  </div>
                )}
              </>
            ) : (
              <span className="text-sm font-light text-[var(--text-secondary)] font-mono">
                No signal in window
              </span>
            )}
          </div>
          <div className="text-[11px] text-[var(--text-secondary)] font-mono">
            {latestSignal ? `SL: $${latestSignal.stop_loss.toFixed(2)} | TP: $${latestSignal.take_profit.toFixed(2)}` : 'Scanning closed candles'}
          </div>
        </div>

        {/* Metric 4: Paper Account Performance */}
        <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl shadow-xs flex flex-col justify-between transition-colors">
          <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-mono font-medium flex items-center justify-between">
            <span>Paper Performance</span>
            <TrendingUp className="w-3.5 h-3.5 text-[var(--color-green)]" />
          </div>
          <div className="my-1.5 font-mono">
            <div className="text-base font-bold text-[var(--text-primary)]">
              ${(botState?.balance || 10000.0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
              Net P&L:{' '}
              <span className={netPnlSum >= 0 ? 'text-[var(--color-green)] font-semibold' : 'text-[var(--color-red)] font-semibold'}>
                {netPnlSum >= 0 ? '+' : ''}${netPnlSum.toFixed(2)}
              </span>
            </div>
          </div>
          <div className="text-[11px] text-[var(--text-secondary)] font-mono">
            Win Rate: <strong>{winRate !== null ? `${winRate.toFixed(1)}%` : '--'}</strong> ({totalTrades} trades)
          </div>
        </div>
      </div>

      {/* Engine Status & Diagnostic Message Box */}
      <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl shadow-xs text-xs space-y-1.5 transition-colors">
        <div className="font-bold text-[var(--text-primary)] flex items-center space-x-1.5">
          <Activity className="w-4 h-4 text-[var(--accent-blue)]" />
          <span>Execution Engine Status & Diagnostic:</span>
        </div>
        <p className="text-[var(--text-secondary)] leading-relaxed font-mono">
          {botState?.last_reason || 'Bot initialized. Awaiting market evaluation cycle.'}
        </p>
        {botState?.error_message && (
          <div className="p-2.5 bg-[var(--color-red)]/10 border border-[var(--color-red)]/30 rounded-lg text-[var(--color-red)] flex items-center space-x-2">
            <AlertOctagon className="w-4 h-4 shrink-0" />
            <span className="font-medium">{botState.error_message}</span>
          </div>
        )}
      </div>

      {/* Active Open Positions Table */}
      <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl shadow-xs space-y-3 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-[var(--accent-blue)]" />
            <h3 className="font-bold text-sm text-[var(--text-primary)]">
              Active Virtual Paper Positions ({positions.length})
            </h3>
          </div>
          <span className="text-[10px] text-[var(--text-secondary)] font-mono">
            Real-time Stop Loss & Take Profit Monitoring (1.5s loop)
          </span>
        </div>

        {positions.length > 0 ? (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left font-mono">
              <thead>
                <tr className="border-b border-[var(--border-main)] text-[10px] text-[var(--text-secondary)] uppercase">
                  <th className="pb-2">Side</th>
                  <th className="pb-2">Pair</th>
                  <th className="pb-2">Entry Price</th>
                  <th className="pb-2">Current Price</th>
                  <th className="pb-2">Size</th>
                  <th className="pb-2">Stop Loss</th>
                  <th className="pb-2">Take Profit</th>
                  <th className="pb-2">Unrealized P&L</th>
                  <th className="pb-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-main)] text-xs">
                {positions.map(pos => {
                  const isLong = pos.direction === 'LONG';
                  const isProfitable = pos.unrealized_pnl >= 0;
                  return (
                    <tr key={pos.id} className="hover:bg-[var(--bg-card-sub)] transition-colors">
                      <td className="py-2.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            isLong
                              ? 'bg-[var(--color-green)]/15 text-[var(--color-green)]'
                              : 'bg-[var(--color-red)]/15 text-[var(--color-red)]'
                          }`}
                        >
                          {pos.direction}
                        </span>
                      </td>
                      <td className="py-2.5 font-bold text-[var(--text-primary)]">{pos.pair}</td>
                      <td className="py-2.5">${pos.entry_price.toFixed(2)}</td>
                      <td className="py-2.5">${pos.current_price.toFixed(2)}</td>
                      <td className="py-2.5">{pos.quantity}</td>
                      <td className="py-2.5 text-[var(--color-red)]">${pos.stop_loss.toFixed(2)}</td>
                      <td className="py-2.5 text-[var(--color-green)]">${pos.take_profit.toFixed(2)}</td>
                      <td className={`py-2.5 font-bold ${isProfitable ? 'text-[var(--color-green)]' : 'text-[var(--color-red)]'}`}>
                        {isProfitable ? '+' : ''}${pos.unrealized_pnl.toFixed(2)}
                      </td>
                      <td className="py-2.5 text-right">
                        <button
                          onClick={() => handleManualClosePosition(pos.id)}
                          className="px-2.5 py-1 rounded bg-[var(--color-red)]/10 hover:bg-[var(--color-red)]/20 text-[var(--color-red)] border border-[var(--color-red)]/30 text-[10px] font-bold transition-colors cursor-pointer"
                        >
                          Close Position
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-[var(--text-secondary)] italic bg-[var(--bg-main)] rounded-lg border border-[var(--border-main)]">
            No virtual positions currently open. The Algo Bot is scanning for confirmed breakout setups.
          </div>
        )}
      </div>

      {/* Activity Log Terminal */}
      <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl shadow-xs font-mono text-xs space-y-3 transition-colors">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[var(--border-main)] text-[var(--text-secondary)]">
          <div className="flex items-center space-x-2">
            <Terminal className="w-3.5 h-3.5 text-[var(--accent-blue)]" />
            <span className="font-bold text-[var(--text-primary)]">
              Bot Activity & Execution Log
            </span>
            <span className="text-[10px] text-[var(--text-secondary)]">({logs.length} events)</span>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center space-x-1 text-[10px]">
            {(['ALL', 'TRADE', 'SIGNAL', 'WARN', 'ERROR'] as const).map(lvl => (
              <button
                key={lvl}
                onClick={() => setLogFilter(lvl)}
                className={`px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer ${
                  logFilter === lvl
                    ? 'bg-[var(--accent-blue)] text-white'
                    : 'bg-[var(--bg-card-sub)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        <div className="max-h-64 overflow-y-auto space-y-1.5 custom-scrollbar text-[11px] bg-[var(--bg-main)] p-3 rounded-lg border border-[var(--border-main)]">
          {filteredLogs.length > 0 ? (
            filteredLogs.map(log => {
              const isTrade = log.level === 'TRADE';
              const isSignal = log.level === 'SIGNAL';
              const isError = log.level === 'ERROR';
              const isWarn = log.level === 'WARN';
              return (
                <div key={log.id} className="flex items-start space-x-2 py-0.5 leading-relaxed">
                  <span className="text-[var(--text-secondary)] opacity-70 shrink-0">
                    [{new Date(log.timestamp).toLocaleTimeString()}]
                  </span>
                  <span
                    className={`font-bold shrink-0 ${
                      isTrade
                        ? 'text-[var(--color-green)]'
                        : isSignal
                        ? 'text-[var(--accent-blue)]'
                        : isError
                        ? 'text-[var(--color-red)]'
                        : isWarn
                        ? 'text-amber-500'
                        : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    [{log.level}]
                  </span>
                  <span className="text-[var(--text-primary)] break-all">{log.message}</span>
                </div>
              );
            })
          ) : (
            <div className="text-[var(--text-secondary)] italic py-2">
              No matching activity logged. Start the bot to begin automated paper trading.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
