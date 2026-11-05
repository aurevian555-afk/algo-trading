import { Candle, marketData } from './marketData.js';
import { db } from './db.js';
import { strategyEngine } from './strategyEngine.js';

export interface BacktestParams {
  pair: string;
  strategyId: string;
  timeframe: string;
  startDate?: string;
  endDate?: string;
  initialCapital: number;
  riskPercentage: number;
  feePercentage: number;
  slippagePercentage: number;
}

export interface BacktestTrade {
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
  exitReason: 'STOP_LOSS' | 'TAKE_PROFIT' | 'END_OF_DATA';
  equityAfter: number;
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
  trades: BacktestTrade[];
}

export class BacktestEngine {
  public async runBacktest(params: BacktestParams): Promise<BacktestResult> {
    const {
      pair,
      strategyId,
      timeframe,
      initialCapital = 10000,
      riskPercentage = 2.0,
      feePercentage = 0.05,
      slippagePercentage = 0.02,
    } = params;

    // Load historical candles
    let candles: Candle[];
    if (params.startDate && params.endDate) {
      const startMs = new Date(params.startDate).getTime();
      const endMs = new Date(params.endDate).getTime();
      candles = await marketData.getHistoricalRange(pair, timeframe, startMs, endMs);
    } else {
      // Default to 500 historical candles
      candles = await marketData.getKlines(pair, timeframe, 500);
    }

    if (!candles || candles.length < 60) {
      throw new Error(`Insufficient historical candle data for ${pair} on ${timeframe} (received ${candles?.length || 0} candles, minimum 60 required).`);
    }

    // Also fetch 1H candles for trend filter if built-in strategy
    const trendCandles = await marketData.getKlines(pair, '1H', 500);

    const strategyRecord = db.getStrategyById(strategyId);
    const isCustom = strategyRecord && strategyRecord.is_builtin === 0;

    let equity = initialCapital;
    let peakEquity = initialCapital;
    let maxDrawdown = 0;
    let maxDrawdownPct = 0;

    const equityCurve: Array<{ time: number; equity: number }> = [
      { time: candles[0].time, equity: initialCapital },
    ];
    const trades: BacktestTrade[] = [];

    let currentPosition: {
      direction: 'LONG' | 'SHORT';
      entryTime: number;
      entryPrice: number;
      quantity: number;
      stopLoss: number;
      takeProfit: number;
      openFee: number;
    } | null = null;

    // Simulate chronologically from index 50 onwards
    for (let i = 50; i < candles.length; i++) {
      const candle = candles[i];
      const slice = candles.slice(0, i + 1);

      // Check exit on existing position
      if (currentPosition) {
        let exited = false;
        let exitPrice = 0;
        let exitReason: 'STOP_LOSS' | 'TAKE_PROFIT' | 'END_OF_DATA' = 'END_OF_DATA';

        const slippageMultiplier = slippagePercentage / 100;
        const feeMultiplier = feePercentage / 100;

        if (currentPosition.direction === 'LONG') {
          if (candle.low <= currentPosition.stopLoss) {
            exited = true;
            exitPrice = currentPosition.stopLoss * (1 - slippageMultiplier);
            exitReason = 'STOP_LOSS';
          } else if (candle.high >= currentPosition.takeProfit) {
            exited = true;
            exitPrice = currentPosition.takeProfit * (1 - slippageMultiplier);
            exitReason = 'TAKE_PROFIT';
          }
        } else {
          // SHORT
          if (candle.high >= currentPosition.stopLoss) {
            exited = true;
            exitPrice = currentPosition.stopLoss * (1 + slippageMultiplier);
            exitReason = 'STOP_LOSS';
          } else if (candle.low <= currentPosition.takeProfit) {
            exited = true;
            exitPrice = currentPosition.takeProfit * (1 - slippageMultiplier);
            exitReason = 'TAKE_PROFIT';
          }
        }

        if (exited) {
          const isLong = currentPosition.direction === 'LONG';
          const grossPnl = isLong
            ? (exitPrice - currentPosition.entryPrice) * currentPosition.quantity
            : (currentPosition.entryPrice - exitPrice) * currentPosition.quantity;

          const closeFee = exitPrice * currentPosition.quantity * feeMultiplier;
          const totalFees = currentPosition.openFee + closeFee;
          const netPnl = grossPnl - totalFees;

          equity += netPnl;
          peakEquity = Math.max(peakEquity, equity);
          const dd = peakEquity - equity;
          const ddPct = (dd / peakEquity) * 100;
          if (dd > maxDrawdown) maxDrawdown = dd;
          if (ddPct > maxDrawdownPct) maxDrawdownPct = ddPct;

          trades.push({
            id: `bt_${trades.length + 1}`,
            direction: currentPosition.direction,
            entryTime: currentPosition.entryTime,
            exitTime: candle.time,
            entryPrice: currentPosition.entryPrice,
            exitPrice,
            quantity: currentPosition.quantity,
            grossPnl,
            netPnl,
            fees: totalFees,
            exitReason,
            equityAfter: equity,
          });

          equityCurve.push({ time: candle.time, equity });
          currentPosition = null;
          continue; // evaluate next candle
        }
      }

      // Check entry on closed candle (slice ends at i)
      if (!currentPosition) {
        let evalResult;
        if (isCustom) {
          evalResult = strategyEngine.evaluateCustomStrategy(strategyRecord, slice);
        } else if (strategyId === 'aurevian-bollinger-breakout') {
          const subTrend = trendCandles.filter(tc => tc.time <= candle.time);
          const cfg = strategyRecord?.config_json ? JSON.parse(strategyRecord.config_json) : undefined;
          evalResult = strategyEngine.evaluateBollingerBreakout(slice, subTrend.length >= 50 ? subTrend : trendCandles, cfg);
        } else {
          // Filter 1H trend candles up to this candle's time
          const subTrend = trendCandles.filter(tc => tc.time <= candle.time);
          evalResult = strategyEngine.evaluateAurevianSMC(slice, subTrend.length >= 50 ? subTrend : trendCandles);
        }

        if (evalResult.signal === 'LONG' || evalResult.signal === 'SHORT') {
          const slippageMultiplier = slippagePercentage / 100;
          const feeMultiplier = feePercentage / 100;

          // Apply slippage to entry
          const rawEntry = evalResult.entryPrice;
          const entryPrice = evalResult.signal === 'LONG'
            ? rawEntry * (1 + slippageMultiplier)
            : rawEntry * (1 - slippageMultiplier);

          const slDistance = Math.abs(entryPrice - evalResult.stopLoss);
          if (slDistance > 0) {
            const riskAmount = equity * (riskPercentage / 100);
            const quantity = parseFloat((riskAmount / slDistance).toFixed(4));
            const openFee = entryPrice * quantity * feeMultiplier;

            currentPosition = {
              direction: evalResult.signal,
              entryTime: candle.time,
              entryPrice,
              quantity,
              stopLoss: evalResult.stopLoss,
              takeProfit: evalResult.takeProfit,
              openFee,
            };
          }
        }
      }
    }

    // Close remaining position at last candle close if open
    if (currentPosition) {
      const lastCandle = candles[candles.length - 1];
      const isLong = currentPosition.direction === 'LONG';
      const exitPrice = lastCandle.close;
      const grossPnl = isLong
        ? (exitPrice - currentPosition.entryPrice) * currentPosition.quantity
        : (currentPosition.entryPrice - exitPrice) * currentPosition.quantity;
      const closeFee = exitPrice * currentPosition.quantity * (feePercentage / 100);
      const totalFees = currentPosition.openFee + closeFee;
      const netPnl = grossPnl - totalFees;
      equity += netPnl;

      trades.push({
        id: `bt_${trades.length + 1}`,
        direction: currentPosition.direction,
        entryTime: currentPosition.entryTime,
        exitTime: lastCandle.time,
        entryPrice: currentPosition.entryPrice,
        exitPrice,
        quantity: currentPosition.quantity,
        grossPnl,
        netPnl,
        fees: totalFees,
        exitReason: 'END_OF_DATA',
        equityAfter: equity,
      });

      equityCurve.push({ time: lastCandle.time, equity });
    }

    // Calculate metrics
    const totalTrades = trades.length;
    const winningTrades = trades.filter(t => t.netPnl > 0);
    const losingTrades = trades.filter(t => t.netPnl <= 0);

    const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;
    const totalWinPnl = winningTrades.reduce((sum, t) => sum + t.netPnl, 0);
    const totalLossPnl = Math.abs(losingTrades.reduce((sum, t) => sum + t.netPnl, 0));

    const profitFactor = totalLossPnl > 0 ? totalWinPnl / totalLossPnl : totalWinPnl > 0 ? 99.0 : 0;
    const avgWin = winningTrades.length > 0 ? totalWinPnl / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? totalLossPnl / losingTrades.length : 0;
    const avgRiskReward = avgLoss > 0 ? avgWin / avgLoss : 2.0;

    const netProfit = equity - initialCapital;
    const netProfitPct = (netProfit / initialCapital) * 100;

    return {
      initialCapital,
      finalCapital: equity,
      netProfit,
      netProfitPct,
      totalTrades,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate,
      profitFactor,
      maxDrawdown,
      maxDrawdownPct,
      avgWin,
      avgLoss,
      avgRiskReward,
      equityCurve,
      trades,
    };
  }
}

export const backtestEngine = new BacktestEngine();
