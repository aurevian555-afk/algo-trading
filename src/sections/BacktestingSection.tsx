import React, { useState, useEffect } from 'react';
import { StrategyRecord, BacktestResult } from '../types/trading';
import { api } from '../services/api';
import { FlaskConical, Play, AlertTriangle, BarChart2 } from 'lucide-react';

interface Props {
  selectedPair: string;
}

export const BacktestingSection: React.FC<Props> = ({ selectedPair }) => {
  const [strategies, setStrategies] = useState<StrategyRecord[]>([]);
  const [pair, setPair] = useState(selectedPair);
  const [strategyId, setStrategyId] = useState('aurevian-bollinger-breakout');
  const [timeframe, setTimeframe] = useState('15m');
  const [initialCapital, setInitialCapital] = useState(10000);
  const [riskPct, setRiskPct] = useState(2.0);
  const [feePct, setFeePct] = useState(0.05);
  const [slippagePct, setSlippagePct] = useState(0.02);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getStrategies().then(strats => {
      setStrategies(strats);
    });
  }, []);

  const handleRunBacktest = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.runBacktest({
        pair,
        strategyId,
        timeframe,
        initialCapital,
        riskPercentage: riskPct,
        feePercentage: feePct,
        slippagePercentage: slippagePct,
      });

      if (res.success && res.result) {
        setResult(res.result);
      } else {
        setError(res.error || 'Backtest failed to execute.');
      }
    } catch (err: any) {
      setError(err.message || 'Backtest error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto text-xs">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl shadow-xs transition-colors">
        <div>
          <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-[var(--accent-blue)]" />
            Quantitative Historical Backtesting Engine
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Chronological bar-by-bar simulation with strict closed-candle confirmation, realistic slippage, exchange fees, and equity curve tracking. Zero lookahead bias.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-[var(--color-red)]/10 border border-[var(--color-red)]/30 rounded-lg text-xs text-[var(--color-red)] flex items-center space-x-2 font-medium">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Backtest Parameters Grid */}
      <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl shadow-xs space-y-3 transition-colors">
        <div className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
          Simulation Parameters
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="text-[var(--text-secondary)] font-medium block mb-1">Trading Pair</label>
            <select
              value={pair}
              onChange={e => setPair(e.target.value)}
              className="w-full bg-[var(--bg-card-sub)] border border-[var(--border-main)] rounded-lg px-3 py-1.5 text-[var(--text-primary)] font-mono outline-none cursor-pointer"
            >
              <option value="ETHUSD">ETHUSD (Ethereum)</option>
              <option value="BTCUSD.P">BTCUSD.P (Bitcoin Perpetual)</option>
              <option value="PAXGUSD.P">PAXGUSD.P (PAX Gold Perp)</option>
            </select>
          </div>

          <div>
            <label className="text-[var(--text-secondary)] font-medium block mb-1">Strategy</label>
            <select
              value={strategyId}
              onChange={e => setStrategyId(e.target.value)}
              className="w-full bg-[var(--bg-card-sub)] border border-[var(--border-main)] rounded-lg px-3 py-1.5 text-[var(--text-primary)] outline-none cursor-pointer"
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
            <label className="text-[var(--text-secondary)] font-medium block mb-1">Timeframe</label>
            <select
              value={timeframe}
              onChange={e => setTimeframe(e.target.value)}
              className="w-full bg-[var(--bg-card-sub)] border border-[var(--border-main)] rounded-lg px-3 py-1.5 text-[var(--text-primary)] font-mono outline-none cursor-pointer"
            >
              {['5m', '15m', '30m', '1H', '4H', '1D'].map(tf => (
                <option key={tf} value={tf}>{tf}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[var(--text-secondary)] font-medium block mb-1">Starting Capital ($)</label>
            <input
              type="number"
              value={initialCapital}
              onChange={e => setInitialCapital(parseFloat(e.target.value) || 10000)}
              className="w-full bg-[var(--bg-card-sub)] border border-[var(--border-main)] rounded-lg px-3 py-1.5 text-[var(--text-primary)] font-mono outline-none"
            />
          </div>

          <div>
            <label className="text-[var(--text-secondary)] font-medium block mb-1">Risk Per Trade (%)</label>
            <input
              type="number"
              step="0.1"
              value={riskPct}
              onChange={e => setRiskPct(parseFloat(e.target.value) || 2.0)}
              className="w-full bg-[var(--bg-card-sub)] border border-[var(--border-main)] rounded-lg px-3 py-1.5 text-[var(--text-primary)] font-mono outline-none"
            />
          </div>

          <div>
            <label className="text-[var(--text-secondary)] font-medium block mb-1">Trading Fee (%)</label>
            <input
              type="number"
              step="0.01"
              value={feePct}
              onChange={e => setFeePct(parseFloat(e.target.value) || 0.05)}
              className="w-full bg-[var(--bg-card-sub)] border border-[var(--border-main)] rounded-lg px-3 py-1.5 text-[var(--text-primary)] font-mono outline-none"
            />
          </div>

          <div>
            <label className="text-[var(--text-secondary)] font-medium block mb-1">Slippage (%)</label>
            <input
              type="number"
              step="0.01"
              value={slippagePct}
              onChange={e => setSlippagePct(parseFloat(e.target.value) || 0.02)}
              className="w-full bg-[var(--bg-card-sub)] border border-[var(--border-main)] rounded-lg px-3 py-1.5 text-[var(--text-primary)] font-mono outline-none"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleRunBacktest}
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-[var(--accent-blue)] hover:opacity-90 text-white rounded-lg font-bold transition-opacity disabled:opacity-50 shadow-xs cursor-pointer"
            >
              <Play className={`w-4 h-4 ${loading ? 'animate-spin' : 'fill-current'}`} />
              <span>{loading ? 'Simulating...' : 'Run Historical Backtest'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Backtest Results */}
      {result && (
        <div className="space-y-4">
          {/* Performance KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3.5 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl shadow-xs text-xs space-y-1 transition-colors">
              <div className="text-[10px] text-[var(--text-secondary)] uppercase font-mono font-medium">Net Profit</div>
              <div className={`text-base font-mono font-bold ${result.netProfit >= 0 ? 'text-[var(--color-green)]' : 'text-[var(--color-red)]'}`}>
                {result.netProfit >= 0 ? '+' : ''}${result.netProfit.toFixed(2)} ({result.netProfitPct.toFixed(2)}%)
              </div>
            </div>

            <div className="p-3.5 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl shadow-xs text-xs space-y-1 transition-colors">
              <div className="text-[10px] text-[var(--text-secondary)] uppercase font-mono font-medium">Win Rate</div>
              <div className="text-base font-mono font-bold text-[var(--text-primary)]">
                {result.winRate.toFixed(1)}%
              </div>
              <div className="text-[10px] text-[var(--text-secondary)] font-mono">
                {result.winningTrades}W / {result.losingTrades}L ({result.totalTrades} Total)
              </div>
            </div>

            <div className="p-3.5 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl shadow-xs text-xs space-y-1 transition-colors">
              <div className="text-[10px] text-[var(--text-secondary)] uppercase font-mono font-medium">Profit Factor</div>
              <div className="text-base font-mono font-bold text-[var(--accent-blue)]">
                {result.profitFactor > 0 ? result.profitFactor.toFixed(2) : '--'}
              </div>
            </div>

            <div className="p-3.5 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl shadow-xs text-xs space-y-1 transition-colors">
              <div className="text-[10px] text-[var(--text-secondary)] uppercase font-mono font-medium">Max Drawdown</div>
              <div className="text-base font-mono font-bold text-[var(--color-red)]">
                -${result.maxDrawdown.toFixed(2)} ({result.maxDrawdownPct.toFixed(2)}%)
              </div>
            </div>

            <div className="p-3.5 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl shadow-xs text-xs space-y-1 transition-colors">
              <div className="text-[10px] text-[var(--text-secondary)] uppercase font-mono font-medium">Avg Win / Loss</div>
              <div className="text-base font-mono font-bold text-[var(--text-primary)]">
                <span className="text-[var(--color-green)]">${result.avgWin.toFixed(0)}</span> / <span className="text-[var(--color-red)]">${result.avgLoss.toFixed(0)}</span>
              </div>
            </div>

            <div className="p-3.5 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl shadow-xs text-xs space-y-1 transition-colors">
              <div className="text-[10px] text-[var(--text-secondary)] uppercase font-mono font-medium">Final Equity</div>
              <div className="text-base font-mono font-bold text-[var(--text-primary)]">
                ${result.finalCapital.toFixed(2)}
              </div>
            </div>
          </div>

          {/* SVG Equity Curve */}
          <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl shadow-xs space-y-2 transition-colors">
            <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-[var(--accent-blue)]" />
              Historical Equity Growth Curve
            </div>

            <div className="h-44 w-full relative flex items-end pt-4 bg-[var(--bg-card-sub)] rounded-lg border border-[var(--border-main)] p-2">
              {result.equityCurve.length > 1 ? (
                <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                  {(() => {
                    const equities = result.equityCurve.map(e => e.equity);
                    const minEq = Math.min(...equities) * 0.99;
                    const maxEq = Math.max(...equities) * 1.01;
                    const range = maxEq - minEq || 1;

                    const points = result.equityCurve
                      .map((pt, i) => {
                        const x = (i / (result.equityCurve.length - 1)) * 100;
                        const y = 100 - ((pt.equity - minEq) / range) * 90 - 5;
                        return `${x},${y}`;
                      })
                      .join(' ');

                    return (
                      <polyline
                        fill="none"
                        stroke="var(--accent-blue)"
                        strokeWidth="2"
                        vectorEffect="non-scaling-stroke"
                        points={points}
                      />
                    );
                  })()}
                </svg>
              ) : (
                <div className="w-full text-center text-xs text-[var(--text-secondary)] italic">
                  No trades occurred during this period.
                </div>
              )}
            </div>

            <div className="flex justify-between text-[10px] font-mono text-[var(--text-secondary)] pt-1 border-t border-[var(--border-main)]">
              <span>Start: ${result.initialCapital.toFixed(2)}</span>
              <span>Final: ${result.finalCapital.toFixed(2)}</span>
            </div>
          </div>

          {/* Simulated Trades Table */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl shadow-xs overflow-hidden transition-colors">
            <div className="px-4 py-2.5 border-b border-[var(--border-main)] text-xs font-bold text-[var(--text-primary)]">
              Simulated Trades ({result.trades.length})
            </div>
            <div className="max-h-60 overflow-y-auto custom-scrollbar">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[var(--bg-card-sub)] border-b border-[var(--border-main)] text-[var(--text-secondary)] uppercase text-[10px] font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Direction</th>
                    <th className="py-2.5 px-3 text-right">Entry</th>
                    <th className="py-2.5 px-3 text-right">Exit</th>
                    <th className="py-2.5 px-3 text-right">Qty</th>
                    <th className="py-2.5 px-3 text-right">Net P&L</th>
                    <th className="py-2.5 px-3 text-right">Exit Trigger</th>
                    <th className="py-2.5 px-3 text-right">Equity After</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-main)]">
                  {result.trades.map((t, idx) => (
                    <tr key={idx} className="hover:bg-[var(--bg-card-sub)]/60 transition-colors">
                      <td className="py-2 px-3 text-[var(--text-secondary)]">{idx + 1}</td>
                      <td className={`py-2 px-3 font-semibold ${t.direction === 'LONG' ? 'text-[var(--color-green)]' : 'text-[var(--color-red)]'}`}>
                        {t.direction}
                      </td>
                      <td className="py-2 px-3 text-right text-[var(--text-secondary)]">${t.entryPrice.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right text-[var(--text-primary)] font-medium">${t.exitPrice.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right text-[var(--text-secondary)]">{t.quantity}</td>
                      <td className={`py-2 px-3 text-right font-bold ${t.netPnl >= 0 ? 'text-[var(--color-green)]' : 'text-[var(--color-red)]'}`}>
                        {t.netPnl >= 0 ? '+' : ''}${t.netPnl.toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-right text-[var(--text-secondary)]">{t.exitReason}</td>
                      <td className="py-2 px-3 text-right text-[var(--text-primary)] font-semibold">${t.equityAfter.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
