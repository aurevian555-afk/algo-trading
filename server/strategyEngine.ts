import { Candle } from './marketData.js';
import {
  calculateEMA,
  calculateSMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateATR,
  analyzeSMC,
} from './indicators.js';

export interface StrategyCondition {
  id: string;
  indicator: 'EMA' | 'SMA' | 'RSI' | 'MACD' | 'BOLLINGER' | 'ATR' | 'VOLUME' | 'PRICE' | 'SMC_BOS' | 'SMC_CHOCH' | 'SMC_SWEEP';
  params?: Record<string, any>;
  operator: 'GREATER_THAN' | 'LESS_THAN' | 'CROSS_ABOVE' | 'CROSS_BELOW' | 'BETWEEN' | 'EQUALS';
  compareWith: 'VALUE' | 'INDICATOR' | 'PREVIOUS';
  compareTarget?: any;
  value?: number;
  minValue?: number;
  maxValue?: number;
  description: string;
}

export interface CustomStrategyConfig {
  name: string;
  trendTimeframe?: string;
  entryTimeframe: string;
  logicOperator: 'AND' | 'OR'; // applied across condition groups
  longConditions: StrategyCondition[];
  shortConditions: StrategyCondition[];
  risk: {
    riskPercentage: number;
    riskToReward: number;
    atrMultiplierSL?: number;
    fixedSlPct?: number;
    trailingStop?: boolean;
  };
}

export interface StrategyEvaluationResult {
  strategyName: string;
  timeframe: string;
  candleTime: number;
  evaluatedAt: number;
  signal: 'LONG' | 'SHORT' | 'HOLD';
  passedConditions: string[];
  failedConditions: string[];
  reasons: string[];
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  riskReward: number;
  atr: number;
  metrics: {
    trendPrice?: number;
    trendEma200?: number;
    trendStatus?: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    rsi?: number;
    currentVolume?: number;
    volumeSma20?: number;
    latestSmcEvent?: string;
    bbUpper?: number | null;
    bbMiddle?: number | null;
    bbLower?: number | null;
    bandWidth?: number | null;
    isSqueeze?: boolean;
  };
}

export class StrategyEngine {
  /**
   * Evaluate the built-in AUREVIAN SMC MOMENTUM STRATEGY
   * Uses closed candles only (candles[len - 2]) to guarantee zero repainting and zero lookahead bias.
   */
  public evaluateAurevianSMC(
    entryCandles: Candle[],
    trendCandles: Candle[],
    config?: any
  ): StrategyEvaluationResult {
    if (entryCandles.length < 50 || trendCandles.length < 50) {
      return {
        strategyName: 'AUREVIAN SMC MOMENTUM STRATEGY',
        timeframe: '15m',
        candleTime: Date.now() / 1000,
        evaluatedAt: Date.now(),
        signal: 'HOLD',
        passedConditions: [],
        failedConditions: ['Insufficient candle history for analysis (requires >= 50 candles)'],
        reasons: ['Awaiting sufficient historical data for trend & SMC calculations'],
        entryPrice: 0,
        stopLoss: 0,
        takeProfit: 0,
        riskReward: 2.0,
        atr: 0,
        metrics: {},
      };
    }

    // Work on confirmed closed candle: index = length - 2
    const targetIdx = entryCandles.length - 2;
    const closedCandle = entryCandles[targetIdx];
    const prevCandle = entryCandles[targetIdx - 1];

    // 1. Trend Confirmation on 1H: EMA 200
    const trendCloses = trendCandles.map(c => c.close);
    const trendEma200 = calculateEMA(trendCloses, 200);
    const lastTrendIdx = trendCandles.length - 2;
    const trendClose = trendCandles[lastTrendIdx].close;
    const trendEmaVal = trendEma200[lastTrendIdx] ?? trendCloses[lastTrendIdx];

    const isTrendBullish = trendClose > trendEmaVal;
    const isTrendBearish = trendClose < trendEmaVal;
    const trendStatus = isTrendBullish ? 'BULLISH' : isTrendBearish ? 'BEARISH' : 'NEUTRAL';

    // 2. Indicators on 15M entry timeframe
    const entryCloses = entryCandles.map(c => c.close);
    const entryVolumes = entryCandles.map(c => c.volume);

    const rsiValues = calculateRSI(entryCloses, 14);
    const volSma = calculateSMA(entryVolumes, 20);
    const atrValues = calculateATR(entryCandles, 14);
    const { smcSignals } = analyzeSMC(entryCandles.slice(0, targetIdx + 1), 5);

    const currentRsi = rsiValues[targetIdx] ?? 50;
    const prevRsi = rsiValues[targetIdx - 1] ?? 50;
    const currentVol = closedCandle.volume;
    const avgVol = volSma[targetIdx] ?? currentVol;
    const currentAtr = atrValues[targetIdx] ?? (closedCandle.high - closedCandle.low);

    // Look for recent SMC structure events within the last 8 closed candles
    const recentSmc = smcSignals.filter(s => s.index >= targetIdx - 8 && s.index <= targetIdx);
    const latestEvent = recentSmc.length > 0 ? recentSmc[recentSmc.length - 1] : null;

    const passedConditions: string[] = [];
    const failedConditions: string[] = [];
    const reasons: string[] = [];

    // Evaluate Bullish Setup
    let longPoints = 0;
    let shortPoints = 0;

    // Trend Filter
    if (isTrendBullish) {
      passedConditions.push(`1H Trend Bullish: Price (${trendClose.toFixed(2)}) > EMA 200 (${trendEmaVal.toFixed(2)})`);
      longPoints++;
    } else {
      failedConditions.push(`1H Trend is not Bullish (Trend: ${trendStatus})`);
    }

    if (isTrendBearish) {
      passedConditions.push(`1H Trend Bearish: Price (${trendClose.toFixed(2)}) < EMA 200 (${trendEmaVal.toFixed(2)})`);
      shortPoints++;
    } else {
      failedConditions.push(`1H Trend is not Bearish (Trend: ${trendStatus})`);
    }

    // Volume Confirmation
    if (currentVol >= avgVol * 0.95) {
      passedConditions.push(`Volume Expansion: Current vol (${currentVol.toFixed(2)}) >= 20-SMA (${avgVol.toFixed(2)})`);
      longPoints++;
      shortPoints++;
    } else {
      failedConditions.push(`Volume Below Average: Current vol (${currentVol.toFixed(2)}) < 20-SMA (${avgVol.toFixed(2)})`);
    }

    // RSI Momentum Confirmation
    if (currentRsi >= 44 && currentRsi <= 72 && currentRsi >= prevRsi) {
      passedConditions.push(`RSI 14 Bullish Momentum: Current RSI is ${currentRsi.toFixed(1)} rising from ${prevRsi.toFixed(1)}`);
      longPoints++;
    } else {
      failedConditions.push(`RSI 14 Long Condition unmet: ${currentRsi.toFixed(1)}`);
    }

    if (currentRsi <= 56 && currentRsi >= 28 && currentRsi <= prevRsi) {
      passedConditions.push(`RSI 14 Bearish Momentum: Current RSI is ${currentRsi.toFixed(1)} falling from ${prevRsi.toFixed(1)}`);
      shortPoints++;
    } else {
      failedConditions.push(`RSI 14 Short Condition unmet: ${currentRsi.toFixed(1)}`);
    }

    // SMC Structure Event: BOS / CHoCH / Liquidity Sweep
    const hasBullishSmc = recentSmc.some(s => s.type === 'BOS_BULL' || s.type === 'CHOCH_BULL' || s.type === 'SWEEP_RECLAIM_BULL');
    const hasBearishSmc = recentSmc.some(s => s.type === 'BOS_BEAR' || s.type === 'CHOCH_BEAR' || s.type === 'SWEEP_RECLAIM_BEAR');

    if (hasBullishSmc) {
      const bullEvent = recentSmc.filter(s => s.type === 'BOS_BULL' || s.type === 'CHOCH_BULL' || s.type === 'SWEEP_RECLAIM_BULL').pop()!;
      passedConditions.push(`Bullish SMC Structure: ${bullEvent.description}`);
      longPoints++;
    } else {
      failedConditions.push('No recent Bullish BOS, CHoCH, or Liquidity Sweep detected in last 8 candles');
    }

    if (hasBearishSmc) {
      const bearEvent = recentSmc.filter(s => s.type === 'BOS_BEAR' || s.type === 'CHOCH_BEAR' || s.type === 'SWEEP_RECLAIM_BEAR').pop()!;
      passedConditions.push(`Bearish SMC Structure: ${bearEvent.description}`);
      shortPoints++;
    } else {
      failedConditions.push('No recent Bearish BOS, CHoCH, or Liquidity Sweep detected in last 8 candles');
    }

    let signal: 'LONG' | 'SHORT' | 'HOLD' = 'HOLD';
    let entryPrice = closedCandle.close;
    let stopLoss = 0;
    let takeProfit = 0;
    const riskReward = 2.0;

    // Strict signal requirements: trend + volume + RSI + SMC
    if (isTrendBullish && longPoints >= 4) {
      signal = 'LONG';
      const slDistance = Math.max(currentAtr * 1.5, entryPrice * 0.005);
      stopLoss = entryPrice - slDistance;
      takeProfit = entryPrice + (slDistance * riskReward);
      reasons.push(
        'Bullish Trend confirmation on 1H EMA 200 align with 15M SMC Break of Structure/Sweep and volume expansion.'
      );
    } else if (isTrendBearish && shortPoints >= 4) {
      signal = 'SHORT';
      const slDistance = Math.max(currentAtr * 1.5, entryPrice * 0.005);
      stopLoss = entryPrice + slDistance;
      takeProfit = entryPrice - (slDistance * riskReward);
      reasons.push(
        'Bearish Trend confirmation on 1H EMA 200 align with 15M SMC Breakdown/Sweep and volume expansion.'
      );
    } else {
      signal = 'HOLD';
      reasons.push(
        `Conditions not fully satisfied for trade entry. Passed: ${longPoints} long points, ${shortPoints} short points (requires 4). Waiting for clear SMC confirmation.`
      );
    }

    return {
      strategyName: 'AUREVIAN SMC MOMENTUM STRATEGY',
      timeframe: '15m',
      candleTime: closedCandle.time,
      evaluatedAt: Date.now(),
      signal,
      passedConditions,
      failedConditions,
      reasons,
      entryPrice,
      stopLoss,
      takeProfit,
      riskReward,
      atr: currentAtr,
      metrics: {
        trendPrice: trendClose,
        trendEma200: trendEmaVal,
        trendStatus,
        rsi: currentRsi,
        currentVolume: currentVol,
        volumeSma20: avgVol,
        latestSmcEvent: latestEvent ? latestEvent.description : 'None detected in recent window',
      },
    };
  }

  /**
   * Evaluate user-defined Custom Strategy
   */
  public evaluateCustomStrategy(
    strategy: { id: string; name: string; config_json: string },
    candles: Candle[]
  ): StrategyEvaluationResult {
    let config: CustomStrategyConfig;
    try {
      config = JSON.parse(strategy.config_json);
    } catch {
      return {
        strategyName: strategy.name,
        timeframe: '15m',
        candleTime: Date.now() / 1000,
        evaluatedAt: Date.now(),
        signal: 'HOLD',
        passedConditions: [],
        failedConditions: ['Invalid strategy JSON config'],
        reasons: ['Failed to parse custom strategy rules'],
        entryPrice: 0,
        stopLoss: 0,
        takeProfit: 0,
        riskReward: 2.0,
        atr: 0,
        metrics: {},
      };
    }

    if (candles.length < 50) {
      return {
        strategyName: strategy.name,
        timeframe: '15m',
        candleTime: Date.now() / 1000,
        evaluatedAt: Date.now(),
        signal: 'HOLD',
        passedConditions: [],
        failedConditions: ['Insufficient candle history (< 50 candles)'],
        reasons: ['Need more candle data to calculate custom indicators'],
        entryPrice: 0,
        stopLoss: 0,
        takeProfit: 0,
        riskReward: 2.0,
        atr: 0,
        metrics: {},
      };
    }

    const targetIdx = candles.length - 2;
    const closedCandle = candles[targetIdx];
    const prevCandle = candles[targetIdx - 1];
    const closes = candles.map(c => c.close);
    const volumes = candles.map(c => c.volume);

    // Pre-calculate common indicators
    const ema20 = calculateEMA(closes, 20);
    const ema50 = calculateEMA(closes, 50);
    const ema200 = calculateEMA(closes, 200);
    const sma20 = calculateSMA(closes, 20);
    const rsi14 = calculateRSI(closes, 14);
    const macd = calculateMACD(closes);
    const bb = calculateBollingerBands(closes);
    const atr = calculateATR(candles, 14);
    const volSma20 = calculateSMA(volumes, 20);
    const { smcSignals } = analyzeSMC(candles.slice(0, targetIdx + 1), 5);

    const currentAtr = atr[targetIdx] ?? (closedCandle.high - closedCandle.low);

    const evaluateCondition = (cond: StrategyCondition): boolean => {
      let currentVal: number | null = null;
      let prevVal: number | null = null;

      switch (cond.indicator) {
        case 'EMA': {
          const period = cond.params?.period || 20;
          const series = period === 20 ? ema20 : period === 50 ? ema50 : period === 200 ? ema200 : calculateEMA(closes, period);
          currentVal = series[targetIdx];
          prevVal = series[targetIdx - 1];
          break;
        }
        case 'SMA': {
          const period = cond.params?.period || 20;
          const series = period === 20 ? sma20 : calculateSMA(closes, period);
          currentVal = series[targetIdx];
          prevVal = series[targetIdx - 1];
          break;
        }
        case 'RSI': {
          currentVal = rsi14[targetIdx];
          prevVal = rsi14[targetIdx - 1];
          break;
        }
        case 'MACD': {
          currentVal = macd.hist[targetIdx];
          prevVal = macd.hist[targetIdx - 1];
          break;
        }
        case 'BOLLINGER': {
          const band = cond.params?.band || 'lower';
          currentVal = band === 'upper' ? bb.upper[targetIdx] : band === 'lower' ? bb.lower[targetIdx] : bb.middle[targetIdx];
          prevVal = band === 'upper' ? bb.upper[targetIdx - 1] : band === 'lower' ? bb.lower[targetIdx - 1] : bb.middle[targetIdx - 1];
          break;
        }
        case 'ATR': {
          currentVal = atr[targetIdx];
          prevVal = atr[targetIdx - 1];
          break;
        }
        case 'VOLUME': {
          currentVal = closedCandle.volume;
          prevVal = prevCandle.volume;
          break;
        }
        case 'PRICE': {
          currentVal = closedCandle.close;
          prevVal = prevCandle.close;
          break;
        }
        case 'SMC_BOS':
        case 'SMC_CHOCH':
        case 'SMC_SWEEP': {
          const recent = smcSignals.filter(s => s.index >= targetIdx - 6 && s.index <= targetIdx);
          if (cond.indicator === 'SMC_BOS') return recent.some(s => s.type.startsWith('BOS'));
          if (cond.indicator === 'SMC_CHOCH') return recent.some(s => s.type.startsWith('CHOCH'));
          if (cond.indicator === 'SMC_SWEEP') return recent.some(s => s.type.startsWith('SWEEP'));
          return false;
        }
      }

      if (currentVal === null) return false;

      let targetVal = cond.value ?? 0;
      if (cond.compareWith === 'INDICATOR' && cond.compareTarget) {
        if (cond.compareTarget === 'PRICE') targetVal = closedCandle.close;
        else if (cond.compareTarget === 'SMA_20') targetVal = sma20[targetIdx] ?? 0;
        else if (cond.compareTarget === 'EMA_50') targetVal = ema50[targetIdx] ?? 0;
        else if (cond.compareTarget === 'EMA_200') targetVal = ema200[targetIdx] ?? 0;
        else if (cond.compareTarget === 'VOL_SMA_20') targetVal = volSma20[targetIdx] ?? 0;
      }

      switch (cond.operator) {
        case 'GREATER_THAN':
          return currentVal > targetVal;
        case 'LESS_THAN':
          return currentVal < targetVal;
        case 'CROSS_ABOVE':
          return prevVal !== null && prevVal <= targetVal && currentVal > targetVal;
        case 'CROSS_BELOW':
          return prevVal !== null && prevVal >= targetVal && currentVal < targetVal;
        case 'BETWEEN':
          return cond.minValue !== undefined && cond.maxValue !== undefined
            ? currentVal >= cond.minValue && currentVal <= cond.maxValue
            : true;
        case 'EQUALS':
          return Math.abs(currentVal - targetVal) < 0.0001;
        default:
          return false;
      }
    };

    const passedConditions: string[] = [];
    const failedConditions: string[] = [];

    // Evaluate Long
    let isLong = false;
    if (config.longConditions && config.longConditions.length > 0) {
      if (config.logicOperator === 'OR') {
        isLong = config.longConditions.some(c => {
          const res = evaluateCondition(c);
          if (res) passedConditions.push(`Long Condition passed: ${c.description}`);
          else failedConditions.push(`Long Condition failed: ${c.description}`);
          return res;
        });
      } else {
        isLong = config.longConditions.every(c => {
          const res = evaluateCondition(c);
          if (res) passedConditions.push(`Long Condition passed: ${c.description}`);
          else failedConditions.push(`Long Condition failed: ${c.description}`);
          return res;
        });
      }
    }

    // Evaluate Short
    let isShort = false;
    if (config.shortConditions && config.shortConditions.length > 0 && !isLong) {
      if (config.logicOperator === 'OR') {
        isShort = config.shortConditions.some(c => {
          const res = evaluateCondition(c);
          if (res) passedConditions.push(`Short Condition passed: ${c.description}`);
          else failedConditions.push(`Short Condition failed: ${c.description}`);
          return res;
        });
      } else {
        isShort = config.shortConditions.every(c => {
          const res = evaluateCondition(c);
          if (res) passedConditions.push(`Short Condition passed: ${c.description}`);
          else failedConditions.push(`Short Condition failed: ${c.description}`);
          return res;
        });
      }
    }

    const signal = isLong ? 'LONG' : isShort ? 'SHORT' : 'HOLD';
    const entryPrice = closedCandle.close;
    const riskReward = config.risk?.riskToReward || 2.0;
    const atrMult = config.risk?.atrMultiplierSL || 1.5;
    const slDistance = Math.max(currentAtr * atrMult, entryPrice * 0.005);

    let stopLoss = 0;
    let takeProfit = 0;

    if (signal === 'LONG') {
      stopLoss = entryPrice - slDistance;
      takeProfit = entryPrice + slDistance * riskReward;
    } else if (signal === 'SHORT') {
      stopLoss = entryPrice + slDistance;
      takeProfit = entryPrice - slDistance * riskReward;
    }

    return {
      strategyName: strategy.name,
      timeframe: config.entryTimeframe || '15m',
      candleTime: closedCandle.time,
      evaluatedAt: Date.now(),
      signal,
      passedConditions,
      failedConditions,
      reasons: signal === 'HOLD'
        ? ['Custom conditions not satisfied on latest closed candle.']
        : [`Custom strategy triggered ${signal} signal with valid risk-reward ratio ${riskReward}:1`],
      entryPrice,
      stopLoss,
      takeProfit,
      riskReward,
      atr: currentAtr,
      metrics: {
        rsi: rsi14[targetIdx] ?? undefined,
        currentVolume: closedCandle.volume,
        volumeSma20: volSma20[targetIdx] ?? undefined,
      },
    };
  }

  /**
   * Evaluate AUREVIAN BOLLINGER BAND BREAKOUT STRATEGY
   * Strict closed-candle evaluation (candles[len - 2]) preventing repainting and lookahead bias.
   */
  public evaluateBollingerBreakout(
    entryCandles: Candle[],
    trendCandles: Candle[],
    userConfig?: any
  ): StrategyEvaluationResult {
    const config = {
      name: 'AUREVIAN BOLLINGER BAND BREAKOUT',
      period: userConfig?.bollinger?.period || userConfig?.period || 20,
      stdDev: userConfig?.bollinger?.stdDev || userConfig?.stdDev || 2.0,
      basis: userConfig?.bollinger?.basis || userConfig?.basis || 'SMA',
      squeezeLookback: userConfig?.bollinger?.squeezeLookback || userConfig?.squeezeLookback || 20,
      squeezePercentile: userConfig?.bollinger?.squeezeThresholdPercentile || userConfig?.squeezePercentile || 20,
      trendFilterEnabled: userConfig?.trendFilter?.enabled ?? true,
      trendEmaPeriod: userConfig?.trendFilter?.period || 200,
      volumeFilterEnabled: userConfig?.volumeFilter?.enabled ?? true,
      volumePeriod: userConfig?.volumeFilter?.period || 20,
      atrPeriod: userConfig?.risk?.atrPeriod || 14,
      atrMultiplier: userConfig?.risk?.atrMultiplierSL || 1.5,
      riskToReward: userConfig?.risk?.riskToReward || 2.0,
      tradeDirection: userConfig?.tradeDirection || 'BOTH', // 'BOTH' | 'LONG_ONLY' | 'SHORT_ONLY'
    };

    if (entryCandles.length < Math.max(50, config.period + config.squeezeLookback) || trendCandles.length < 50) {
      return {
        strategyName: config.name,
        timeframe: '15m',
        candleTime: Date.now() / 1000,
        evaluatedAt: Date.now(),
        signal: 'HOLD',
        passedConditions: [],
        failedConditions: ['Insufficient candle history for Bollinger Bands & Trend analysis (requires >= 50 candles).'],
        reasons: ['Awaiting sufficient historical data for Bollinger Band calculations.'],
        entryPrice: 0,
        stopLoss: 0,
        takeProfit: 0,
        riskReward: config.riskToReward,
        atr: 0,
        metrics: {},
      };
    }

    // Work on confirmed closed candle: index = length - 2
    const targetIdx = entryCandles.length - 2;
    const closedCandle = entryCandles[targetIdx];

    const closes = entryCandles.map(c => c.close);
    const volumes = entryCandles.map(c => c.volume);

    // 1. Calculate Bollinger Bands (20, 2)
    const { upper, middle, lower, bandWidth } = calculateBollingerBands(
      closes,
      config.period,
      config.stdDev,
      config.basis as 'SMA' | 'EMA'
    );

    const currUpper = upper[targetIdx];
    const currMiddle = middle[targetIdx];
    const currLower = lower[targetIdx];
    const currBandWidth = bandWidth[targetIdx];

    // 2. Volatility Squeeze Detection
    // Squeeze is detected when BandWidth in recent lookback is in the lowest percentile or contracting
    let isSqueeze = false;
    let squeezeScore = 0;
    const lookbackStart = Math.max(0, targetIdx - config.squeezeLookback);
    const recentBandWidths: number[] = [];
    for (let k = lookbackStart; k <= targetIdx; k++) {
      if (bandWidth[k] !== null && bandWidth[k] !== undefined) {
        recentBandWidths.push(bandWidth[k]!);
      }
    }

    if (recentBandWidths.length > 5 && currBandWidth !== null) {
      const sorted = [...recentBandWidths].sort((a, b) => a - b);
      const thresholdIdx = Math.floor(sorted.length * (config.squeezePercentile / 100));
      const thresholdVal = sorted[Math.min(thresholdIdx, sorted.length - 1)];
      // Contracted if current or any of last 3 candles was <= threshold
      const recentThree = recentBandWidths.slice(-4, -1);
      const hadRecentContraction = recentThree.some(bw => bw <= thresholdVal);
      const isNarrowing = recentBandWidths.length >= 3 && (recentBandWidths[recentBandWidths.length - 2] < recentBandWidths[recentBandWidths.length - 3]);
      isSqueeze = currBandWidth <= thresholdVal || hadRecentContraction || isNarrowing;
      squeezeScore = currBandWidth;
    }

    // 3. 1H Macro Trend Filter (EMA 200)
    const trendCloses = trendCandles.map(c => c.close);
    const trendEmaSeries = calculateEMA(trendCloses, config.trendEmaPeriod);
    const trendTargetIdx = trendCandles.length - 1;
    const currentTrendPrice = trendCandles[trendTargetIdx]?.close || 0;
    const currentTrendEma = trendEmaSeries[trendTargetIdx] || 0;
    const isBullishTrend = currentTrendPrice > currentTrendEma;
    const isBearishTrend = currentTrendPrice < currentTrendEma;

    // 4. Volume Filter (Volume > 20-candle average)
    const volSmaSeries = calculateSMA(volumes, config.volumePeriod);
    const currentVolume = closedCandle.volume;
    const currentVolSma = volSmaSeries[targetIdx] || 0;
    const isVolumeSurge = !config.volumeFilterEnabled || currentVolume > currentVolSma;

    // 5. ATR 14 for Dynamic Stop Loss
    const atrSeries = calculateATR(entryCandles, config.atrPeriod);
    const currentAtr = atrSeries[targetIdx] || (closedCandle.high - closedCandle.low);

    // Evaluate Conditions
    const passedConditions: string[] = [];
    const failedConditions: string[] = [];

    // Condition 1: Squeeze Contraction
    if (isSqueeze) {
      passedConditions.push(`Volatility Squeeze: Bollinger BandWidth contracted to ${currBandWidth?.toFixed(2)}% (Lookback ${config.squeezeLookback})`);
    } else {
      failedConditions.push(`Volatility Squeeze: BandWidth (${currBandWidth?.toFixed(2)}%) did not meet contraction threshold`);
    }

    // Condition 2: Breakout Closes
    const closedAboveUpper = currUpper !== null && closedCandle.close > currUpper;
    const closedBelowLower = currLower !== null && closedCandle.close < currLower;

    if (closedAboveUpper) {
      passedConditions.push(`Upper Band Breakout: Closed candle ($${closedCandle.close.toFixed(2)}) closed above Upper Band ($${currUpper?.toFixed(2)})`);
    } else if (closedBelowLower) {
      passedConditions.push(`Lower Band Breakout: Closed candle ($${closedCandle.close.toFixed(2)}) closed below Lower Band ($${currLower?.toFixed(2)})`);
    } else {
      failedConditions.push(`Band Breakout: Closed price ($${closedCandle.close.toFixed(2)}) remains inside bands [$${currLower?.toFixed(2)} - $${currUpper?.toFixed(2)}]`);
    }

    // Condition 3: Trend Filter
    if (!config.trendFilterEnabled) {
      passedConditions.push('1H Trend Filter: Disabled in configuration');
    } else if (isBullishTrend) {
      passedConditions.push(`1H Macro Trend Bullish: Price ($${currentTrendPrice.toFixed(2)}) > 1H EMA ${config.trendEmaPeriod} ($${currentTrendEma.toFixed(2)})`);
    } else if (isBearishTrend) {
      passedConditions.push(`1H Macro Trend Bearish: Price ($${currentTrendPrice.toFixed(2)}) < 1H EMA ${config.trendEmaPeriod} ($${currentTrendEma.toFixed(2)})`);
    } else {
      failedConditions.push(`1H Macro Trend: Price ($${currentTrendPrice.toFixed(2)}) is neutral or equal to EMA ${config.trendEmaPeriod}`);
    }

    // Condition 4: Volume Confirmation
    if (isVolumeSurge) {
      passedConditions.push(`Volume Confirmation: Volume (${currentVolume.toLocaleString()}) > 20-SMA (${currentVolSma.toLocaleString()})`);
    } else {
      failedConditions.push(`Volume Confirmation: Volume (${currentVolume.toLocaleString()}) is below 20-SMA (${currentVolSma.toLocaleString()})`);
    }

    // Determine Final Signal
    let signal: 'LONG' | 'SHORT' | 'HOLD' = 'HOLD';
    const canLong = config.tradeDirection === 'BOTH' || config.tradeDirection === 'LONG_ONLY';
    const canShort = config.tradeDirection === 'BOTH' || config.tradeDirection === 'SHORT_ONLY';

    const longConditionsMet = isSqueeze && closedAboveUpper && (!config.trendFilterEnabled || isBullishTrend) && isVolumeSurge;
    const shortConditionsMet = isSqueeze && closedBelowLower && (!config.trendFilterEnabled || isBearishTrend) && isVolumeSurge;

    if (longConditionsMet && canLong) {
      signal = 'LONG';
    } else if (shortConditionsMet && canShort) {
      signal = 'SHORT';
    }

    // Trade Management & Sizing
    const entryPrice = closedCandle.close;
    const slDistance = Math.max(currentAtr * config.atrMultiplier, entryPrice * 0.004);

    let stopLoss = 0;
    let takeProfit = 0;

    if (signal === 'LONG') {
      stopLoss = entryPrice - slDistance;
      takeProfit = entryPrice + slDistance * config.riskToReward;
    } else if (signal === 'SHORT') {
      stopLoss = entryPrice + slDistance;
      takeProfit = entryPrice - slDistance * config.riskToReward;
    }

    const reasons: string[] = [];
    if (signal === 'LONG') {
      reasons.push(`AUREVIAN BOLLINGER BREAKOUT triggered LONG entry @ $${entryPrice.toFixed(2)} following volatility squeeze. Target: $${takeProfit.toFixed(2)}, Stop: $${stopLoss.toFixed(2)}.`);
    } else if (signal === 'SHORT') {
      reasons.push(`AUREVIAN BOLLINGER BREAKOUT triggered SHORT entry @ $${entryPrice.toFixed(2)} following volatility squeeze. Target: $${takeProfit.toFixed(2)}, Stop: $${stopLoss.toFixed(2)}.`);
    } else {
      reasons.push(failedConditions[0] || 'Awaiting volatility squeeze and confirmed breakout close.');
    }

    return {
      strategyName: config.name,
      timeframe: '15m',
      candleTime: closedCandle.time,
      evaluatedAt: Date.now(),
      signal,
      passedConditions,
      failedConditions,
      reasons,
      entryPrice,
      stopLoss,
      takeProfit,
      riskReward: config.riskToReward,
      atr: currentAtr,
      metrics: {
        trendPrice: currentTrendPrice,
        trendEma200: currentTrendEma,
        trendStatus: isBullishTrend ? 'BULLISH' : isBearishTrend ? 'BEARISH' : 'NEUTRAL',
        currentVolume,
        volumeSma20: currentVolSma,
        bbUpper: currUpper,
        bbMiddle: currMiddle,
        bbLower: currLower,
        bandWidth: currBandWidth,
        isSqueeze: isSqueeze,
      },
    };
  }
}

export const strategyEngine = new StrategyEngine();
