import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import dotenv from 'dotenv';
import { db } from './server/db.js';
import { marketData } from './server/marketData.js';
import {
  calculateEMA,
  calculateSMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateATR,
  analyzeSMC,
} from './server/indicators.js';
import { strategyEngine } from './server/strategyEngine.js';
import { botEngine } from './server/botEngine.js';
import { backtestEngine } from './server/backtester.js';
import { aiAnalyst } from './server/aiAnalyst.js';
import { deltaAuth } from './server/deltaAuth.js';
import { newsService } from './server/newsService.js';
import { authService } from './server/auth.js';

dotenv.config();

const app = express();
app.use(express.json());

// 0. User Authentication & Multi-User Support
app.post('/api/auth/signup', (req, res) => {
  const { name, email, password } = req.body;
  const result = authService.signUp(name, email, password);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const result = authService.login(email, password);
  if (!result.success) {
    return res.status(401).json(result);
  }
  res.json(result);
});

app.post('/api/auth/demo', (req, res) => {
  const result = authService.demoLogin();
  res.json(result);
});

app.get('/api/auth/me', (req, res) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '') || (req.query.token as string);
  if (!token) {
    return res.status(401).json({ success: false, error: 'No active session token' });
  }
  const user = authService.validateToken(token);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Session expired or invalid' });
  }
  res.json({ success: true, user });
});

app.post('/api/auth/logout', (req, res) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '') || req.body?.token;
  if (token) {
    authService.logout(token);
  }
  res.json({ success: true });
});

// API Routes

// 1. Market Data
app.get('/api/market/tickers', (req, res) => {
  res.json({
    tickers: marketData.getAllTickers(),
    timestamp: Date.now(),
  });
});

app.get('/api/market/ticker/:pair', (req, res) => {
  const ticker = marketData.getTicker(req.params.pair);
  if (!ticker) return res.status(404).json({ error: 'Ticker not found' });
  res.json({ ticker });
});

app.get('/api/market/klines', async (req, res) => {
  const pair = (req.query.pair as string) || 'ETHUSD';
  const timeframe = (req.query.timeframe as string) || '15m';
  const limit = Math.min(parseInt(req.query.limit as string) || 200, 1000);

  try {
    const candles = await marketData.getKlines(pair, timeframe, limit);
    res.json({ pair, timeframe, candles });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch candles' });
  }
});

// 2. Technical Indicators & SMC
app.get('/api/indicators', async (req, res) => {
  const pair = (req.query.pair as string) || 'ETHUSD';
  const timeframe = (req.query.timeframe as string) || '15m';
  const limit = Math.min(parseInt(req.query.limit as string) || 200, 500);

  try {
    const candles = await marketData.getKlines(pair, timeframe, limit);
    const closes = candles.map(c => c.close);
    const volumes = candles.map(c => c.volume);

    const ema20 = calculateEMA(closes, 20);
    const ema50 = calculateEMA(closes, 50);
    const ema200 = calculateEMA(closes, 200);
    const sma20 = calculateSMA(closes, 20);
    const rsi14 = calculateRSI(closes, 14);
    const macd = calculateMACD(closes);
    const bb = calculateBollingerBands(closes);
    const atr14 = calculateATR(candles, 14);
    const volSma20 = calculateSMA(volumes, 20);
    const { swingPoints, smcSignals } = analyzeSMC(candles, 5);

    res.json({
      pair,
      timeframe,
      indicators: {
        ema20,
        ema50,
        ema200,
        sma20,
        rsi14,
        macd,
        bb,
        atr14,
        volSma20,
        swingPoints,
        smcSignals,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Strategies
app.get('/api/strategies', (req, res) => {
  const strategies = db.getStrategies();
  res.json({ strategies });
});

app.post('/api/strategies', (req, res) => {
  const { name, description, timeframe, trend_timeframe, config } = req.body;
  if (!name || !config) {
    return res.status(400).json({ error: 'Name and config are required' });
  }
  const id = `strat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  db.createStrategy({
    id,
    name,
    description: description || '',
    timeframe: timeframe || '15m',
    trend_timeframe: trend_timeframe || '1h',
    config_json: JSON.stringify(config),
  });
  db.addLog('INFO', `Custom Strategy Created: "${name}"`);
  res.json({ success: true, strategyId: id });
});

app.put('/api/strategies/:id', (req, res) => {
  const { name, description, timeframe, trend_timeframe, enabled, config } = req.body;
  const updates: any = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (timeframe !== undefined) updates.timeframe = timeframe;
  if (trend_timeframe !== undefined) updates.trend_timeframe = trend_timeframe;
  if (enabled !== undefined) updates.enabled = enabled ? 1 : 0;
  if (config !== undefined) updates.config_json = JSON.stringify(config);

  db.updateStrategy(req.params.id, updates);
  db.addLog('INFO', `Strategy Updated: ${req.params.id}`);
  res.json({ success: true });
});

app.delete('/api/strategies/:id', (req, res) => {
  db.deleteStrategy(req.params.id);
  db.addLog('INFO', `Custom Strategy Deleted: ${req.params.id}`);
  res.json({ success: true });
});

app.post('/api/strategies/:id/duplicate', (req, res) => {
  const existing = db.getStrategyById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Strategy not found' });

  const newId = `strat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  db.createStrategy({
    id: newId,
    name: `${existing.name} (Copy)`,
    description: existing.description,
    timeframe: existing.timeframe,
    trend_timeframe: existing.trend_timeframe,
    config_json: existing.config_json,
  });
  res.json({ success: true, newStrategyId: newId });
});

app.post('/api/strategy/evaluate', async (req, res) => {
  const { pair = 'ETHUSD', strategyId = 'aurevian-smc-momentum', timeframe = '15m', config } = req.body;
  try {
    const entryCandles = await marketData.getKlines(pair, timeframe, 150);
    const trendCandles = await marketData.getKlines(pair, '1H', 150);
    const strategyRecord = db.getStrategyById(strategyId);

    let result;
    if (strategyRecord && strategyRecord.is_builtin === 0) {
      result = strategyEngine.evaluateCustomStrategy(strategyRecord, entryCandles);
    } else if (strategyId === 'aurevian-bollinger-breakout') {
      const cfg = config || (strategyRecord?.config_json ? JSON.parse(strategyRecord.config_json) : undefined);
      result = strategyEngine.evaluateBollingerBreakout(entryCandles, trendCandles, cfg);
    } else {
      result = strategyEngine.evaluateAurevianSMC(entryCandles, trendCandles);
    }
    res.json({ result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Algo Bot Control
app.get('/api/bot/state', (req, res) => {
  res.json(botEngine.getStatus());
});

app.post('/api/bot/start', async (req, res) => {
  const { pair, strategy_id, timeframe, risk_per_trade, max_positions } = req.body;
  try {
    await botEngine.startBot({
      pair,
      strategy_id,
      timeframe,
      risk_per_trade: risk_per_trade ? parseFloat(risk_per_trade) : undefined,
      max_positions: max_positions ? parseInt(max_positions) : undefined,
    });
    res.json({ success: true, message: 'Algo bot started' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bot/pause', (req, res) => {
  botEngine.pauseBot(req.body.reason || 'User manual pause');
  res.json({ success: true, message: 'Algo bot paused' });
});

app.post('/api/bot/resume', async (req, res) => {
  try {
    await botEngine.resumeBot();
    res.json({ success: true, message: 'Algo bot resumed' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bot/stop', (req, res) => {
  botEngine.stopBot(req.body.reason || 'User manual stop');
  res.json({ success: true, message: 'Algo bot stopped' });
});

app.post('/api/bot/restart', async (req, res) => {
  try {
    await botEngine.restartBot();
    res.json({ success: true, message: 'Algo bot restarted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Positions & Trades
app.get('/api/positions', (req, res) => {
  const positions = db.getOpenPositions();
  res.json({ positions });
});

app.post('/api/positions/:id/close', async (req, res) => {
  try {
    await botEngine.closePosition(req.params.id, 'MANUAL_CLOSE');
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/trades', (req, res) => {
  const pair = req.query.pair as string | undefined;
  const strategy = req.query.strategy as string | undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 200;
  const trades = db.getTrades({ pair, strategy, limit });
  res.json({ trades });
});

app.get('/api/signals', (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
  const signals = db.getSignals(limit);
  res.json({ signals });
});

// 6. Analytics
app.get('/api/analytics', (req, res) => {
  const trades = db.getTrades();
  const totalTrades = trades.length;
  const winningTrades = trades.filter(t => t.net_pnl > 0);
  const losingTrades = trades.filter(t => t.net_pnl <= 0);

  const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : null;
  const totalGrossPnl = trades.reduce((sum, t) => sum + t.gross_pnl, 0);
  const totalFees = trades.reduce((sum, t) => sum + t.fees, 0);
  const totalNetPnl = trades.reduce((sum, t) => sum + t.net_pnl, 0);

  const totalWinPnl = winningTrades.reduce((sum, t) => sum + t.net_pnl, 0);
  const totalLossPnl = Math.abs(losingTrades.reduce((sum, t) => sum + t.net_pnl, 0));
  const profitFactor = totalLossPnl > 0 ? totalWinPnl / totalLossPnl : totalWinPnl > 0 ? 99.0 : 0;

  const avgWin = winningTrades.length > 0 ? totalWinPnl / winningTrades.length : 0;
  const avgLoss = losingTrades.length > 0 ? totalLossPnl / losingTrades.length : 0;

  // Max drawdown calculation over trade history
  let currentEquity = 10000;
  let peakEquity = 10000;
  let maxDrawdown = 0;
  let maxDrawdownPct = 0;

  // Chronological order for equity curve
  const chronTrades = [...trades].sort((a, b) => a.closed_at - b.closed_at);
  const equityPoints: Array<{ time: number; equity: number }> = [
    { time: chronTrades[0]?.opened_at || Date.now(), equity: 10000 },
  ];

  for (const t of chronTrades) {
    currentEquity += t.net_pnl;
    if (currentEquity > peakEquity) peakEquity = currentEquity;
    const dd = peakEquity - currentEquity;
    const ddPct = (dd / peakEquity) * 100;
    if (dd > maxDrawdown) maxDrawdown = dd;
    if (ddPct > maxDrawdownPct) maxDrawdownPct = ddPct;
    equityPoints.push({ time: t.closed_at, equity: currentEquity });
  }

  // Breakdown by pair
  const byPair: Record<string, { trades: number; wins: number; netPnl: number }> = {};
  for (const t of trades) {
    if (!byPair[t.pair]) byPair[t.pair] = { trades: 0, wins: 0, netPnl: 0 };
    byPair[t.pair].trades++;
    if (t.net_pnl > 0) byPair[t.pair].wins++;
    byPair[t.pair].netPnl += t.net_pnl;
  }

  // Breakdown by strategy
  const byStrategy: Record<string, { trades: number; wins: number; netPnl: number }> = {};
  for (const t of trades) {
    if (!byStrategy[t.strategy_name]) byStrategy[t.strategy_name] = { trades: 0, wins: 0, netPnl: 0 };
    byStrategy[t.strategy_name].trades++;
    if (t.net_pnl > 0) byStrategy[t.strategy_name].wins++;
    byStrategy[t.strategy_name].netPnl += t.net_pnl;
  }

  res.json({
    totalTrades,
    winningCount: winningTrades.length,
    losingCount: losingTrades.length,
    winRate, // null if 0 trades
    totalGrossPnl,
    totalFees,
    totalNetPnl,
    profitFactor,
    avgWin,
    avgLoss,
    maxDrawdown,
    maxDrawdownPct,
    equityCurve: equityPoints,
    byPair,
    byStrategy,
  });
});

// 7. Backtesting
app.post('/api/backtest', async (req, res) => {
  try {
    const result = await backtestEngine.runBacktest(req.body);
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 8. Settings & Reset
app.get('/api/settings', (req, res) => {
  res.json({ settings: db.getAllSettings() });
});

app.post('/api/settings', (req, res) => {
  const settings = req.body;
  for (const [key, val] of Object.entries(settings)) {
    db.setSetting(key, val);
  }
  db.addLog('INFO', 'System settings updated');
  res.json({ success: true, settings: db.getAllSettings() });
});

app.get('/api/data/export', (req, res) => {
  const exportPayload = db.exportData();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=aurevian_backup_${Date.now()}.json`);
  res.send(JSON.stringify(exportPayload, null, 2));
});

app.post('/api/data/reset', (req, res) => {
  const { confirmation } = req.body;
  if (confirmation !== 'RESET_AUREVIAN_DATA') {
    return res.status(400).json({ error: 'Explicit confirmation string required.' });
  }
  botEngine.stopBot('System factory reset triggered');
  db.resetData();
  res.json({ success: true, message: 'All trading data, positions, and history reset to default $10,000 balance.' });
});

// 9. AI Market Analyst & Image Generator
app.post('/api/ai/analyze', async (req, res) => {
  const { pair = 'ETHUSD', timeframe = '15m', userNotes, model } = req.body;
  try {
    const analysis = await aiAnalyst.analyzeMarket(pair, timeframe, userNotes, model);
    res.json(analysis);
  } catch (err: any) {
    res.json({
      success: false,
      error: {
        type: 'API_ERROR',
        title: 'AI Analysis Temporarily Unavailable',
        message: err.message || 'Error executing AI analysis.',
        quotaDetail: 'Market data and rule-based paper trading continue unaffected.',
      },
    });
  }
});

app.post('/api/ai/visualize', async (req, res) => {
  const { pair = 'ETHUSD', concept = 'SMC Liquidity Sweep & BOS Entry', imageSize = '1K', aspectRatio = '16:9' } = req.body;
  try {
    const visual = await aiAnalyst.generateVisualSetup({
      pair,
      concept,
      imageSize,
      aspectRatio,
    });
    res.json(visual);
  } catch (err: any) {
    res.json({
      success: false,
      error: {
        type: 'API_ERROR',
        title: 'Visual Setup Temporarily Unavailable',
        message: err.message,
      },
    });
  }
});

// 10. Delta Exchange Read-Only Account Connection
app.get('/api/delta/account', (req, res) => {
  res.json({ success: true, account: deltaAuth.getStatus() });
});

app.post('/api/delta/account/connect', async (req, res) => {
  const { apiKey, apiSecret, environment = 'india' } = req.body;
  const result = await deltaAuth.connectReadOnly(apiKey, apiSecret, environment);
  if (!result.success) {
    return res.status(400).json(result);
  }
  db.addLog('INFO', `Delta Exchange account connected in READ-ONLY mode (${environment})`);
  res.json(result);
});

app.post('/api/delta/account/disconnect', (req, res) => {
  const result = deltaAuth.disconnect();
  db.addLog('INFO', 'Delta Exchange account disconnected by user.');
  res.json(result);
});

// 11. Chart & Strategy Synchronization
app.post('/api/bot/configure', (req, res) => {
  const { pair, timeframe, strategy_id } = req.body;
  const updates: any = {};
  if (pair) updates.pair = pair;
  if (timeframe) updates.timeframe = timeframe;
  if (strategy_id) updates.strategy_id = strategy_id;
  db.updateBotState(updates);
  res.json({ success: true, botState: db.getBotState() });
});

// 12. Market News Aggregator
app.get('/api/news', async (req, res) => {
  const force = req.query.force === 'true';
  try {
    const data = await newsService.getNews(force);
    res.json({
      success: true,
      items: data.items,
      lastFetchedAt: data.lastFetchedAt,
      fromCache: data.fromCache,
      count: data.items.length,
    });
  } catch (err: any) {
    res.status(503).json({
      success: false,
      error: err.message || 'Live Market News connection temporarily unavailable.',
      items: [],
    });
  }
});

// 13. Handle undefined API endpoints with JSON 404 so they don't fall through to SPA HTML
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: `Not found: ${req.method} ${req.path}` });
});

// Full-stack Vite mounting

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  // Parse port and host from argv (passed by dev runner: --port 3000 --host 0.0.0.0)
  let port = 3000;
  const portArgIdx = process.argv.indexOf('--port');
  if (portArgIdx !== -1 && process.argv[portArgIdx + 1]) {
    port = parseInt(process.argv[portArgIdx + 1], 10);
  }

  let host = '0.0.0.0';
  const hostArgIdx = process.argv.indexOf('--host');
  if (hostArgIdx !== -1 && process.argv[hostArgIdx + 1]) {
    host = process.argv[hostArgIdx + 1];
  }

  const server = app.listen(port, host, () => {
    console.log(`[AUREVIAN ALGO TRADER] Server running on http://${host}:${port}`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[AUREVIAN ALGO TRADER] Port ${port} is currently busy, retrying in 1s...`);
      setTimeout(() => {
        server.close();
        server.listen(port, host);
      }, 1000);
    } else {
      console.error('[AUREVIAN ALGO TRADER] Server error:', err);
    }
  });

  const shutdown = () => {
    console.log('[AUREVIAN ALGO TRADER] Gracefully closing server...');
    server.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer().catch(err => {
  console.error('[AUREVIAN ALGO TRADER] Fatal startup error:', err);
});

