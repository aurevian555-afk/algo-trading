import React from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  Cpu,
  Sliders,
  Bot,
  Sparkles,
  Radio,
  Clock,
  History,
  FlaskConical,
  BarChart3,
  ShieldAlert,
  Settings,
  ChevronLeft,
  ChevronRight,
  Newspaper,
} from 'lucide-react';

export type SectionType =
  | 'Dashboard'
  | 'Live Market'
  | 'Market News'
  | 'Strategy Engine'
  | 'Custom Strategy Builder'
  | 'Algo Bot'
  | 'AI Trading Bot'
  | 'Signals'
  | 'Open Positions'
  | 'Trade History'
  | 'Backtesting'
  | 'Performance Analytics'
  | 'Risk Management'
  | 'Settings';

interface Props {
  currentSection: SectionType;
  onSelectSection: (s: SectionType) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  botStatus?: string;
  openPositionsCount?: number;
}

export const Sidebar: React.FC<Props> = ({
  currentSection,
  onSelectSection,
  collapsed,
  onToggleCollapse,
  botStatus = 'STOPPED',
  openPositionsCount = 0,
}) => {
  const navItems: Array<{
    id: SectionType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number;
  }> = [
    { id: 'Dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'Live Market', label: 'Live Market', icon: TrendingUp },
    { id: 'Market News', label: 'Market News', icon: Newspaper },
    { id: 'Strategy Engine', label: 'Strategy Engine', icon: Cpu },
    { id: 'Custom Strategy Builder', label: 'Custom Strategy Builder', icon: Sliders },
    {
      id: 'Algo Bot',
      label: 'Algo Bot',
      icon: Bot,
      badge: botStatus === 'PAUSED' ? 'PAUSED' : (botStatus === 'WORKING' || botStatus === 'POSITION_OPEN' || botStatus === 'WAITING_FOR_SETUP' || botStatus === 'STARTING') ? 'ACTIVE' : undefined,
    },
    { id: 'AI Trading Bot', label: 'AI Trading Bot', icon: Sparkles },
    { id: 'Signals', label: 'Signals', icon: Radio },
    {
      id: 'Open Positions',
      label: 'Open Positions',
      icon: Clock,
      badge: openPositionsCount > 0 ? openPositionsCount : undefined,
    },
    { id: 'Trade History', label: 'Trade History', icon: History },
    { id: 'Backtesting', label: 'Backtesting', icon: FlaskConical },
    { id: 'Performance Analytics', label: 'Performance Analytics', icon: BarChart3 },
    { id: 'Risk Management', label: 'Risk Management', icon: ShieldAlert },
    { id: 'Settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      className={`relative flex flex-col bg-[var(--bg-sidebar)] border-r border-[var(--border-main)] transition-all duration-200 select-none ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between h-14 px-3.5 border-b border-[var(--border-main)]">
        {!collapsed && (
          <div className="flex flex-col">
            <span className="font-semibold text-sm tracking-wider text-[var(--text-primary)] flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent-blue)]" />
              AUREVIAN
            </span>
            <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-mono">
              ALGO TRADER
            </span>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded bg-[var(--bg-card-sub)] border border-[var(--border-main)] flex items-center justify-center mx-auto text-[var(--accent-blue)] font-bold text-xs">
            AV
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-1 hover:bg-[var(--bg-card-sub)] rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto py-2.5 px-2 space-y-0.5 custom-scrollbar">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectSection(item.id)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center px-3 py-2 rounded text-xs transition-colors group relative cursor-pointer ${
                isActive
                  ? 'bg-[var(--bg-card-sub)] text-[var(--text-primary)] font-semibold border-l-2 border-[var(--accent-blue)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-sub)]'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-colors ${
                  isActive ? 'text-[var(--accent-blue)]' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'
                }`}
              />

              {!collapsed && (
                <span className="ml-3 truncate text-left flex-1">{item.label}</span>
              )}

              {!collapsed && item.badge !== undefined && (
                <span
                  className={`ml-1.5 px-1.5 py-0.2 rounded text-[10px] font-mono font-medium ${
                    item.badge === 'ACTIVE'
                      ? 'bg-[var(--color-green)]/10 text-[var(--color-green)] border border-[var(--color-green)]/30'
                      : 'bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] border border-[var(--accent-blue)]/30'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Founder & System Watermark */}
      <div className="p-3 border-t border-[var(--border-main)] bg-[var(--bg-card-sub)] text-[11px] text-[var(--text-secondary)]">
        {!collapsed ? (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-mono">
              System Architecture
            </div>
            <div className="text-[var(--text-primary)] font-medium truncate">Founder: Sehaj Jatana</div>
            <div className="text-[10px] text-[var(--color-green)] mt-0.5 flex items-center gap-1 font-mono font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-green)]" />
              Engine Online
            </div>
          </div>
        ) : (
          <div className="flex justify-center" title="Founder: Sehaj Jatana">
            <span className="w-2 h-2 rounded-full bg-[var(--color-green)]" />
          </div>
        )}
      </div>
    </aside>
  );
};
