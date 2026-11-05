import React, { useState } from 'react';
import { InstrumentInfo } from '../types/trading';
import { Wallet, Sun, Moon, LogOut, UserCheck } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

interface Props {
  currentSection: string;
  tickers: InstrumentInfo[];
  selectedPair: string;
  onSelectPair: (p: string) => void;
  virtualBalance: number;
  unrealizedPnl: number;
}

export const Header: React.FC<Props> = ({
  currentSection,
  tickers,
  selectedPair,
  onSelectPair,
  virtualBalance,
  unrealizedPnl,
}) => {
  const { toggleTheme, isDark } = useTheme();
  const { currentUser, logout, openAuthModal } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="h-14 bg-[var(--bg-card)] border-b border-[var(--border-main)] px-4 flex items-center justify-between select-none shadow-xs z-10 transition-colors">
      {/* Left: Active Section */}
      <div className="flex items-center space-x-3">
        <h1 className="text-sm font-semibold tracking-wide text-[var(--text-primary)]">
          {currentSection}
        </h1>
        <span className="text-xs text-[var(--border-main)] hidden md:inline">|</span>
        <div className="hidden md:flex items-center space-x-1.5 text-xs text-[var(--text-secondary)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-green)]" />
          <span>Paper Trading Virtual Environment</span>
        </div>
      </div>

      {/* Center: Live 3-Pair Market Tickers */}
      <div className="hidden lg:flex items-center space-x-2">
        {tickers.map(t => {
          const isSelected = selectedPair === t.pair;
          const isUp = t.change24hPct >= 0;
          return (
            <button
              key={t.pair}
              onClick={() => onSelectPair(t.pair)}
              className={`flex items-center space-x-2 px-2.5 py-1 rounded text-xs transition-colors border ${
                isSelected
                  ? 'bg-[var(--bg-card-sub)] border-[var(--accent-blue)] text-[var(--text-primary)] font-medium'
                  : 'bg-[var(--bg-card)] border-[var(--border-main)] text-[var(--text-secondary)] hover:border-[var(--border-sub)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span className="font-mono font-semibold">{t.pair}</span>
              <span className="text-[var(--text-primary)] font-mono">
                ${t.price > 0 ? t.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '--'}
              </span>
              <span className={`font-mono text-[11px] font-semibold ${isUp ? 'text-[var(--color-green)]' : 'text-[var(--color-red)]'}`}>
                {isUp ? '+' : ''}{t.change24hPct.toFixed(2)}%
              </span>
            </button>
          );
        })}
      </div>

      {/* Right: Theme Toggle & Virtual Capital & Account Equity */}
      <div className="flex items-center space-x-3">
        {/* Instant Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          title={isDark ? 'Switch to Classic Light Theme' : 'Switch to Dark Theme'}
          className="p-1.5 rounded-md bg-[var(--bg-card-sub)] border border-[var(--border-main)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-sub)] transition-colors flex items-center justify-center cursor-pointer"
          aria-label={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        >
          {isDark ? (
            <Sun className="w-4 h-4 text-amber-400 hover:rotate-12 transition-transform" />
          ) : (
            <Moon className="w-4 h-4 text-[#2962FF] hover:-rotate-12 transition-transform" />
          )}
        </button>

        {/* Equity Pill */}
        <div className="flex items-center space-x-2 bg-[var(--bg-card-sub)] border border-[var(--border-main)] px-3 py-1 rounded text-xs font-mono">
          <Wallet className="w-3.5 h-3.5 text-[var(--accent-blue)]" />
          <div className="flex items-center space-x-2">
            <span className="text-[var(--text-secondary)]">Equity:</span>
            <span className="text-[var(--text-primary)] font-semibold">
              ${(virtualBalance + unrealizedPnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            {unrealizedPnl !== 0 && (
              <span className={`text-[11px] font-semibold ${unrealizedPnl >= 0 ? 'text-[var(--color-green)]' : 'text-[var(--color-red)]'}`}>
                ({unrealizedPnl >= 0 ? '+' : ''}${unrealizedPnl.toFixed(2)})
              </span>
            )}
          </div>
        </div>

        {/* User Account Button / Profile Menu */}
        {currentUser ? (
          <div className="relative group">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 bg-[var(--bg-card-sub)] hover:border-[var(--border-sub)] border border-[var(--border-main)] px-2.5 py-1 rounded-md text-xs cursor-pointer transition-colors"
            >
              <div className="w-5 h-5 rounded-full bg-[var(--accent-blue)] text-white flex items-center justify-center font-bold text-[10px]">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <span className="font-medium text-[var(--text-primary)] max-w-[100px] truncate hidden sm:inline">
                {currentUser.name}
              </span>
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-1.5 w-48 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg shadow-xl py-1 text-xs z-50">
                <div className="px-3 py-2 border-b border-[var(--border-main)]">
                  <p className="font-semibold text-[var(--text-primary)] truncate">{currentUser.name}</p>
                  <p className="text-[10px] text-[var(--text-secondary)] truncate">{currentUser.email}</p>
                </div>
                <button
                  onClick={() => {
                    logout();
                    setShowUserMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 text-[var(--color-red)] hover:bg-[var(--bg-card-sub)] flex items-center space-x-2 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => openAuthModal('login')}
            className="flex items-center space-x-1.5 px-3 py-1 bg-[var(--accent-blue)] hover:opacity-90 text-white rounded text-xs font-semibold transition-opacity cursor-pointer shadow-xs shrink-0"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
};

