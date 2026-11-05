import React, { useState, useEffect } from 'react';
import { Trade } from '../types/trading';
import { api } from '../services/api';
import { History, ArrowUpRight, ArrowDownRight, Filter } from 'lucide-react';

export const TradeHistorySection: React.FC = () => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterPair, setFilterPair] = useState('ALL');
  const [filterStrategy, setFilterStrategy] = useState('ALL');

  const fetchTrades = async () => {
    setLoading(true);
    try {
      const data = await api.getTrades({
        pair: filterPair,
        strategy: filterStrategy,
      });
      setTrades(data);
    } catch (err) {
      console.error('Failed to fetch trades:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrades();
  }, [filterPair, filterStrategy]);

  const uniqueStrategies = Array.from(new Set(trades.map(t => t.strategy_name)));

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto text-xs">
      {/* Title & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl shadow-xs transition-colors">
        <div>
          <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
            <History className="w-5 h-5 text-[var(--accent-blue)]" />
            Completed Paper Trade History ({trades.length})
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Auditable log of executed virtual orders, recorded net P&L, fees deducted, and execution exit triggers.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center space-x-1.5">
            <Filter className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
            <select
              value={filterPair}
              onChange={e => setFilterPair(e.target.value)}
              className="bg-[var(--bg-card-sub)] border border-[var(--border-main)] rounded-lg px-3 py-1.5 text-[var(--text-primary)] font-mono outline-none cursor-pointer"
            >
              <option value="ALL">All Pairs</option>
              <option value="ETHUSD">ETHUSD</option>
              <option value="BTCUSD.P">BTCUSD.P</option>
              <option value="PAXGUSD.P">PAXGUSD.P</option>
            </select>
          </div>

          <select
            value={filterStrategy}
            onChange={e => setFilterStrategy(e.target.value)}
            className="bg-[var(--bg-card-sub)] border border-[var(--border-main)] rounded-lg px-3 py-1.5 text-[var(--text-primary)] outline-none cursor-pointer"
          >
            <option value="ALL">All Strategies</option>
            {uniqueStrategies.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Trades Table */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl shadow-xs overflow-hidden transition-colors">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[var(--bg-card-sub)] border-b border-[var(--border-main)] text-[var(--text-secondary)] uppercase text-[10px] font-semibold">
              <tr>
                <th className="py-3 px-3.5">Closed Time</th>
                <th className="py-3 px-3.5">Pair</th>
                <th className="py-3 px-3.5">Direction</th>
                <th className="py-3 px-3.5">Strategy</th>
                <th className="py-3 px-3.5 text-right">Entry</th>
                <th className="py-3 px-3.5 text-right">Exit</th>
                <th className="py-3 px-3.5 text-right">Quantity</th>
                <th className="py-3 px-3.5 text-right">Fees</th>
                <th className="py-3 px-3.5 text-right">Net P&L</th>
                <th className="py-3 px-3.5 text-right">Exit Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-main)] text-xs">
              {trades.length > 0 ? (
                trades.map(t => {
                  const isLong = t.direction === 'LONG';
                  const isWin = t.net_pnl > 0;
                  return (
                    <tr key={t.id} className="hover:bg-[var(--bg-card-sub)]/60 transition-colors">
                      <td className="py-3 px-3.5 text-[var(--text-secondary)] whitespace-nowrap">
                        {new Date(t.closed_at).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-3.5 font-bold text-[var(--text-primary)]">
                        {t.pair}
                      </td>
                      <td className="py-3 px-3.5">
                        <span
                          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                            isLong
                              ? 'bg-[var(--color-green)]/15 text-[var(--color-green)] border border-[var(--color-green)]/30'
                              : 'bg-[var(--color-red)]/15 text-[var(--color-red)] border border-[var(--color-red)]/30'
                          }`}
                        >
                          {isLong ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          <span>{t.direction}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-[var(--text-primary)] font-sans font-medium truncate max-w-xs">
                        {t.strategy_name}
                      </td>
                      <td className="py-3 px-3.5 text-right text-[var(--text-secondary)]">
                        ${t.entry_price.toFixed(2)}
                      </td>
                      <td className="py-3 px-3.5 text-right text-[var(--text-primary)] font-semibold">
                        ${t.exit_price.toFixed(2)}
                      </td>
                      <td className="py-3 px-3.5 text-right text-[var(--text-secondary)]">
                        {t.quantity}
                      </td>
                      <td className="py-3 px-3.5 text-right text-[var(--color-red)]">
                        -${t.fees.toFixed(2)}
                      </td>
                      <td className={`py-3 px-3.5 text-right font-bold ${
                        isWin ? 'text-[var(--color-green)]' : 'text-[var(--color-red)]'
                      }`}>
                        {isWin ? '+' : ''}${t.net_pnl.toFixed(2)}
                      </td>
                      <td className="py-3 px-3.5 text-right">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-[var(--bg-card-sub)] border border-[var(--border-main)] text-[var(--text-secondary)] font-semibold">
                          {t.exit_reason}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-[var(--text-secondary)] italic font-sans">
                    No closed paper trades recorded yet. Completed trades will appear here automatically.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
