import React, { useState, useEffect } from 'react';
import { Position } from '../types/trading';
import { api } from '../services/api';
import { Clock, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';

export const OpenPositionsSection: React.FC = () => {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const fetchPositions = async () => {
    setLoading(true);
    try {
      const data = await api.getPositions();
      setPositions(data);
    } catch (err) {
      console.error('Failed to fetch positions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPositions();
    const interval = setInterval(fetchPositions, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleClose = async (id: string) => {
    if (confirmId !== id) {
      setConfirmId(id);
      // Auto-reset confirmation after 4 seconds
      setTimeout(() => setConfirmId(prev => (prev === id ? null : prev)), 4000);
      return;
    }

    setConfirmId(null);
    setClosingId(id);
    try {
      await api.closePosition(id);
      await fetchPositions();
    } catch (err) {
      console.error('Failed to close position:', err);
    } finally {
      setClosingId(null);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto text-xs">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl shadow-xs transition-colors">
        <div>
          <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Clock className="w-5 h-5 text-[var(--accent-blue)]" />
            Active Virtual Paper Positions ({positions.length})
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Real-time paper positions tracked against live order book prices with automatic virtual SL/TP triggers.
          </p>
        </div>

        <button
          onClick={fetchPositions}
          disabled={loading}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-[var(--bg-card-sub)] hover:border-[var(--border-sub)] border border-[var(--border-main)] rounded-lg text-[var(--text-primary)] text-xs font-medium transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[var(--accent-blue)]' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Positions Table */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl shadow-xs overflow-hidden transition-colors">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[var(--bg-card-sub)] border-b border-[var(--border-main)] text-[var(--text-secondary)] uppercase text-[10px] font-semibold">
              <tr>
                <th className="py-3 px-3.5">Opened At</th>
                <th className="py-3 px-3.5">Pair</th>
                <th className="py-3 px-3.5">Direction</th>
                <th className="py-3 px-3.5 text-right">Quantity</th>
                <th className="py-3 px-3.5 text-right">Entry Price</th>
                <th className="py-3 px-3.5 text-right">Current Price</th>
                <th className="py-3 px-3.5 text-right">Stop Loss</th>
                <th className="py-3 px-3.5 text-right">Take Profit</th>
                <th className="py-3 px-3.5 text-right">Unrealized P&L</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-main)] text-xs">
              {positions.length > 0 ? (
                positions.map(pos => {
                  const isLong = pos.direction === 'LONG';
                  const isProfitable = pos.unrealized_pnl >= 0;
                  const isAwaitingConfirm = confirmId === pos.id;

                  return (
                    <tr key={pos.id} className="hover:bg-[var(--bg-card-sub)]/60 transition-colors">
                      <td className="py-3 px-3.5 text-[var(--text-secondary)] whitespace-nowrap">
                        {new Date(pos.opened_at).toLocaleTimeString()}
                      </td>
                      <td className="py-3 px-3.5 font-bold text-[var(--text-primary)]">
                        {pos.pair}
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
                          <span>{pos.direction}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-right text-[var(--text-primary)] font-semibold">
                        {pos.quantity}
                      </td>
                      <td className="py-3 px-3.5 text-right text-[var(--text-secondary)]">
                        ${pos.entry_price.toFixed(2)}
                      </td>
                      <td className="py-3 px-3.5 text-right text-[var(--text-primary)] font-bold">
                        ${pos.current_price.toFixed(2)}
                      </td>
                      <td className="py-3 px-3.5 text-right text-[var(--color-red)]">
                        ${pos.stop_loss.toFixed(2)}
                      </td>
                      <td className="py-3 px-3.5 text-right text-[var(--color-green)]">
                        ${pos.take_profit.toFixed(2)}
                      </td>
                      <td className={`py-3 px-3.5 text-right font-bold ${
                        isProfitable ? 'text-[var(--color-green)]' : 'text-[var(--color-red)]'
                      }`}>
                        {isProfitable ? '+' : ''}${pos.unrealized_pnl.toFixed(2)}
                      </td>
                      <td className="py-3 px-3.5 text-right">
                        <button
                          onClick={() => handleClose(pos.id)}
                          disabled={closingId === pos.id}
                          className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer disabled:opacity-50 ${
                            isAwaitingConfirm
                              ? 'bg-[var(--color-red)] text-white shadow-xs animate-pulse'
                              : 'bg-[var(--color-red)]/10 hover:bg-[var(--color-red)]/20 text-[var(--color-red)] border border-[var(--color-red)]/30'
                          }`}
                          title="Close position at current market price"
                        >
                          {closingId === pos.id ? 'Closing...' : isAwaitingConfirm ? 'Confirm Close?' : 'Close Market'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-[var(--text-secondary)] italic font-sans">
                    No active open positions. The algorithmic bot or manual setups will populate this table upon trade triggers.
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
