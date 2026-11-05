import { db } from './db.js';
import { marketData } from './marketData.js';
import { strategyEngine, StrategyEvaluationResult } from './strategyEngine.js';

export class BotEngine {
  private isRunning = false;
  private isPaused = false;
  private timer: NodeJS.Timeout | null = null;
  private monitorTimer: NodeJS.Timeout | null = null;
  private consecutiveErrors = 0;
  private isEvaluating = false;
  private lastTradedCandleTime = 0;

  constructor() {
    // Check if bot was marked RUNNING or PAUSED in database prior to server restart
    const state = db.getBotState();
    if (state && (state.status === 'WORKING' || state.status === 'WAITING_FOR_SETUP' || state.status === 'POSITION_OPEN')) {
      console.log('[AUREVIAN BOT] Resuming persistent execution from previous session...');
      this.startBot().catch(err => {
        console.error('[AUREVIAN BOT] Error resuming:', err);
      });
    } else if (state && state.status === 'PAUSED') {
      console.log('[AUREVIAN BOT] Restoring PAUSED state and monitoring open positions...');
      this.isRunning = true;
      this.isPaused = true;
      this.startPositionMonitorOnly();
    }
  }

  public async startBot(configOverrides?: {
    pair?: string;
    strategy_id?: string;
    timeframe?: string;
    risk_per_trade?: number;
    max_positions?: number;
  }) {
    if (this.isRunning && !this.isPaused) {
      db.addLog('INFO', 'Bot is already running. Applying configuration updates.', configOverrides);
    }

    this.isRunning = true;
    this.isPaused = false;
    this.consecutiveErrors = 0;

    // Update state to STARTING
    db.updateBotState({
      status: 'STARTING',
      started_at: Date.now(),
      error_message: null,
      ...(configOverrides || {}),
    });

    db.addLog('INFO', 'Aurevian Algo Bot starting up...', configOverrides);

    // Clear any previous intervals
    if (this.timer) clearInterval(this.timer);
    if (this.monitorTimer) clearInterval(this.monitorTimer);

    // Initial check immediately
    await this.tickStrategy();
    await this.tickPositionMonitor();

    // Fast 5-second background strategy evaluation loop
    this.timer = setInterval(() => {
      this.tickStrategy().catch(err => {
        this.handleError(err);
      });
    }, 5000);

    // Fast 1.5-second tick-by-tick SL/TP position monitor loop
    this.monitorTimer = setInterval(() => {
      this.tickPositionMonitor().catch(err => {
        console.error('[AUREVIAN BOT] Position monitor error:', err.message);
      });
    }, 1500);

    console.log('[AUREVIAN BOT] Continuous 5-second paper-trading daemon active.');
  }

  public pauseBot(reason = 'User requested pause') {
    if (!this.isRunning) return;

    this.isPaused = true;
    db.updateBotState({
      status: 'PAUSED',
      last_reason: reason,
    });

    db.addLog(
      'INFO',
      `[PAPER TRADE] Algo Bot PAUSED: New trade entries suspended. Existing open positions continue active SL/TP monitoring.`
    );
    console.log(`[AUREVIAN BOT] Paused: ${reason}`);
  }

  public async resumeBot() {
    if (!this.isRunning) {
      await this.startBot();
      return;
    }

    this.isPaused = false;
    const openPositions = db.getOpenPositions();
    const newStatus = openPositions.length > 0 ? 'POSITION_OPEN' : 'WORKING';

    db.updateBotState({
      status: newStatus,
      last_reason: 'Bot resumed. Active strategy evaluation and paper entries re-enabled.',
    });

    db.addLog('INFO', `[PAPER TRADE] Algo Bot RESUMED. Evaluation loop active.`);
    console.log('[AUREVIAN BOT] Resumed.');

    // Immediate tick
    await this.tickStrategy();
  }

  public stopBot(reason = 'User requested stop') {
    this.isRunning = false;
    this.isPaused = false;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.monitorTimer) {
      clearInterval(this.monitorTimer);
      this.monitorTimer = null;
    }

    db.updateBotState({
      status: 'STOPPED',
      last_reason: reason,
    });
    db.addLog('INFO', `[PAPER TRADE] Algo Bot stopped: ${reason}. Historical trades preserved.`);
    console.log(`[AUREVIAN BOT] Stopped: ${reason}`);
  }

  public async restartBot() {
    this.stopBot('Restart requested');
    await new Promise(r => setTimeout(r, 600));
    await this.startBot();
  }

  private startPositionMonitorOnly() {
    if (this.monitorTimer) clearInterval(this.monitorTimer);
    this.monitorTimer = setInterval(() => {
      this.tickPositionMonitor().catch(err => {
        console.error('[AUREVIAN BOT] Monitor error:', err.message);
      });
    }, 1500);
  }

  private handleError(err: any) {
    this.consecutiveErrors++;
    const errMsg = err?.message || String(err);
    console.error(`[AUREVIAN BOT] Error (#${this.consecutiveErrors}):`, errMsg);

    if (this.consecutiveErrors >= 8) {
      db.updateBotState({
        status: 'ERROR',
        error_message: `Exceeded error threshold: ${errMsg}`,
      });
      db.addLog('ERROR', `Algo Bot encountered fatal error: ${errMsg}`);
      this.stopBot('Fatal API or market data error');
    } else {
      db.updateBotState({
        error_message: `Temporary warning: ${errMsg} (retrying in 5s)`,
      });
      db.addLog('WARN', `Temporary issue during evaluation: ${errMsg}`);
    }
  }

  /**
   * Evaluates strategy against live candle data and generates paper trades if conditions met
   */
  private async tickStrategy() {
    if (!this.isRunning || this.isPaused || this.isEvaluating) return;
    this.isEvaluating = true;

    try {
      const state = db.getBotState();
      const pair = state.pair || 'ETHUSD';
      const strategyId = state.strategy_id || 'aurevian-bollinger-breakout';
      const timeframe = state.timeframe || '15m';

      // 1. Fetch live candles and ticker
      const entryCandles = await marketData.getKlines(pair, timeframe, 150);
      const trendCandles = await marketData.getKlines(pair, '1H', 150);
      const currentTicker = marketData.getTicker(pair);

      if (!currentTicker || currentTicker.price <= 0) {
        db.updateBotState({
          last_reason: 'Awaiting verified market feed price from Delta Exchange...',
        });
        this.isEvaluating = false;
        return;
      }

      if (entryCandles.length < 50 || trendCandles.length < 50) {
        db.updateBotState({
          last_reason: 'Warming up historical candle cache for indicators...',
        });
        this.isEvaluating = false;
        return;
      }

      this.consecutiveErrors = 0; // successfully fetched data

      // 2. Check risk limits (Max Open Positions & Daily Loss Limit)
      const openPositions = db.getOpenPositions();
      const maxPositions = state.max_positions || 1;
      const hasOpenPositionOnPair = openPositions.some(p => p.pair === pair);

      // Check daily loss limit
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const todayTrades = db.getTrades({ limit: 100 }).filter(t => t.closed_at >= startOfDay.getTime());
      const todayNetPnl = todayTrades.reduce((sum, t) => sum + t.net_pnl, 0);
      const dailyLossLimitPct = db.getSetting<number>('daily_loss_limit', 5.0);
      const startingCapital = 10000.0;
      const maxDailyLossAmount = startingCapital * (dailyLossLimitPct / 100);

      const dailyLossBreached = todayNetPnl <= -maxDailyLossAmount;
      if (dailyLossBreached) {
        db.updateBotState({
          status: 'PAUSED',
          last_reason: `Daily loss limit of ${dailyLossLimitPct}% reached ($${Math.abs(todayNetPnl).toFixed(2)} / $${maxDailyLossAmount.toFixed(2)}). New entries halted.`,
        });
        db.addLog(
          'WARN',
          `[PAPER TRADE] Daily loss limit breached: -$${Math.abs(todayNetPnl).toFixed(2)}. Pausing new entries for today.`
        );
        this.isPaused = true;
        this.isEvaluating = false;
        return;
      }

      // 3. Evaluate Strategy
      let evalResult: StrategyEvaluationResult;
      const strategyRecord = db.getStrategyById(strategyId);

      if (strategyRecord && strategyRecord.is_builtin === 0) {
        evalResult = strategyEngine.evaluateCustomStrategy(strategyRecord, entryCandles);
      } else if (strategyId === 'aurevian-bollinger-breakout') {
        const cfg = strategyRecord?.config_json ? JSON.parse(strategyRecord.config_json) : undefined;
        evalResult = strategyEngine.evaluateBollingerBreakout(entryCandles, trendCandles, cfg);
      } else {
        evalResult = strategyEngine.evaluateAurevianSMC(entryCandles, trendCandles);
      }

      const closedCandle = entryCandles[entryCandles.length - 2];
      let newStatus: string = openPositions.length > 0 ? 'POSITION_OPEN' : 'WAITING_FOR_SETUP';

      // 4. If valid signal generated and conditions pass
      if (evalResult.signal !== 'HOLD') {
        const sigId = `sig_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        db.addSignal({
          id: sigId,
          pair,
          strategy_id: strategyId,
          strategy_name: evalResult.strategyName,
          direction: evalResult.signal,
          entry_price: evalResult.entryPrice,
          stop_loss: evalResult.stopLoss,
          take_profit: evalResult.takeProfit,
          risk_reward: evalResult.riskReward,
          timeframe,
          reasons_json: JSON.stringify(evalResult.passedConditions),
          status: 'ACTIVE',
          timestamp: Date.now(),
        });

        // Prevent duplicate entries on the same closed candle or when instrument already has an open position
        const isNewCandle = closedCandle.time !== this.lastTradedCandleTime;

        if (!hasOpenPositionOnPair && openPositions.length < maxPositions && isNewCandle) {
          this.lastTradedCandleTime = closedCandle.time;
          await this.executePaperEntry(state, evalResult, currentTicker.price);
          newStatus = 'POSITION_OPEN';
        } else if (hasOpenPositionOnPair) {
          db.addLog(
            'INFO',
            `[PAPER TRADE] Valid ${evalResult.signal} signal detected, but position already open on ${pair}. Skipping duplicate entry.`
          );
        } else if (openPositions.length >= maxPositions) {
          db.addLog(
            'INFO',
            `[PAPER TRADE] Valid ${evalResult.signal} signal skipped: Max open positions limit (${maxPositions}) reached.`
          );
        } else if (!isNewCandle) {
          // Already entered on this confirmed candle
        }
      } else {
        // Strategy evaluated to HOLD (waiting for breakout setup)
        if (openPositions.length === 0) {
          newStatus = 'WAITING_FOR_SETUP';
        }
      }

      // 5. Update bot state
      db.updateBotState({
        status: newStatus,
        last_eval_time: Date.now(),
        last_data_time: currentTicker.lastUpdated,
        last_reason:
          evalResult.reasons[0] ||
          `Active 5s strategy evaluation running on Delta Exchange ${pair} feed.`,
        error_message: null,
      });

    } finally {
      this.isEvaluating = false;
    }
  }

  /**
   * Opens a new virtual paper position based on risk management calculations
   */
  private async executePaperEntry(
    botState: any,
    evalResult: StrategyEvaluationResult,
    currentMarketPrice: number
  ) {
    const virtualBalance = botState.balance || 10000.0;
    const riskPct = botState.risk_per_trade || 2.0;
    const riskAmount = virtualBalance * (riskPct / 100);

    const entryPrice = currentMarketPrice > 0 ? currentMarketPrice : evalResult.entryPrice;
    const slDistance = Math.abs(entryPrice - evalResult.stopLoss);

    if (slDistance <= 0 || isNaN(slDistance)) {
      db.addLog('WARN', '[PAPER TRADE] Invalid stop loss distance, simulated order aborted.');
      return;
    }

    // Position size = Risk Amount / SL distance
    const rawQuantity = riskAmount / slDistance;
    // Round to reasonable decimal precision (4 decimals for crypto)
    const quantity = parseFloat(Math.max(0.001, rawQuantity).toFixed(4));
    const feePct = db.getSetting<number>('trading_fee_pct', 0.05) / 100;
    const openFee = entryPrice * quantity * feePct;

    const posId = `pos_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    db.addPosition({
      id: posId,
      pair: botState.pair,
      strategy_id: botState.strategy_id,
      direction: evalResult.signal,
      entry_price: entryPrice,
      current_price: entryPrice,
      quantity,
      stop_loss: evalResult.stopLoss,
      take_profit: evalResult.takeProfit,
      unrealized_pnl: -openFee, // Start with opening fee deduction
      fees_incurred: openFee,
      opened_at: Date.now(),
    });

    db.addLog(
      'TRADE',
      `[PAPER TRADE] Virtual Position Opened: ${evalResult.signal} ${quantity} ${botState.pair} @ $${entryPrice.toFixed(2)} [SL: $${evalResult.stopLoss.toFixed(2)}, TP: $${evalResult.takeProfit.toFixed(2)}, Risk: ${riskPct}% ($${riskAmount.toFixed(2)})]`,
      { riskAmount, quantity, openFee, stopLoss: evalResult.stopLoss, takeProfit: evalResult.takeProfit }
    );

    console.log(
      `[AUREVIAN BOT] PAPER TRADE: Opened ${evalResult.signal} on ${botState.pair} @ $${entryPrice.toFixed(2)}`
    );
  }

  /**
   * Monitors active open positions, updates live P&L, triggers virtual Stop Loss or Take Profit
   */
  public async tickPositionMonitor() {
    const openPositions = db.getOpenPositions();
    if (openPositions.length === 0) return;

    for (const pos of openPositions) {
      const ticker = marketData.getTicker(pos.pair);
      if (!ticker || ticker.price <= 0) continue;

      const currentPrice = ticker.price;
      const isLong = pos.direction === 'LONG';
      const rawPriceDiff = isLong ? currentPrice - pos.entry_price : pos.entry_price - currentPrice;
      const grossPnl = rawPriceDiff * pos.quantity;
      const unrealizedPnl = grossPnl - pos.fees_incurred;

      // Update unrealized PnL and current price
      db.updatePosition(pos.id, {
        current_price: currentPrice,
        unrealized_pnl: unrealizedPnl,
      });

      // Check Stop Loss and Take Profit triggers
      let exitReason: string | null = null;
      let exitPrice = currentPrice;

      if (isLong) {
        if (currentPrice <= pos.stop_loss) {
          exitReason = 'STOP_LOSS';
          exitPrice = pos.stop_loss;
        } else if (currentPrice >= pos.take_profit) {
          exitReason = 'TAKE_PROFIT';
          exitPrice = pos.take_profit;
        }
      } else {
        if (currentPrice >= pos.stop_loss) {
          exitReason = 'STOP_LOSS';
          exitPrice = pos.stop_loss;
        } else if (currentPrice <= pos.take_profit) {
          exitReason = 'TAKE_PROFIT';
          exitPrice = pos.take_profit;
        }
      }

      if (exitReason) {
        await this.closePosition(pos.id, exitReason, exitPrice);
      }
    }
  }

  /**
   * Closes a virtual position, updates balance and records historical trade
   */
  public async closePosition(posId: string, reason: string, forcedExitPrice?: number) {
    const pos = db.getPosition(posId);
    if (!pos) return;

    const ticker = marketData.getTicker(pos.pair);
    const exitPrice = forcedExitPrice || (ticker?.price || pos.current_price);
    const isLong = pos.direction === 'LONG';
    const rawDiff = isLong ? exitPrice - pos.entry_price : pos.entry_price - exitPrice;
    const grossPnl = rawDiff * pos.quantity;

    const feePct = db.getSetting<number>('trading_fee_pct', 0.05) / 100;
    const closeFee = exitPrice * pos.quantity * feePct;
    const totalFees = pos.fees_incurred + closeFee;
    const netPnl = grossPnl - totalFees;

    const strategyRecord = db.getStrategyById(pos.strategy_id);
    const strategyName = strategyRecord ? strategyRecord.name : 'AUREVIAN BOLLINGER BAND BREAKOUT';

    const tradeId = `trd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Record completed trade
    db.recordClosedTrade({
      id: tradeId,
      pair: pos.pair,
      strategy_name: strategyName,
      direction: pos.direction,
      entry_price: pos.entry_price,
      exit_price: exitPrice,
      quantity: pos.quantity,
      gross_pnl: grossPnl,
      net_pnl: netPnl,
      fees: totalFees,
      exit_reason: reason,
      opened_at: pos.opened_at,
      closed_at: Date.now(),
    });

    // Delete position from active open positions
    db.deletePosition(pos.id);

    // Update virtual balance in bot state and settings
    const botState = db.getBotState();
    const newBalance = Math.max(100, (botState.balance || 10000.0) + netPnl);
    db.updateBotState({ balance: newBalance });
    db.setSetting('virtual_balance', newBalance);

    db.addLog(
      'TRADE',
      `[PAPER TRADE] Virtual Position Closed (${reason}): ${pos.direction} ${pos.pair} @ $${exitPrice.toFixed(2)}. Net P&L: ${netPnl >= 0 ? '+' : ''}$${netPnl.toFixed(2)} (Fees: $${totalFees.toFixed(2)})`,
      { tradeId, netPnl, exitPrice, reason }
    );

    console.log(
      `[AUREVIAN BOT] Position Closed (${reason}) on ${pos.pair}. Net P&L: ${netPnl.toFixed(2)}`
    );

    // Update state to WAITING_FOR_SETUP or WORKING if not paused
    if (this.isRunning && !this.isPaused) {
      const remainingPositions = db.getOpenPositions();
      if (remainingPositions.length === 0) {
        db.updateBotState({
          status: 'WAITING_FOR_SETUP',
          last_reason: `Position closed on ${reason}. Awaiting next confirmed closed candle setup.`,
        });
      }
    }
  }

  public getStatus() {
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      botState: db.getBotState(),
      openPositions: db.getOpenPositions(),
      recentLogs: db.getRecentLogs(30),
    };
  }
}

export const botEngine = new BotEngine();
