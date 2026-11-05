import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'aurevian.db');

export class AurevianDatabase {
  private db: DatabaseSync;

  constructor() {
    this.db = new DatabaseSync(DB_PATH);
    this.initSchema();
  }

  private initSchema() {
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'trader',
        balance REAL NOT NULL DEFAULT 10000.0,
        avatar_url TEXT,
        created_at INTEGER NOT NULL,
        last_login INTEGER
      );

      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS strategies (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        is_builtin INTEGER DEFAULT 0,
        enabled INTEGER DEFAULT 1,
        timeframe TEXT DEFAULT '15m',
        trend_timeframe TEXT DEFAULT '1h',
        config_json TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS positions (
        id TEXT PRIMARY KEY,
        pair TEXT NOT NULL,
        strategy_id TEXT NOT NULL,
        direction TEXT NOT NULL, -- 'LONG' | 'SHORT'
        entry_price REAL NOT NULL,
        current_price REAL NOT NULL,
        quantity REAL NOT NULL,
        stop_loss REAL NOT NULL,
        take_profit REAL NOT NULL,
        unrealized_pnl REAL DEFAULT 0,
        fees_incurred REAL DEFAULT 0,
        opened_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS trades (
        id TEXT PRIMARY KEY,
        pair TEXT NOT NULL,
        strategy_name TEXT NOT NULL,
        direction TEXT NOT NULL,
        entry_price REAL NOT NULL,
        exit_price REAL NOT NULL,
        quantity REAL NOT NULL,
        gross_pnl REAL NOT NULL,
        net_pnl REAL NOT NULL,
        fees REAL NOT NULL,
        exit_reason TEXT NOT NULL, -- 'STOP_LOSS' | 'TAKE_PROFIT' | 'MANUAL' | 'SIGNAL_REVERSAL'
        opened_at INTEGER NOT NULL,
        closed_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS signals (
        id TEXT PRIMARY KEY,
        pair TEXT NOT NULL,
        strategy_id TEXT NOT NULL,
        strategy_name TEXT NOT NULL,
        direction TEXT NOT NULL, -- 'LONG' | 'SHORT'
        entry_price REAL NOT NULL,
        stop_loss REAL NOT NULL,
        take_profit REAL NOT NULL,
        risk_reward REAL NOT NULL,
        timeframe TEXT NOT NULL,
        reasons_json TEXT NOT NULL,
        status TEXT DEFAULT 'ACTIVE', -- 'ACTIVE' | 'TRIGGERED' | 'EXPIRED'
        timestamp INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS bot_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        status TEXT NOT NULL DEFAULT 'STOPPED', -- 'STARTING' | 'WORKING' | 'WAITING_FOR_SETUP' | 'POSITION_OPEN' | 'STOPPED' | 'ERROR'
        pair TEXT NOT NULL DEFAULT 'ETHUSD',
        strategy_id TEXT NOT NULL DEFAULT 'aurevian-smc-momentum',
        timeframe TEXT NOT NULL DEFAULT '15m',
        balance REAL NOT NULL DEFAULT 10000.0,
        risk_per_trade REAL NOT NULL DEFAULT 2.0,
        max_positions INTEGER NOT NULL DEFAULT 1,
        last_eval_time INTEGER,
        last_data_time INTEGER,
        last_reason TEXT,
        started_at INTEGER,
        error_message TEXT
      );

      CREATE TABLE IF NOT EXISTS bot_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        level TEXT NOT NULL, -- 'INFO' | 'WARN' | 'ERROR' | 'TRADE' | 'SIGNAL'
        message TEXT NOT NULL,
        details_json TEXT
      );
    `);

    // Initialize bot state singleton row if not exists
    const row = this.db.prepare('SELECT id FROM bot_state WHERE id = 1').get();
    if (!row) {
      this.db.prepare(`
        INSERT INTO bot_state (id, status, pair, strategy_id, timeframe, balance, risk_per_trade, max_positions)
        VALUES (1, 'STOPPED', 'ETHUSD', 'aurevian-smc-momentum', '15m', 10000.0, 2.0, 1)
      `).run();
    }

    // Initialize default risk settings if not present
    this.ensureDefaultSettings();
    this.ensureBuiltinStrategy();
  }

  private ensureDefaultSettings() {
    const defaults = {
      virtual_balance: 10000.0,
      risk_per_trade: 2.0,
      risk_to_reward: 2.0,
      daily_loss_limit: 5.0,
      max_drawdown: 15.0,
      max_open_positions: 1,
      max_consecutive_losses: 3,
      trading_fee_pct: 0.05,
      slippage_pct: 0.02,
      default_pair: 'ETHUSD',
      default_timeframe: '15m',
      default_strategy: 'aurevian-smc-momentum',
    };

    const stmt = this.db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
    for (const [key, val] of Object.entries(defaults)) {
      stmt.run(key, JSON.stringify(val));
    }
  }

  private ensureBuiltinStrategy() {
    const builtinId = 'aurevian-smc-momentum';
    const existing = this.db.prepare('SELECT id FROM strategies WHERE id = ?').get(builtinId);
    if (!existing) {
      const config = {
        name: 'AUREVIAN SMC MOMENTUM STRATEGY',
        trendTimeframe: '1h',
        entryTimeframe: '15m',
        trendFilter: { indicator: 'EMA', period: 200 },
        entryRules: {
          rsiPeriod: 14,
          rsiOversold: 40,
          rsiOverbought: 60,
          volumeSmaPeriod: 20,
          swingDetectionPeriod: 5,
          requireBos: true,
          requireChoch: true,
          requireLiquiditySweep: true,
        },
        risk: {
          atrPeriod: 14,
          atrMultiplierSL: 1.5,
          riskToReward: 2.0,
          riskPercentage: 2.0,
        },
      };

      this.db.prepare(`
        INSERT INTO strategies (id, name, description, is_builtin, enabled, timeframe, trend_timeframe, config_json, created_at, updated_at)
        VALUES (?, ?, ?, 1, 1, '15m', '1h', ?, ?, ?)
      `).run(
        builtinId,
        'AUREVIAN SMC MOMENTUM STRATEGY',
        'Proprietary Smart Money Concepts (BOS/CHoCH/Liquidity sweep) combined with 1H EMA-200 trend confirmation and 15M RSI momentum.',
        JSON.stringify(config),
        Date.now(),
        Date.now()
      );
    }

    // Seed AUREVIAN BOLLINGER BAND BREAKOUT
    const bbId = 'aurevian-bollinger-breakout';
    const existingBb = this.db.prepare('SELECT id FROM strategies WHERE id = ?').get(bbId);
    if (!existingBb) {
      const bbConfig = {
        name: 'AUREVIAN BOLLINGER BAND BREAKOUT',
        trendTimeframe: '1h',
        entryTimeframe: '15m',
        tradeDirection: 'BOTH', // 'BOTH' | 'LONG_ONLY' | 'SHORT_ONLY'
        bollinger: {
          period: 20,
          stdDev: 2.0,
          basis: 'SMA', // 'SMA' | 'EMA'
          squeezeLookback: 20,
          squeezeThresholdPercentile: 20,
        },
        trendFilter: {
          enabled: true,
          indicator: 'EMA',
          period: 200,
        },
        volumeFilter: {
          enabled: true,
          period: 20,
        },
        risk: {
          atrPeriod: 14,
          atrMultiplierSL: 1.5,
          riskToReward: 2.0,
          riskPercentage: 2.0,
        },
      };

      this.db.prepare(`
        INSERT INTO strategies (id, name, description, is_builtin, enabled, timeframe, trend_timeframe, config_json, created_at, updated_at)
        VALUES (?, ?, ?, 1, 1, '15m', '1h', ?, ?, ?)
      `).run(
        bbId,
        'AUREVIAN BOLLINGER BAND BREAKOUT',
        'Volatility squeeze breakout strategy detecting Bollinger Band contraction, confirmed band breakout closes, 1H EMA-200 trend filter, volume confirmation, and ATR 14 dynamic risk management.',
        JSON.stringify(bbConfig),
        Date.now(),
        Date.now()
      );
    }
  }

  // Settings
  getSetting<T>(key: string, defaultValue: T): T {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
    if (!row) return defaultValue;
    try {
      return JSON.parse(row.value) as T;
    } catch {
      return defaultValue;
    }
  }

  setSetting(key: string, value: any) {
    this.db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, JSON.stringify(value));
  }

  saveSetting(key: string, value: any) {
    this.setSetting(key, value);
  }

  getAllSettings(): Record<string, any> {
    const rows = this.db.prepare('SELECT key, value FROM settings').all() as Array<{ key: string; value: string }>;
    const result: Record<string, any> = {};
    for (const r of rows) {
      try {
        result[r.key] = JSON.parse(r.value);
      } catch {
        result[r.key] = r.value;
      }
    }
    return result;
  }

  // Bot State
  getBotState() {
    return this.db.prepare('SELECT * FROM bot_state WHERE id = 1').get() as any;
  }

  updateBotState(updates: Partial<{
    status: string;
    pair: string;
    strategy_id: string;
    timeframe: string;
    balance: number;
    risk_per_trade: number;
    max_positions: number;
    last_eval_time: number;
    last_data_time: number;
    last_reason: string;
    started_at: number | null;
    error_message: string | null;
  }>) {
    const keys = Object.keys(updates);
    if (keys.length === 0) return;
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const values = keys.map(k => (updates as any)[k]);
    this.db.prepare(`UPDATE bot_state SET ${setClause} WHERE id = 1`).run(...values);
  }

  // Logs
  addLog(level: string, message: string, details?: any) {
    this.db.prepare(`
      INSERT INTO bot_logs (timestamp, level, message, details_json)
      VALUES (?, ?, ?, ?)
    `).run(Date.now(), level, message, details ? JSON.stringify(details) : null);

    // Keep last 500 logs
    this.db.prepare(`
      DELETE FROM bot_logs WHERE id NOT IN (SELECT id FROM bot_logs ORDER BY id DESC LIMIT 500)
    `).run();
  }

  getRecentLogs(limit = 100) {
    return this.db.prepare('SELECT * FROM bot_logs ORDER BY id DESC LIMIT ?').all(limit);
  }

  // Strategies
  getStrategies() {
    return this.db.prepare('SELECT * FROM strategies ORDER BY is_builtin DESC, created_at DESC').all() as any[];
  }

  getStrategyById(id: string) {
    return this.db.prepare('SELECT * FROM strategies WHERE id = ?').get(id) as any;
  }

  createStrategy(strategy: {
    id: string;
    name: string;
    description: string;
    timeframe: string;
    trend_timeframe?: string;
    config_json: string;
  }) {
    const now = Date.now();
    this.db.prepare(`
      INSERT INTO strategies (id, name, description, is_builtin, enabled, timeframe, trend_timeframe, config_json, created_at, updated_at)
      VALUES (?, ?, ?, 0, 1, ?, ?, ?, ?, ?)
    `).run(
      strategy.id,
      strategy.name,
      strategy.description || '',
      strategy.timeframe || '15m',
      strategy.trend_timeframe || '1h',
      strategy.config_json,
      now,
      now
    );
  }

  updateStrategy(id: string, updates: Partial<{
    name: string;
    description: string;
    enabled: number;
    timeframe: string;
    trend_timeframe: string;
    config_json: string;
  }>) {
    const keys = Object.keys(updates);
    if (keys.length === 0) return;
    const setClause = keys.map(k => `${k} = ?`).join(', ') + ', updated_at = ?';
    const values = [...keys.map(k => (updates as any)[k]), Date.now(), id];
    this.db.prepare(`UPDATE strategies SET ${setClause} WHERE id = ?`).run(...values);
  }

  deleteStrategy(id: string) {
    this.db.prepare('DELETE FROM strategies WHERE id = ? AND is_builtin = 0').run(id);
  }

  // Positions
  getOpenPositions() {
    return this.db.prepare('SELECT * FROM positions ORDER BY opened_at DESC').all() as any[];
  }

  getPosition(id: string) {
    return this.db.prepare('SELECT * FROM positions WHERE id = ?').get(id) as any;
  }

  addPosition(pos: {
    id: string;
    pair: string;
    strategy_id: string;
    direction: string;
    entry_price: number;
    current_price: number;
    quantity: number;
    stop_loss: number;
    take_profit: number;
    unrealized_pnl: number;
    fees_incurred: number;
    opened_at: number;
  }) {
    this.db.prepare(`
      INSERT INTO positions (id, pair, strategy_id, direction, entry_price, current_price, quantity, stop_loss, take_profit, unrealized_pnl, fees_incurred, opened_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      pos.id,
      pos.pair,
      pos.strategy_id,
      pos.direction,
      pos.entry_price,
      pos.current_price,
      pos.quantity,
      pos.stop_loss,
      pos.take_profit,
      pos.unrealized_pnl,
      pos.fees_incurred,
      pos.opened_at
    );
  }

  updatePosition(id: string, updates: Partial<{
    current_price: number;
    unrealized_pnl: number;
    stop_loss: number;
    take_profit: number;
  }>) {
    const keys = Object.keys(updates);
    if (keys.length === 0) return;
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const values = [...keys.map(k => (updates as any)[k]), id];
    this.db.prepare(`UPDATE positions SET ${setClause} WHERE id = ?`).run(...values);
  }

  deletePosition(id: string) {
    this.db.prepare('DELETE FROM positions WHERE id = ?').run(id);
  }

  // Trades
  getTrades(filters?: { pair?: string; strategy?: string; limit?: number }) {
    let query = 'SELECT * FROM trades';
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters?.pair && filters.pair !== 'ALL') {
      conditions.push('pair = ?');
      params.push(filters.pair);
    }
    if (filters?.strategy && filters.strategy !== 'ALL') {
      conditions.push('strategy_name = ?');
      params.push(filters.strategy);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY closed_at DESC';

    if (filters?.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    return this.db.prepare(query).all(...params) as any[];
  }

  recordClosedTrade(trade: {
    id: string;
    pair: string;
    strategy_name: string;
    direction: string;
    entry_price: number;
    exit_price: number;
    quantity: number;
    gross_pnl: number;
    net_pnl: number;
    fees: number;
    exit_reason: string;
    opened_at: number;
    closed_at: number;
  }) {
    this.db.prepare(`
      INSERT INTO trades (id, pair, strategy_name, direction, entry_price, exit_price, quantity, gross_pnl, net_pnl, fees, exit_reason, opened_at, closed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      trade.id,
      trade.pair,
      trade.strategy_name,
      trade.direction,
      trade.entry_price,
      trade.exit_price,
      trade.quantity,
      trade.gross_pnl,
      trade.net_pnl,
      trade.fees,
      trade.exit_reason,
      trade.opened_at,
      trade.closed_at
    );
  }

  // Signals
  getSignals(limit = 100) {
    return this.db.prepare('SELECT * FROM signals ORDER BY timestamp DESC LIMIT ?').all(limit) as any[];
  }

  addSignal(sig: {
    id: string;
    pair: string;
    strategy_id: string;
    strategy_name: string;
    direction: string;
    entry_price: number;
    stop_loss: number;
    take_profit: number;
    risk_reward: number;
    timeframe: string;
    reasons_json: string;
    status: string;
    timestamp: number;
  }) {
    this.db.prepare(`
      INSERT INTO signals (id, pair, strategy_id, strategy_name, direction, entry_price, stop_loss, take_profit, risk_reward, timeframe, reasons_json, status, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      sig.id,
      sig.pair,
      sig.strategy_id,
      sig.strategy_name,
      sig.direction,
      sig.entry_price,
      sig.stop_loss,
      sig.take_profit,
      sig.risk_reward,
      sig.timeframe,
      sig.reasons_json,
      sig.status,
      sig.timestamp
    );

    // Keep last 300 signals
    this.db.prepare(`
      DELETE FROM signals WHERE id NOT IN (SELECT id FROM signals ORDER BY timestamp DESC LIMIT 300)
    `).run();
  }

  // Export & Backup
  exportData() {
    const settings = this.getAllSettings();
    const strategies = this.getStrategies();
    const positions = this.getOpenPositions();
    const trades = this.getTrades();
    const signals = this.getSignals();
    const botState = this.getBotState();
    const logs = this.getRecentLogs(200);

    return {
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
      founder: 'Sehaj Jatana',
      application: 'AUREVIAN ALGO TRADER',
      settings,
      strategies,
      positions,
      trades,
      signals,
      botState,
      logs,
    };
  }

  // Full reset as mandated in Section 17
  resetData() {
    this.db.exec(`
      DELETE FROM positions;
      DELETE FROM trades;
      DELETE FROM signals;
      DELETE FROM bot_logs;
      DELETE FROM strategies WHERE is_builtin = 0;
    `);

    // Reset bot state to clean defaults
    this.db.prepare(`
      UPDATE bot_state SET
        status = 'STOPPED',
        pair = 'ETHUSD',
        strategy_id = 'aurevian-smc-momentum',
        timeframe = '15m',
        balance = 10000.0,
        risk_per_trade = 2.0,
        max_positions = 1,
        last_eval_time = NULL,
        last_data_time = NULL,
        last_reason = 'System reset to factory defaults',
        started_at = NULL,
        error_message = NULL
      WHERE id = 1
    `).run();

    // Reset settings
    this.setSetting('virtual_balance', 10000.0);
    this.setSetting('risk_per_trade', 2.0);
    this.setSetting('risk_to_reward', 2.0);
    this.setSetting('max_open_positions', 1);

    this.addLog('INFO', 'System data reset executed. Virtual balance restored to $10,000.00.');
  }

  // User Authentication & Session Management
  createUser(user: {
    id: string;
    email: string;
    name: string;
    password_hash: string;
    salt: string;
    role?: string;
    balance?: number;
    avatar_url?: string;
    created_at: number;
  }) {
    this.db.prepare(`
      INSERT INTO users (id, email, name, password_hash, salt, role, balance, avatar_url, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      user.id,
      user.email.toLowerCase().trim(),
      user.name.trim(),
      user.password_hash,
      user.salt,
      user.role || 'trader',
      user.balance || 10000.0,
      user.avatar_url || null,
      user.created_at
    );
  }

  getUserByEmail(email: string) {
    return this.db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim()) as any;
  }

  getUserById(id: string) {
    return this.db.prepare('SELECT id, email, name, role, balance, avatar_url, created_at, last_login FROM users WHERE id = ?').get(id) as any;
  }

  updateUserLastLogin(id: string) {
    this.db.prepare('UPDATE users SET last_login = ? WHERE id = ?').run(Date.now(), id);
  }

  createSession(token: string, userId: string, expiresAt: number) {
    this.db.prepare(`
      INSERT INTO sessions (token, user_id, expires_at, created_at)
      VALUES (?, ?, ?, ?)
    `).run(token, userId, expiresAt, Date.now());
  }

  getSession(token: string) {
    const now = Date.now();
    return this.db.prepare(`
      SELECT s.token, s.user_id, s.expires_at, u.id, u.email, u.name, u.role, u.balance, u.avatar_url
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ? AND s.expires_at > ?
    `).get(token, now) as any;
  }

  deleteSession(token: string) {
    this.db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  }

  cleanExpiredSessions() {
    this.db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now());
  }
}

export const db = new AurevianDatabase();
