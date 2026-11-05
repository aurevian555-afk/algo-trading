export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface InstrumentInfo {
  pair: string;
  name: string;
  asset: string;
  type: 'SPOT' | 'PERPETUAL';
  provider: string;
  providerSymbol: string;
  endpointType: 'spot' | 'futures';
  tickSize: number;
  priceDecimals: number;
  price: number;
  bid: number;
  ask: number;
  change24h: number;
  change24hPct: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  quoteVolume24h: number;
  lastUpdated: number;
  connectionStatus: 'CONNECTED' | 'RECONNECTING' | 'ERROR' | 'UNAVAILABLE';
  statusMessage: string;
}

export interface Position {
  id: string;
  pair: string;
  strategy_id: string;
  direction: 'LONG' | 'SHORT';
  entry_price: number;
  current_price: number;
  quantity: number;
  stop_loss: number;
  take_profit: number;
  unrealized_pnl: number;
  fees_incurred: number;
  opened_at: number;
}

export interface Trade {
  id: string;
  pair: string;
  strategy_name: string;
  direction: 'LONG' | 'SHORT';
  entry_price: number;
  exit_price: number;
  quantity: number;
  gross_pnl: number;
  net_pnl: number;
  fees: number;
  exit_reason: string;
  opened_at: number;
  closed_at: number;
}

export interface Signal {
  id: string;
  pair: string;
  strategy_id: string;
  strategy_name: string;
  direction: 'LONG' | 'SHORT';
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  risk_reward: number;
  timeframe: string;
  reasons_json: string;
  status: string;
  timestamp: number;
}

export interface BotState {
  id: number;
  status: 'STARTING' | 'WORKING' | 'WAITING_FOR_SETUP' | 'POSITION_OPEN' | 'PAUSED' | 'STOPPED' | 'ERROR';
  pair: string;
  strategy_id: string;
  timeframe: string;
  balance: number;
  risk_per_trade: number;
  max_positions: number;
  last_eval_time: number | null;
  last_data_time: number | null;
  last_reason: string | null;
  started_at: number | null;
  error_message: string | null;
}

export interface BotLog {
  id: number;
  timestamp: number;
  level: 'INFO' | 'WARN' | 'ERROR' | 'TRADE' | 'SIGNAL';
  message: string;
  details_json: string | null;
}

export interface StrategyRecord {
  id: string;
  name: string;
  description: string;
  is_builtin: number;
  enabled: number;
  timeframe: string;
  trend_timeframe: string;
  config_json: string;
  created_at: number;
  updated_at: number;
}

export interface BacktestResult {
  initialCapital: number;
  finalCapital: number;
  netProfit: number;
  netProfitPct: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  maxDrawdownPct: number;
  avgWin: number;
  avgLoss: number;
  avgRiskReward: number;
  equityCurve: Array<{ time: number; equity: number }>;
  trades: Array<{
    id: string;
    direction: 'LONG' | 'SHORT';
    entryTime: number;
    exitTime: number;
    entryPrice: number;
    exitPrice: number;
    quantity: number;
    grossPnl: number;
    netPnl: number;
    fees: number;
    exitReason: string;
    equityAfter: number;
  }>;
}

export interface DeltaAccountInfo {
  isConnected: boolean;
  maskedKey: string | null;
  environment: 'india' | 'global';
  connectedAt: number | null;
  permissions: string[];
  statusMessage: string;
  balances?: Array<{
    asset: string;
    available_balance: number;
    order_margin: number;
    position_margin: number;
  }>;
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: number;
  publishedDateString: string;
  asset: 'BTC' | 'ETH' | 'PAXG' | 'MACRO' | 'GENERAL';
  isBreaking: boolean;
  category?: string;
}

export interface IndicatorConfig {
  enabled: boolean;
  color?: string;
  thickness?: number;
  period?: number;
  [key: string]: any;
}

export interface ChartCustomizationConfig {
  themePreset: 'aurevian_black' | 'tradingview_dark' | 'tradingview_light' | 'custom';
  candles: {
    upColor: string;
    downColor: string;
    borderUpColor: string;
    borderDownColor: string;
    wickUpColor: string;
    wickDownColor: string;
    hollow: boolean;
    showBorders: boolean;
    showWicks: boolean;
    barSpacing: number;
  };
  canvas: {
    backgroundColor: string;
    plotBackgroundColor: string;
    horzGridVisible: boolean;
    vertGridVisible: boolean;
    gridColor: string;
    scaleTextColor: string;
    priceScaleBg: string;
    timeScaleBg: string;
    crosshairColor: string;
    crosshairLabelBg: string;
    volumePanelBg: string;
  };
  volume: {
    visible: boolean;
    upColor: string;
    downColor: string;
  };
  indicators: {
    ema20: { enabled: boolean; color: string; thickness: number; period: number };
    ema50: { enabled: boolean; color: string; thickness: number; period: number };
    ema100: { enabled: boolean; color: string; thickness: number; period: number };
    ema200: { enabled: boolean; color: string; thickness: number; period: number };
    sma: { enabled: boolean; color: string; thickness: number; period: number };
    rsi: { enabled: boolean; color: string; thickness: number; period: number; upperBand: number; lowerBand: number };
    macd: { enabled: boolean; fastPeriod: number; slowPeriod: number; signalPeriod: number; macdColor: string; signalColor: string; histUpColor: string; histDownColor: string };
    bollingerBands: { enabled: boolean; period: number; stdDev: number; upperColor: string; middleColor: string; lowerColor: string };
    atr: { enabled: boolean; period: number; color: string; thickness: number };
  };
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  balance: number;
  avatar_url?: string;
  created_at: number;
  last_login?: number;
}

export interface BollingerStrategyConfig {
  name: string;
  trendTimeframe: string;
  entryTimeframe: string;
  tradeDirection: 'BOTH' | 'LONG_ONLY' | 'SHORT_ONLY';
  bollinger: {
    period: number;
    stdDev: number;
    basis: 'SMA' | 'EMA';
    squeezeLookback: number;
    squeezeThresholdPercentile: number;
  };
  trendFilter: {
    enabled: boolean;
    indicator: 'EMA';
    period: number;
  };
  volumeFilter: {
    enabled: boolean;
    period: number;
  };
  risk: {
    atrPeriod: number;
    atrMultiplierSL: number;
    riskToReward: number;
    riskPercentage: number;
  };
}


