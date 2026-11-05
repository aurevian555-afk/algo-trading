import React from 'react';
import { ThreeBrandVisual } from '../components/ThreeBrandVisual';

interface Props {
  winRate: number | null;
  totalClosedTrades: number;
}

export const DashboardSection: React.FC<Props> = ({ winRate, totalClosedTrades }) => {
  return (
    <div className="relative w-full h-[calc(100vh-3.5rem)] bg-[var(--bg-main)] flex flex-col items-center justify-center overflow-hidden select-none transition-colors">
      {/* Element A: AUREVIAN 3D brand visual */}
      <div className="absolute inset-0 w-full h-full">
        <ThreeBrandVisual />
      </div>

      {/* Element B: Prominent Win Rate */}
      <div className="relative z-10 flex flex-col items-center pointer-events-none mt-72 sm:mt-80 bg-[var(--bg-card)]/85 backdrop-blur-md px-8 py-5 rounded-xl border border-[var(--border-main)] shadow-sm">
        <div className="text-[11px] uppercase tracking-[0.25em] text-[var(--text-secondary)] font-mono font-medium mb-1">
          Win Rate
        </div>
        <div className="text-5xl sm:text-7xl font-light tracking-tight text-[var(--text-primary)] font-mono">
          {winRate !== null && totalClosedTrades > 0 ? `${winRate.toFixed(1)}%` : '--'}
        </div>
        <div className="text-[11px] text-[var(--text-secondary)] tracking-wider uppercase font-mono mt-1 font-medium">
          {totalClosedTrades > 0 ? `${totalClosedTrades} Completed Paper Trades` : 'No Completed Trades Yet'}
        </div>
      </div>
    </div>
  );
};
