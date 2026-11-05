import React, { useState, useEffect } from 'react';
import { Signal } from '../types/trading';
import { api } from '../services/api';
import { Radio, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';

export const SignalsSection: React.FC = () => {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSignals = async () => {
    setLoading(true);
    try {
      const data = await api.getSignals(50);
      setSignals(data);
    } catch (err) {
      console.error('Failed to fetch signals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSignals();
    const interval = setInterval(fetchSignals, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto text-xs">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl shadow-xs transition-colors">
        <div>
          <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Radio className="w-5 h-5 text-[var(--accent-blue)]" />
            Quantitative Strategy Signals
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Real-time algorithmic trade alerts generated strictly from closed candle strategy evaluations with zero lookahead bias.
          </p>
        </div>

        <button
          onClick={fetchSignals}
          disabled={loading}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-[var(--bg-card-sub)] hover:border-[var(--border-sub)] border border-[var(--border-main)] rounded-lg text-[var(--text-primary)] text-xs font-medium transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[var(--accent-blue)]' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Signals Table */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl shadow-xs overflow-hidden transition-colors">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[var(--bg-card-sub)] border-b border-[var(--border-main)] text-[var(--text-secondary)] uppercase text-[10px] font-semibold">
              <tr>
                <th className="py-3 px-3.5">Time</th>
                <th className="py-3 px-3.5">Pair</th>
                <th className="py-3 px-3.5">Direction</th>
                <th className="py-3 px-3.5">Strategy</th>
                <th className="py-3 px-3.5 text-right">Entry Price</th>
                <th className="py-3 px-3.5 text-right">Stop Loss</th>
                <th className="py-3 px-3.5 text-right">Take Profit</th>
                <th className="py-3 px-3.5 text-right">R:R</th>
                <th className="py-3 px-3.5">Triggering Conditions</th>
                <th className="py-3 px-3.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-main)] text-xs">
              {signals.length > 0 ? (
                signals.map(sig => {
                  const isLong = sig.direction === 'LONG';
                  let parsedReasons: string[] = [];
                  try {
                    parsedReasons = JSON.parse(sig.reasons_json);
                  } catch {
                    parsedReasons = [sig.reasons_json];
                  }

                  return (
                    <tr key={sig.id} className="hover:bg-[var(--bg-card-sub)]/60 transition-colors">
                      <td className="py-3 px-3.5 text-[var(--text-secondary)] whitespace-nowrap">
                        {new Date(sig.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-3 px-3.5 font-bold text-[var(--text-primary)]">
                        {sig.pair}
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
                          <span>{sig.direction}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-[var(--text-primary)] font-sans font-medium truncate max-w-xs">
                        {sig.strategy_name}
                      </td>
                      <td className="py-3 px-3.5 text-right text-[var(--text-primary)] font-semibold">
                        ${sig.entry_price.toFixed(2)}
                      </td>
                      <td className="py-3 px-3.5 text-right text-[var(--color-red)]">
                        ${sig.stop_loss.toFixed(2)}
                      </td>
                      <td className="py-3 px-3.5 text-right text-[var(--color-green)]">
                        ${sig.take_profit.toFixed(2)}
                      </td>
                      <td className="py-3 px-3.5 text-right text-[var(--accent-blue)] font-bold">
                        1:{sig.risk_reward.toFixed(1)}
                      </td>
                      <td className="py-3 px-3.5 max-w-xs font-sans text-[11px] text-[var(--text-secondary)] truncate" title={parsedReasons.join(', ')}>
                        {parsedReasons[0] || 'Valid multi-factor setup'}
                      </td>
                      <td className="py-3 px-3.5 text-right">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-[var(--bg-card-sub)] border border-[var(--border-main)] text-[var(--text-secondary)] font-semibold">
                          {sig.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-[var(--text-secondary)] italic font-sans">
                    No signals generated yet. Strategy engine continuously evaluates incoming candle closes.
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
