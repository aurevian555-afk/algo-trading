import {
  Candle,
  InstrumentInfo,
  Position,
  Trade,
  Signal,
  BotState,
  BotLog,
  StrategyRecord,
  BacktestResult,
} from '../types/trading';

export const api = {
  // Market
  async getTickers(): Promise<InstrumentInfo[]> {
    const res = await fetch('/api/market/tickers');
    const data = await res.json();
    return data.tickers || [];
  },

  async getKlines(pair: string, timeframe: string, limit = 250): Promise<Candle[]> {
    const res = await fetch(`/api/market/klines?pair=${encodeURIComponent(pair)}&timeframe=${timeframe}&limit=${limit}`);
    const data = await res.json();
    return data.candles || [];
  },

  async getIndicators(pair: string, timeframe: string, limit = 200) {
    const res = await fetch(`/api/indicators?pair=${encodeURIComponent(pair)}&timeframe=${timeframe}&limit=${limit}`);
    return await res.json();
  },

  // Strategies
  async getStrategies(): Promise<StrategyRecord[]> {
    const res = await fetch('/api/strategies');
    const data = await res.json();
    return data.strategies || [];
  },

  async createStrategy(payload: {
    name: string;
    description: string;
    timeframe: string;
    trend_timeframe?: string;
    config: any;
  }) {
    const res = await fetch('/api/strategies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  },

  async updateStrategy(id: string, payload: any) {
    const res = await fetch(`/api/strategies/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  },

  async deleteStrategy(id: string) {
    const res = await fetch(`/api/strategies/${id}`, { method: 'DELETE' });
    return await res.json();
  },

  async duplicateStrategy(id: string) {
    const res = await fetch(`/api/strategies/${id}/duplicate`, { method: 'POST' });
    return await res.json();
  },

  async evaluateStrategy(pair: string, strategyId: string, timeframe: string, config?: any) {
    const res = await fetch('/api/strategy/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pair, strategyId, timeframe, config }),
    });
    return await res.json();
  },

  // Algo Bot
  async getBotState(): Promise<{
    isRunning: boolean;
    botState: BotState;
    openPositions: Position[];
    recentLogs: BotLog[];
  }> {
    const res = await fetch('/api/bot/state');
    return await res.json();
  },

  async startBot(config?: Partial<BotState>) {
    const res = await fetch('/api/bot/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config || {}),
    });
    return await res.json();
  },

  async pauseBot(reason?: string) {
    const res = await fetch('/api/bot/pause', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    return await res.json();
  },

  async resumeBot() {
    const res = await fetch('/api/bot/resume', { method: 'POST' });
    return await res.json();
  },

  async stopBot(reason?: string) {
    const res = await fetch('/api/bot/stop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    return await res.json();
  },

  async restartBot() {
    const res = await fetch('/api/bot/restart', { method: 'POST' });
    return await res.json();
  },

  // Positions & Trades
  async getPositions(): Promise<Position[]> {
    const res = await fetch('/api/positions');
    const data = await res.json();
    return data.positions || [];
  },

  async closePosition(id: string) {
    const res = await fetch(`/api/positions/${id}/close`, { method: 'POST' });
    return await res.json();
  },

  async getTrades(filters?: { pair?: string; strategy?: string; limit?: number }): Promise<Trade[]> {
    const params = new URLSearchParams();
    if (filters?.pair) params.append('pair', filters.pair);
    if (filters?.strategy) params.append('strategy', filters.strategy);
    if (filters?.limit) params.append('limit', String(filters.limit));
    const res = await fetch(`/api/trades?${params.toString()}`);
    const data = await res.json();
    return data.trades || [];
  },

  async getSignals(limit?: number): Promise<Signal[]> {
    const url = limit ? `/api/signals?limit=${limit}` : '/api/signals';
    const res = await fetch(url);
    const data = await res.json();
    return data.signals || [];
  },

  async getAnalytics() {
    const res = await fetch('/api/analytics');
    return await res.json();
  },

  // Backtest
  async runBacktest(params: any): Promise<{ success: boolean; result: BacktestResult; error?: string }> {
    const res = await fetch('/api/backtest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return await res.json();
  },

  // Settings
  async getSettings() {
    const res = await fetch('/api/settings');
    const data = await res.json();
    return data.settings || {};
  },

  async saveSettings(settings: Record<string, any>) {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    return await res.json();
  },

  async resetData(confirmation: string) {
    const res = await fetch('/api/data/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmation }),
    });
    return await res.json();
  },

  // AI
  async analyzeWithAi(pair: string, timeframe: string, userNotes?: string, model?: string) {
    const res = await fetch('/api/ai/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pair, timeframe, userNotes, model }),
    });
    return await res.json();
  },

  async generateAiVisual(params: {
    pair: string;
    concept: string;
    imageSize: '1K' | '2K' | '4K';
    aspectRatio?: '16:9' | '1:1' | '4:3';
  }) {
    const res = await fetch('/api/ai/visualize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return await res.json();
  },

  // Delta Exchange Account
  async getDeltaAccount() {
    const res = await fetch('/api/delta/account');
    return await res.json();
  },

  async connectDeltaAccount(payload: { apiKey: string; apiSecret: string; environment?: 'india' | 'global' }) {
    const res = await fetch('/api/delta/account/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  },

  async disconnectDeltaAccount() {
    const res = await fetch('/api/delta/account/disconnect', { method: 'POST' });
    return await res.json();
  },

  async configureBot(updates: { pair?: string; timeframe?: string; strategy_id?: string }) {
    const res = await fetch('/api/bot/configure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return await res.json();
  },

  async getNews(force = false) {
    const res = await fetch(`/api/news${force ? '?force=true' : ''}`);
    return await res.json();
  },

  // User Authentication
  async signup(payload: { name: string; email: string; password: string }) {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  },

  async login(payload: { email: string; password: string }) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  },

  async loginDemo() {
    const res = await fetch('/api/auth/demo', { method: 'POST' });
    return await res.json();
  },

  async getMe(token: string) {
    const res = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return await res.json();
  },

  async logout(token?: string) {
    const res = await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ token }),
    });
    return await res.json();
  },
};

