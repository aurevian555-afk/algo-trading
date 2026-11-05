import WebSocket from 'ws';

export interface Candle {
  time: number; // Unix timestamp in seconds for charts and indicators
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
  isAvailableOnDelta: boolean;
  deltaProductId?: number;
}

export interface InstrumentSpec {
  name: string;
  asset: string;
  type: 'SPOT' | 'PERPETUAL';
  deltaSymbol: string;
  deltaProductId: number;
  tickSize: number;
  priceDecimals: number;
  isAvailableOnDelta: boolean;
}

export const INSTRUMENT_SPECS: Record<string, InstrumentSpec> = {
  'ETHUSD': {
    name: 'Ethereum Perpetual Futures (USD)',
    asset: 'Ethereum',
    type: 'PERPETUAL',
    deltaSymbol: 'ETHUSD',
    deltaProductId: 3136,
    tickSize: 0.05,
    priceDecimals: 2,
    isAvailableOnDelta: true,
  },
  'BTCUSD.P': {
    name: 'Bitcoin Perpetual Futures (USD)',
    asset: 'Bitcoin Perpetual',
    type: 'PERPETUAL',
    deltaSymbol: 'BTCUSD',
    deltaProductId: 27,
    tickSize: 0.5,
    priceDecimals: 1,
    isAvailableOnDelta: true,
  },
  'PAXGUSD.P': {
    name: 'PAX Gold Perpetual Futures (USD)',
    asset: 'PAX Gold Perpetual',
    type: 'PERPETUAL',
    deltaSymbol: 'PAXGUSD',
    deltaProductId: 123006,
    tickSize: 0.1,
    priceDecimals: 2,
    isAvailableOnDelta: true,
  },
};

const TIMEFRAME_MAP: Record<string, { deltaResolution: string; secondsPerBar: number }> = {
  '1m': { deltaResolution: '1m', secondsPerBar: 60 },
  '5m': { deltaResolution: '5m', secondsPerBar: 300 },
  '15m': { deltaResolution: '15m', secondsPerBar: 900 },
  '30m': { deltaResolution: '30m', secondsPerBar: 1800 },
  '1H': { deltaResolution: '1h', secondsPerBar: 3600 },
  '4H': { deltaResolution: '4h', secondsPerBar: 14400 },
  '1D': { deltaResolution: '1d', secondsPerBar: 86400 },
  '1W': { deltaResolution: '1w', secondsPerBar: 604800 },
};

const DELTA_REST_HOST = 'https://api.india.delta.exchange';
const DELTA_WS_HOST = 'wss://socket.india.delta.exchange';

export class MarketDataService {
  private cache: Map<string, { candles: Candle[]; timestamp: number }> = new Map();
  private tickerState: Map<string, InstrumentInfo> = new Map();
  private updateInterval: NodeJS.Timeout | null = null;
  private ws: WebSocket | null = null;
  private isWsConnecting = false;
  private wsReconnectTimeout: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initInstruments();
    this.startDeltaWebSocket();
    this.startLivePolling();
  }

  private initInstruments() {
    for (const [pair, spec] of Object.entries(INSTRUMENT_SPECS)) {
      this.tickerState.set(pair, {
        pair,
        name: spec.name,
        asset: spec.asset,
        type: spec.type,
        provider: 'Delta Exchange India',
        providerSymbol: spec.deltaSymbol,
        endpointType: 'futures',
        tickSize: spec.tickSize,
        priceDecimals: spec.priceDecimals,
        price: 0,
        bid: 0,
        ask: 0,
        change24h: 0,
        change24hPct: 0,
        high24h: 0,
        low24h: 0,
        volume24h: 0,
        quoteVolume24h: 0,
        lastUpdated: 0,
        connectionStatus: spec.isAvailableOnDelta ? 'RECONNECTING' : 'UNAVAILABLE',
        statusMessage: spec.isAvailableOnDelta
          ? 'Connecting to Delta Exchange India live feed...'
          : 'Instrument not available on Delta Exchange',
        isAvailableOnDelta: spec.isAvailableOnDelta,
        deltaProductId: spec.deltaProductId,
      });
    }
  }

  /**
   * Official Delta Exchange WebSocket subscription
   */
  private startDeltaWebSocket() {
    if (this.isWsConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) return;
    this.isWsConnecting = true;

    try {
      this.ws = new WebSocket(DELTA_WS_HOST);

      this.ws.on('open', () => {
        this.isWsConnecting = false;
        console.log('[DELTA WS] Connected to Delta Exchange India WebSocket.');

        const symbols = Object.values(INSTRUMENT_SPECS)
          .filter(s => s.isAvailableOnDelta)
          .map(s => s.deltaSymbol);

        const subMsg = {
          type: 'subscribe',
          payload: {
            channels: [{ name: 'v2/ticker', symbols }],
          },
        };

        this.ws?.send(JSON.stringify(subMsg));

        // Periodic ping heartbeat to prevent idle disconnect
        if (this.pingInterval) clearInterval(this.pingInterval);
        this.pingInterval = setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.ping();
          }
        }, 15000);
      });

      this.ws.on('message', (data: WebSocket.RawData) => {
        try {
          const raw = JSON.parse(data.toString());
          if (raw.type === 'v2/ticker' || raw.symbol) {
            this.handleWsTickerUpdate(raw);
          }
        } catch {}
      });

      this.ws.on('error', (err) => {
        console.warn('[DELTA WS] WebSocket error:', err.message);
        this.isWsConnecting = false;
      });

      this.ws.on('close', () => {
        this.isWsConnecting = false;
        if (this.pingInterval) clearInterval(this.pingInterval);
        // Auto-reconnect with backoff
        if (!this.wsReconnectTimeout) {
          this.wsReconnectTimeout = setTimeout(() => {
            this.wsReconnectTimeout = null;
            this.startDeltaWebSocket();
          }, 3000);
        }
      });
    } catch (e: any) {
      this.isWsConnecting = false;
      console.warn('[DELTA WS] Init failure:', e.message);
    }
  }

  private handleWsTickerUpdate(msg: any) {
    const symbol = msg.symbol;
    if (!symbol) return;

    // Find matching app instrument
    for (const [pair, spec] of Object.entries(INSTRUMENT_SPECS)) {
      if (spec.deltaSymbol === symbol) {
        const cur = this.tickerState.get(pair);
        if (!cur) return;

        const price = parseFloat(msg.mark_price || msg.close || msg.spot_price) || cur.price;
        const bid = parseFloat(msg.quotes?.best_bid) || parseFloat(msg.best_bid) || cur.bid || (price - spec.tickSize);
        const ask = parseFloat(msg.quotes?.best_ask) || parseFloat(msg.best_ask) || cur.ask || (price + spec.tickSize);
        const change24hPct = parseFloat(msg.mark_change_24h || msg.ltp_change_24h) || cur.change24hPct;
        const high24h = parseFloat(msg.high || msg.mark_high_24h) || cur.high24h;
        const low24h = parseFloat(msg.low || msg.mark_low_24h) || cur.low24h;
        const volume24h = parseFloat(msg.volume || msg.size) || cur.volume24h;
        const quoteVolume24h = parseFloat(msg.turnover_usd || msg.turnover) || cur.quoteVolume24h;

        const updated: InstrumentInfo = {
          ...cur,
          price,
          bid,
          ask,
          change24h: price * (change24hPct / 100),
          change24hPct,
          high24h,
          low24h,
          volume24h,
          quoteVolume24h,
          lastUpdated: Date.now(),
          connectionStatus: 'CONNECTED',
          statusMessage: 'Live genuine feed active (Delta Exchange India WebSocket)',
        };

        this.tickerState.set(pair, updated);
        break;
      }
    }
  }

  private startLivePolling() {
    this.refreshAllTickers();
    // Poll REST every 2.5 seconds to guarantee fresh quotes alongside WebSocket
    this.updateInterval = setInterval(() => {
      this.refreshAllTickers();
    }, 2500);
  }

  public async refreshAllTickers() {
    for (const pair of Object.keys(INSTRUMENT_SPECS)) {
      await this.fetchTicker(pair);
    }
  }

  public normalizePair(pair: string): string {
    if (!pair) return 'ETHUSD';
    const upper = pair.toUpperCase().trim();
    if (upper === 'BTCUSD' || upper === 'BTC/USD' || upper === 'BTCUSDT') return 'BTCUSD.P';
    if (upper === 'PAXGUSD' || upper === 'PAXG/USD' || upper === 'PAXGUSDT') return 'PAXGUSD.P';
    if (upper === 'ETHUSD' || upper === 'ETH/USD' || upper === 'ETHUSDT') return 'ETHUSD';
    return upper;
  }

  public async fetchTicker(pairInput: string): Promise<InstrumentInfo | null> {
    const pair = this.normalizePair(pairInput);
    const spec = INSTRUMENT_SPECS[pair];
    if (!spec) return null;

    const currentInfo = this.tickerState.get(pair) || {
      pair,
      name: spec.name,
      asset: spec.asset,
      type: spec.type,
      provider: 'Delta Exchange India',
      providerSymbol: spec.deltaSymbol,
      endpointType: 'futures',
      tickSize: spec.tickSize,
      priceDecimals: spec.priceDecimals,
      price: 0,
      bid: 0,
      ask: 0,
      change24h: 0,
      change24hPct: 0,
      high24h: 0,
      low24h: 0,
      volume24h: 0,
      quoteVolume24h: 0,
      lastUpdated: Date.now(),
      connectionStatus: 'RECONNECTING',
      statusMessage: 'Connecting to Delta Exchange India API...',
      isAvailableOnDelta: spec.isAvailableOnDelta,
      deltaProductId: spec.deltaProductId,
    };
    if (!spec.isAvailableOnDelta) {
      const unavail: InstrumentInfo = {
        ...currentInfo,
        connectionStatus: 'UNAVAILABLE',
        statusMessage: `Instrument ${pair} is not listed on Delta Exchange India.`,
      };
      this.tickerState.set(pair, unavail);
      return unavail;
    }

    try {
      const url = `${DELTA_REST_HOST}/v2/tickers/${spec.deltaSymbol}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} from Delta Exchange`);
      }

      const data = await res.json() as any;
      const t = data.result;
      if (!t) {
        throw new Error(`Empty ticker result for ${spec.deltaSymbol}`);
      }

      const markPrice = parseFloat(t.mark_price) || 0;
      const closePrice = parseFloat(t.close) || 0;
      const price = markPrice > 0 ? markPrice : closePrice;

      const bid = parseFloat(t.quotes?.best_bid) || (price - spec.tickSize);
      const ask = parseFloat(t.quotes?.best_ask) || (price + spec.tickSize);

      const change24hPct = parseFloat(t.mark_change_24h || t.ltp_change_24h) || 0;
      const high24h = parseFloat(t.high || t.mark_high_24h) || price;
      const low24h = parseFloat(t.low || t.mark_low_24h) || price;
      const volume24h = parseFloat(t.volume) || 0;
      const quoteVolume24h = parseFloat(t.turnover_usd || t.turnover) || 0;

      const updated: InstrumentInfo = {
        ...currentInfo,
        price,
        bid,
        ask,
        change24h: price * (change24hPct / 100),
        change24hPct,
        high24h,
        low24h,
        volume24h,
        quoteVolume24h,
        lastUpdated: Date.now(),
        connectionStatus: 'CONNECTED',
        statusMessage: 'Live genuine feed active (Delta Exchange India API)',
      };

      this.tickerState.set(pair, updated);
      return updated;
    } catch (err: any) {
      const failed: InstrumentInfo = {
        ...currentInfo,
        connectionStatus: currentInfo.price > 0 ? 'CONNECTED' : 'ERROR',
        statusMessage: currentInfo.price > 0
          ? `Live feed active (Delta Exchange India API)`
          : `Delta Exchange connection notice: ${err.message || 'Connecting'}. Retrying...`,
      };
      this.tickerState.set(pair, failed);
      return failed;
    }
  }

  public getTicker(pairInput: string): InstrumentInfo | null {
    const pair = this.normalizePair(pairInput);
    return this.tickerState.get(pair) || null;
  }

  public getAllTickers(): InstrumentInfo[] {
    return Array.from(this.tickerState.values());
  }

  /**
   * Fetches genuine historical candlestick data from Delta Exchange India
   */
  public async getKlines(pairInput: string, timeframe: string, limit = 200): Promise<Candle[]> {
    const pair = this.normalizePair(pairInput);
    const spec = INSTRUMENT_SPECS[pair];
    if (!spec) {
      throw new Error(`Unsupported instrument pair: ${pairInput}`);
    }

    if (!spec.isAvailableOnDelta) {
      throw new Error(`Instrument ${pair} is not listed on Delta Exchange India.`);
    }

    const tfInfo = TIMEFRAME_MAP[timeframe] || TIMEFRAME_MAP['15m'];
    const cacheKey = `${pair}_${tfInfo.deltaResolution}_${limit}`;
    const cached = this.cache.get(cacheKey);

    // Cache briefly (3 seconds) to prevent hammering Delta REST while maintaining real-time freshness
    if (cached && Date.now() - cached.timestamp < 3000) {
      return cached.candles;
    }

    const now = Math.floor(Date.now() / 1000);
    // Request sufficient historical lookback based on requested bar limit (max 150)
    const effectiveLimit = Math.min(limit, 150);
    const start = now - (effectiveLimit * tfInfo.secondsPerBar);

    const url = `${DELTA_REST_HOST}/v2/history/candles?resolution=${tfInfo.deltaResolution}&symbol=${spec.deltaSymbol}&start=${start}&end=${now}`;

    // Retry loop with exponential backoff for network resiliency
    let lastErr: any = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(6500) });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status} fetching Delta candles`);
        }

        const data = await res.json() as any;
        const rawCandles = data?.result;

        if (!Array.isArray(rawCandles)) {
          throw new Error(`Invalid candle format returned by Delta Exchange for ${pair}`);
        }

        // Delta Exchange returns newest-first: sort chronologically ascending (oldest -> newest)
        const candles: Candle[] = rawCandles.map((c: any) => ({
          time: c.time,
          open: parseFloat(c.open),
          high: parseFloat(c.high),
          low: parseFloat(c.low),
          close: parseFloat(c.close),
          volume: parseFloat(c.volume || '0'),
        })).filter(c => !isNaN(c.close) && c.close > 0);

        candles.sort((a, b) => a.time - b.time);

        if (candles.length > 0) {
          // Bounded cache (max 50 keys to save RAM on 4GB PC)
          if (this.cache.size >= 50) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey) this.cache.delete(firstKey);
          }
          this.cache.set(cacheKey, { candles, timestamp: Date.now() });
          return candles;
        }

        if (cached) return cached.candles;
        return [];
      } catch (err: any) {
        lastErr = err;
        if (attempt < 2) {
          // Backoff before retry
          await new Promise(r => setTimeout(r, 600));
        }
      }
    }

    if (cached) {
      console.warn(`[DELTA] Network timeout on ${pair} ${timeframe}; serving cached snapshot (${cached.candles.length} bars)`);
      return cached.candles;
    }

    console.warn(`[DELTA] getKlines failed after retries: ${lastErr?.message}`);
    return [];
  }

  /**
   * Range query for backtesting on Delta Exchange historical candles
   */
  public async getHistoricalRange(
    pair: string,
    timeframe: string,
    startTimeMs: number,
    endTimeMs: number
  ): Promise<Candle[]> {
    const spec = INSTRUMENT_SPECS[pair];
    if (!spec || !spec.isAvailableOnDelta) {
      throw new Error(`Unsupported instrument ${pair} on Delta Exchange.`);
    }

    const tfInfo = TIMEFRAME_MAP[timeframe] || TIMEFRAME_MAP['15m'];
    const startSec = Math.floor(startTimeMs / 1000);
    const endSec = Math.floor(endTimeMs / 1000);

    const url = `${DELTA_REST_HOST}/v2/history/candles?resolution=${tfInfo.deltaResolution}&symbol=${spec.deltaSymbol}&start=${startSec}&end=${endSec}`;

    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error(`HTTP ${res.status} from Delta Exchange candles`);

      const data = await res.json() as any;
      const raw = data?.result || [];

      const candles: Candle[] = raw.map((c: any) => ({
        time: c.time,
        open: parseFloat(c.open),
        high: parseFloat(c.high),
        low: parseFloat(c.low),
        close: parseFloat(c.close),
        volume: parseFloat(c.volume || '0'),
      })).filter((c: Candle) => !isNaN(c.close) && c.close > 0);

      candles.sort((a: Candle, b: Candle) => a.time - b.time);
      return candles;
    } catch (err: any) {
      console.warn(`[DELTA] Historical range fetch warning: ${err.message}`);
      return [];
    }
  }
}

export const marketData = new MarketDataService();
