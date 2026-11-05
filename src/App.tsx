import React, { useState, useEffect } from 'react';
import { Sidebar, SectionType } from './components/Sidebar';
import { Header } from './components/Header';
import { AuthModal } from './components/AuthModal';
import { InstrumentInfo, Position, BotState } from './types/trading';
import { api } from './services/api';

// Sections
import { DashboardSection } from './sections/DashboardSection';
import { LiveMarketSection } from './sections/LiveMarketSection';
import { MarketNewsSection } from './sections/MarketNewsSection';
import { StrategyEngineSection } from './sections/StrategyEngineSection';
import { CustomStrategyBuilderSection } from './sections/CustomStrategyBuilderSection';
import { AlgoBotSection } from './sections/AlgoBotSection';
import { AiTradingBotSection } from './sections/AiTradingBotSection';
import { SignalsSection } from './sections/SignalsSection';
import { OpenPositionsSection } from './sections/OpenPositionsSection';
import { TradeHistorySection } from './sections/TradeHistorySection';
import { BacktestingSection } from './sections/BacktestingSection';
import { PerformanceAnalyticsSection } from './sections/PerformanceAnalyticsSection';
import { RiskManagementSection } from './sections/RiskManagementSection';
import { SettingsSection } from './sections/SettingsSection';

export default function App() {
  const [currentSection, setCurrentSection] = useState<SectionType>('Dashboard');
  const [collapsed, setCollapsed] = useState(false);

  const [tickers, setTickers] = useState<InstrumentInfo[]>([]);
  const [selectedPair, setSelectedPair] = useState('ETHUSD');
  const [botState, setBotState] = useState<BotState | null>(null);
  const [openPositions, setOpenPositions] = useState<Position[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);

  // High-frequency poll for tickers and bot execution state (3s)
  const fetchFastState = async () => {
    try {
      const [tData, bData] = await Promise.all([
        api.getTickers(),
        api.getBotState(),
      ]);

      if (tData && tData.length > 0) setTickers(tData);
      if (bData?.botState) {
        setBotState(bData.botState);
        setOpenPositions(bData.openPositions || []);
      }
    } catch (err) {
      console.error('Fast state sync error:', err);
    }
  };

  // Low-frequency poll for heavy analytics ledger (10s)
  const fetchAnalytics = async () => {
    try {
      const aData = await api.getAnalytics();
      if (aData) setAnalytics(aData);
    } catch (err) {
      console.error('Analytics sync error:', err);
    }
  };

  useEffect(() => {
    fetchFastState();
    fetchAnalytics();

    const fastInterval = setInterval(fetchFastState, 3000);
    const analyticsInterval = setInterval(fetchAnalytics, 10000);

    return () => {
      clearInterval(fastInterval);
      clearInterval(analyticsInterval);
    };
  }, []);

  const totalUnrealizedPnl = openPositions.reduce((sum, p) => sum + (p.unrealized_pnl || 0), 0);
  const virtualBalance = botState?.balance || 10000.0;

  return (
    <div className="flex h-screen w-screen bg-[var(--bg-main)] text-[var(--text-primary)] overflow-hidden font-sans">
      {/* Sidebar */}
      <Sidebar
        currentSection={currentSection}
        onSelectSection={setCurrentSection}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        botStatus={botState?.status}
        openPositionsCount={openPositions.length}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header Ribbon */}
        <Header
          currentSection={currentSection}
          tickers={tickers}
          selectedPair={selectedPair}
          onSelectPair={setSelectedPair}
          virtualBalance={virtualBalance}
          unrealizedPnl={totalUnrealizedPnl}
        />

        {/* Section Router */}
        <main className="flex-1 overflow-y-auto bg-[var(--bg-main)] relative custom-scrollbar">
          {currentSection === 'Dashboard' && (
            <DashboardSection
              winRate={analytics?.winRate ?? null}
              totalClosedTrades={analytics?.totalTrades ?? 0}
            />
          )}

          {currentSection === 'Live Market' && (
            <LiveMarketSection
              tickers={tickers}
              selectedPair={selectedPair}
              onSelectPair={setSelectedPair}
            />
          )}

          {currentSection === 'Market News' && (
            <MarketNewsSection />
          )}

          {currentSection === 'Strategy Engine' && (
            <StrategyEngineSection selectedPair={selectedPair} />
          )}

          {currentSection === 'Custom Strategy Builder' && (
            <CustomStrategyBuilderSection />
          )}

          {currentSection === 'Algo Bot' && (
            <AlgoBotSection selectedPair={selectedPair} />
          )}

          {currentSection === 'AI Trading Bot' && (
            <AiTradingBotSection selectedPair={selectedPair} />
          )}

          {currentSection === 'Signals' && <SignalsSection />}

          {currentSection === 'Open Positions' && <OpenPositionsSection />}

          {currentSection === 'Trade History' && <TradeHistorySection />}

          {currentSection === 'Backtesting' && (
            <BacktestingSection selectedPair={selectedPair} />
          )}

          {currentSection === 'Performance Analytics' && (
            <PerformanceAnalyticsSection />
          )}

          {currentSection === 'Risk Management' && <RiskManagementSection />}

          {currentSection === 'Settings' && (
            <SettingsSection tickers={tickers} />
          )}
        </main>
      </div>
      <AuthModal />
    </div>
  );
}
