import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { BarChart3, RefreshCw } from 'lucide-react';

export const PerformanceAnalyticsSection: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await api.getAnalytics();
      setData(res);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  return (
    <div className="p-5 space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg shadow-sm">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#2962FF]" />
            Quantitative Performance Analytics
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Institutional metrics derived strictly from actual completed paper-trading records stored in the SQLite database. Zero fabricated data.
          </p>
        </div>

        <button
          onClick={fetchAnalytics}
          disabled={loading}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-[var(--bg-card-sub)] hover:opacity-80 border border-[var(--border-main)] rounded text-[var(--text-primary)] text-xs font-medium transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#2962FF]' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {data && (
        <div className="space-y-4">
          {/* Key Executive Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3.5 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg shadow-sm text-xs space-y-1">
              <div className="text-[10px] text-[var(--text-secondary)] uppercase font-mono font-medium">Total Net P&L</div>
              <div className={`text-base font-mono font-bold ${data.totalNetPnl >= 0 ? 'text-[#089981]' : 'text-[#F23645]'}`}>
                {data.totalNetPnl >= 0 ? '+' : ''}${data.totalNetPnl.toFixed(2)}
              </div>
              <div className="text-[10px] text-[var(--text-secondary)] font-mono">
                Fees: -${data.totalFees.toFixed(2)}
              </div>
            </div>

            <div className="p-3.5 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg shadow-sm text-xs space-y-1">
              <div className="text-[10px] text-[var(--text-secondary)] uppercase font-mono font-medium">Win Rate</div>
              <div className="text-base font-mono font-bold text-[var(--text-primary)]">
                {data.winRate !== null ? `${data.winRate.toFixed(1)}%` : '--'}
              </div>
              <div className="text-[10px] text-[var(--text-secondary)] font-mono">
                {data.winningCount}W / {data.losingCount}L
              </div>
            </div>

            <div className="p-3.5 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg shadow-sm text-xs space-y-1">
              <div className="text-[10px] text-[var(--text-secondary)] uppercase font-mono font-medium">Profit Factor</div>
              <div className="text-base font-mono font-bold text-[#2962FF]">
                {data.profitFactor > 0 ? data.profitFactor.toFixed(2) : '--'}
              </div>
            </div>

            <div className="p-3.5 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg shadow-sm text-xs space-y-1">
              <div className="text-[10px] text-[var(--text-secondary)] uppercase font-mono font-medium">Max Drawdown</div>
              <div className="text-base font-mono font-bold text-[#F23645]">
                -${data.maxDrawdown.toFixed(2)} ({data.maxDrawdownPct.toFixed(1)}%)
              </div>
            </div>

            <div className="p-3.5 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg shadow-sm text-xs space-y-1">
              <div className="text-[10px] text-[var(--text-secondary)] uppercase font-mono font-medium">Avg Win</div>
              <div className="text-base font-mono font-bold text-[#089981]">
                ${data.avgWin.toFixed(2)}
              </div>
            </div>

            <div className="p-3.5 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg shadow-sm text-xs space-y-1">
              <div className="text-[10px] text-[var(--text-secondary)] uppercase font-mono font-medium">Avg Loss</div>
              <div className="text-base font-mono font-bold text-[#F23645]">
                -${data.avgLoss.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Breakdown by Pair & Strategy */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* By Trading Pair */}
            <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg shadow-sm space-y-3">
              <div className="text-xs font-semibold text-[var(--text-primary)]">
                Performance by Trading Pair
              </div>
              <div className="space-y-2">
                {Object.keys(data.byPair || {}).length > 0 ? (
                  Object.entries(data.byPair).map(([pair, stats]: [string, any]) => {
                    const winPct = stats.trades > 0 ? (stats.wins / stats.trades) * 100 : 0;
                    return (
                      <div key={pair} className="flex items-center justify-between p-2.5 rounded bg-[var(--bg-card-sub)] border border-[var(--border-main)] text-xs font-mono">
                        <span className="font-semibold text-[var(--text-primary)]">{pair}</span>
                        <div className="flex items-center space-x-4">
                          <span className="text-[var(--text-secondary)]">{stats.trades} Trades ({winPct.toFixed(0)}% W)</span>
                          <span className={`font-semibold ${stats.netPnl >= 0 ? 'text-[#089981]' : 'text-[#F23645]'}`}>
                            {stats.netPnl >= 0 ? '+' : ''}${stats.netPnl.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-xs text-[var(--text-secondary)] italic py-4 text-center">
                    No closed trades recorded by pair yet.
                  </div>
                )}
              </div>
            </div>

            {/* By Strategy */}
            <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg shadow-sm space-y-3">
              <div className="text-xs font-semibold text-[var(--text-primary)]">
                Performance by Strategy
              </div>
              <div className="space-y-2">
                {Object.keys(data.byStrategy || {}).length > 0 ? (
                  Object.entries(data.byStrategy).map(([strat, stats]: [string, any]) => {
                    const winPct = stats.trades > 0 ? (stats.wins / stats.trades) * 100 : 0;
                    return (
                      <div key={strat} className="flex items-center justify-between p-2.5 rounded bg-[var(--bg-card-sub)] border border-[var(--border-main)] text-xs font-mono">
                        <span className="font-sans font-medium text-[var(--text-primary)] truncate max-w-xs">{strat}</span>
                        <div className="flex items-center space-x-4">
                          <span className="text-[var(--text-secondary)]">{stats.trades} Trades ({winPct.toFixed(0)}% W)</span>
                          <span className={`font-semibold ${stats.netPnl >= 0 ? 'text-[#089981]' : 'text-[#F23645]'}`}>
                            {stats.netPnl >= 0 ? '+' : ''}${stats.netPnl.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-xs text-[var(--text-secondary)] italic py-4 text-center">
                    No closed trades recorded by strategy yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
