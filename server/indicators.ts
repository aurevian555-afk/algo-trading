import { Candle } from './marketData.js';

export interface IndicatorResults {
  ema20?: (number | null)[];
  ema50?: (number | null)[];
  ema200?: (number | null)[];
  sma20?: (number | null)[];
  rsi14?: (number | null)[];
  macd?: {
    macd: (number | null)[];
    signal: (number | null)[];
    hist: (number | null)[];
  };
  bb?: {
    upper: (number | null)[];
    middle: (number | null)[];
    lower: (number | null)[];
  };
  atr14?: (number | null)[];
  volSma20?: (number | null)[];
  swingPoints?: Array<{ index: number; time: number; type: 'HIGH' | 'LOW'; price: number }>;
  smcSignals?: Array<{
    index: number;
    time: number;
    type: 'BOS_BULL' | 'BOS_BEAR' | 'CHOCH_BULL' | 'CHOCH_BEAR' | 'SWEEP_RECLAIM_BULL' | 'SWEEP_RECLAIM_BEAR';
    price: number;
    description: string;
  }>;
}

// EMA Calculation
export function calculateEMA(values: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(values.length).fill(null);
  if (values.length < period) return result;

  // Initial SMA for first EMA point
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += values[i];
  }
  let prevEma = sum / period;
  result[period - 1] = prevEma;

  const multiplier = 2 / (period + 1);
  for (let i = period; i < values.length; i++) {
    const currentVal = values[i];
    const currentEma = (currentVal - prevEma) * multiplier + prevEma;
    result[i] = currentEma;
    prevEma = currentEma;
  }
  return result;
}

// SMA Calculation
export function calculateSMA(values: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(values.length).fill(null);
  if (values.length < period) return result;

  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += values[i];
  }
  result[period - 1] = sum / period;

  for (let i = period; i < values.length; i++) {
    sum += values[i] - values[i - period];
    result[i] = sum / period;
  }
  return result;
}

// RSI Calculation (Wilder's Smoothing)
export function calculateRSI(closes: number[], period = 14): (number | null)[] {
  const result: (number | null)[] = new Array(closes.length).fill(null);
  if (closes.length <= period) return result;

  let gainSum = 0;
  let lossSum = 0;

  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) gainSum += change;
    else lossSum += Math.abs(change);
  }

  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;

  result[period] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));

  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    if (avgLoss === 0) {
      result[i] = 100;
    } else {
      const rs = avgGain / avgLoss;
      result[i] = 100 - (100 / (1 + rs));
    }
  }
  return result;
}

// MACD (12, 26, 9)
export function calculateMACD(closes: number[], fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  const fastEma = calculateEMA(closes, fastPeriod);
  const slowEma = calculateEMA(closes, slowPeriod);

  const macdLine: (number | null)[] = new Array(closes.length).fill(null);
  const validMacdValues: number[] = [];
  const validIndices: number[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (fastEma[i] !== null && slowEma[i] !== null) {
      const val = fastEma[i]! - slowEma[i]!;
      macdLine[i] = val;
      validMacdValues.push(val);
      validIndices.push(i);
    }
  }

  const signalLine: (number | null)[] = new Array(closes.length).fill(null);
  const hist: (number | null)[] = new Array(closes.length).fill(null);

  if (validMacdValues.length >= signalPeriod) {
    const rawSignal = calculateEMA(validMacdValues, signalPeriod);
    for (let k = 0; k < rawSignal.length; k++) {
      const originalIdx = validIndices[k];
      signalLine[originalIdx] = rawSignal[k];
      if (macdLine[originalIdx] !== null && rawSignal[k] !== null) {
        hist[originalIdx] = macdLine[originalIdx]! - rawSignal[k]!;
      }
    }
  }

  return { macd: macdLine, signal: signalLine, hist };
}

// Bollinger Bands (20, 2) with SMA or EMA basis
export function calculateBollingerBands(closes: number[], period = 20, multiplier = 2, basisType: 'SMA' | 'EMA' = 'SMA') {
  const midSeries = basisType === 'EMA' ? calculateEMA(closes, period) : calculateSMA(closes, period);
  const upper: (number | null)[] = new Array(closes.length).fill(null);
  const lower: (number | null)[] = new Array(closes.length).fill(null);
  const bandWidth: (number | null)[] = new Array(closes.length).fill(null);

  for (let i = period - 1; i < closes.length; i++) {
    const mid = midSeries[i];
    if (mid === null || mid === 0) continue;

    let sumSquares = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sumSquares += Math.pow(closes[j] - mid, 2);
    }
    const stdDev = Math.sqrt(sumSquares / period);
    const u = mid + multiplier * stdDev;
    const l = mid - multiplier * stdDev;
    upper[i] = u;
    lower[i] = l;
    bandWidth[i] = ((u - l) / mid) * 100; // BandWidth %
  }

  return { upper, middle: midSeries, lower, bandWidth };
}

// Average True Range (ATR 14)
export function calculateATR(candles: Candle[], period = 14): (number | null)[] {
  const result: (number | null)[] = new Array(candles.length).fill(null);
  if (candles.length <= period) return result;

  const tr: number[] = [candles[0].high - candles[0].low];
  for (let i = 1; i < candles.length; i++) {
    const current = candles[i];
    const prev = candles[i - 1];
    const highLow = current.high - current.low;
    const highPrevClose = Math.abs(current.high - prev.close);
    const lowPrevClose = Math.abs(current.low - prev.close);
    tr.push(Math.max(highLow, highPrevClose, lowPrevClose));
  }

  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += tr[i];
  }
  let prevAtr = sum / period;
  result[period - 1] = prevAtr;

  for (let i = period; i < candles.length; i++) {
    prevAtr = (prevAtr * (period - 1) + tr[i]) / period;
    result[i] = prevAtr;
  }
  return result;
}

// Smart Money Concepts: Swing Points, BOS, CHoCH, Liquidity Sweep
export function analyzeSMC(candles: Candle[], swingPeriod = 5) {
  const swingPoints: Array<{ index: number; time: number; type: 'HIGH' | 'LOW'; price: number }> = [];
  const smcSignals: Array<{
    index: number;
    time: number;
    type: 'BOS_BULL' | 'BOS_BEAR' | 'CHOCH_BULL' | 'CHOCH_BEAR' | 'SWEEP_RECLAIM_BULL' | 'SWEEP_RECLAIM_BEAR';
    price: number;
    description: string;
  }> = [];

  // Swing High: candle high > left and right N candles
  // Swing Low: candle low < left and right N candles
  for (let i = swingPeriod; i < candles.length - swingPeriod; i++) {
    const target = candles[i];
    let isHigh = true;
    let isLow = true;

    for (let j = 1; j <= swingPeriod; j++) {
      if (candles[i - j].high >= target.high || candles[i + j].high > target.high) isHigh = false;
      if (candles[i - j].low <= target.low || candles[i + j].low < target.low) isLow = false;
    }

    if (isHigh) {
      swingPoints.push({ index: i, time: target.time, type: 'HIGH', price: target.high });
    }
    if (isLow) {
      swingPoints.push({ index: i, time: target.time, type: 'LOW', price: target.low });
    }
  }

  // Detect BOS, CHoCH, Liquidity Sweep
  let lastSwingHigh: { index: number; price: number } | null = null;
  let lastSwingLow: { index: number; price: number } | null = null;
  let prevailingTrend: 'BULLISH' | 'BEARISH' | 'RANGING' = 'RANGING';

  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];

    // Check newly confirmed swing points up to i
    for (const sp of swingPoints) {
      if (sp.index + swingPeriod === i) {
        if (sp.type === 'HIGH') lastSwingHigh = { index: sp.index, price: sp.price };
        if (sp.type === 'LOW') lastSwingLow = { index: sp.index, price: sp.price };
      }
    }

    if (lastSwingHigh) {
      // Bullish BOS: candle body closes above recent swing high
      if (candle.close > lastSwingHigh.price && prevailingTrend === 'BULLISH') {
        smcSignals.push({
          index: i,
          time: candle.time,
          type: 'BOS_BULL',
          price: candle.close,
          description: `Bullish Break of Structure: Closed above swing high at ${lastSwingHigh.price.toFixed(2)}`,
        });
      } else if (candle.close > lastSwingHigh.price && prevailingTrend === 'BEARISH') {
        // Bullish CHoCH: Change of character from bearish to bullish
        prevailingTrend = 'BULLISH';
        smcSignals.push({
          index: i,
          time: candle.time,
          type: 'CHOCH_BULL',
          price: candle.close,
          description: `Bullish Change of Character: Reversal break above swing high at ${lastSwingHigh.price.toFixed(2)}`,
        });
      }

      // Bearish Liquidity Sweep & Reclaim: high pierced swing high but closed below
      if (candle.high > lastSwingHigh.price && candle.close < lastSwingHigh.price) {
        smcSignals.push({
          index: i,
          time: candle.time,
          type: 'SWEEP_RECLAIM_BEAR',
          price: candle.high,
          description: `Bearish Liquidity Sweep: Wick swept highs at ${lastSwingHigh.price.toFixed(2)} and rejected`,
        });
      }
    }

    if (lastSwingLow) {
      // Bearish BOS: candle body closes below recent swing low
      if (candle.close < lastSwingLow.price && prevailingTrend === 'BEARISH') {
        smcSignals.push({
          index: i,
          time: candle.time,
          type: 'BOS_BEAR',
          price: candle.close,
          description: `Bearish Break of Structure: Closed below swing low at ${lastSwingLow.price.toFixed(2)}`,
        });
      } else if (candle.close < lastSwingLow.price && prevailingTrend === 'BULLISH') {
        // Bearish CHoCH: Change of character from bullish to bearish
        prevailingTrend = 'BEARISH';
        smcSignals.push({
          index: i,
          time: candle.time,
          type: 'CHOCH_BEAR',
          price: candle.close,
          description: `Bearish Change of Character: Reversal break below swing low at ${lastSwingLow.price.toFixed(2)}`,
        });
      }

      // Bullish Liquidity Sweep & Reclaim: low pierced swing low but closed above
      if (candle.low < lastSwingLow.price && candle.close > lastSwingLow.price) {
        smcSignals.push({
          index: i,
          time: candle.time,
          type: 'SWEEP_RECLAIM_BULL',
          price: candle.low,
          description: `Bullish Liquidity Sweep: Wick swept lows at ${lastSwingLow.price.toFixed(2)} and reclaimed`,
        });
      }
    }
  }

  return { swingPoints, smcSignals };
}
