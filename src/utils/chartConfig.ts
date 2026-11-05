import { ChartCustomizationConfig } from '../types/trading';

export const THEME_PRESETS: Record<'aurevian_black' | 'tradingview_dark' | 'tradingview_light', ChartCustomizationConfig> = {
  aurevian_black: {
    themePreset: 'aurevian_black',
    candles: {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
      hollow: false,
      showBorders: true,
      showWicks: true,
      barSpacing: 8,
    },
    canvas: {
      backgroundColor: '#050505',
      plotBackgroundColor: '#0a0a0a',
      horzGridVisible: true,
      vertGridVisible: true,
      gridColor: '#1a1a1a',
      scaleTextColor: '#a0a0a0',
      priceScaleBg: '#080808',
      timeScaleBg: '#080808',
      crosshairColor: '#398bff',
      crosshairLabelBg: '#398bff',
      volumePanelBg: 'transparent',
    },
    volume: {
      visible: true,
      upColor: '#22c55e66',
      downColor: '#ef444466',
    },
    indicators: {
      ema20: { enabled: true, color: '#398bff', thickness: 2, period: 20 },
      ema50: { enabled: true, color: '#f59e0b', thickness: 2, period: 50 },
      ema100: { enabled: false, color: '#9065e8', thickness: 1, period: 100 },
      ema200: { enabled: false, color: '#ec4899', thickness: 2, period: 200 },
      sma: { enabled: false, color: '#06b6d4', thickness: 2, period: 20 },
      rsi: { enabled: false, color: '#a855f7', thickness: 2, period: 14, upperBand: 70, lowerBand: 30 },
      macd: { enabled: false, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, macdColor: '#398bff', signalColor: '#f97316', histUpColor: '#22c55e', histDownColor: '#ef4444' },
      bollingerBands: { enabled: false, period: 20, stdDev: 2, upperColor: '#38bdf8', middleColor: '#38bdf888', lowerColor: '#38bdf8' },
      atr: { enabled: false, period: 14, color: '#eab308', thickness: 2 },
    },
  },

  tradingview_dark: {
    themePreset: 'tradingview_dark',
    candles: {
      upColor: '#089981',
      downColor: '#f23645',
      borderUpColor: '#089981',
      borderDownColor: '#f23645',
      wickUpColor: '#089981',
      wickDownColor: '#f23645',
      hollow: false,
      showBorders: true,
      showWicks: true,
      barSpacing: 8,
    },
    canvas: {
      backgroundColor: '#131722',
      plotBackgroundColor: '#131722',
      horzGridVisible: true,
      vertGridVisible: true,
      gridColor: '#242731',
      scaleTextColor: '#d1d4dc',
      priceScaleBg: '#131722',
      timeScaleBg: '#131722',
      crosshairColor: '#758696',
      crosshairLabelBg: '#4c525e',
      volumePanelBg: 'transparent',
    },
    volume: {
      visible: true,
      upColor: '#08998180',
      downColor: '#f2364580',
    },
    indicators: {
      ema20: { enabled: true, color: '#2962ff', thickness: 2, period: 20 },
      ema50: { enabled: true, color: '#ff9800', thickness: 2, period: 50 },
      ema100: { enabled: false, color: '#ab47bc', thickness: 1, period: 100 },
      ema200: { enabled: false, color: '#e91e63', thickness: 2, period: 200 },
      sma: { enabled: false, color: '#00bcd4', thickness: 2, period: 20 },
      rsi: { enabled: false, color: '#9c27b0', thickness: 2, period: 14, upperBand: 70, lowerBand: 30 },
      macd: { enabled: false, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, macdColor: '#2962ff', signalColor: '#ff6d00', histUpColor: '#089981', histDownColor: '#f23645' },
      bollingerBands: { enabled: false, period: 20, stdDev: 2, upperColor: '#2196f3', middleColor: '#2196f380', lowerColor: '#2196f3' },
      atr: { enabled: false, period: 14, color: '#ffb300', thickness: 2 },
    },
  },

  tradingview_light: {
    themePreset: 'tradingview_light',
    candles: {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderUpColor: '#26a69a',
      borderDownColor: '#ef5350',
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
      hollow: false,
      showBorders: true,
      showWicks: true,
      barSpacing: 8,
    },
    canvas: {
      backgroundColor: '#ffffff',
      plotBackgroundColor: '#ffffff',
      horzGridVisible: true,
      vertGridVisible: true,
      gridColor: '#f0f3fa',
      scaleTextColor: '#131722',
      priceScaleBg: '#ffffff',
      timeScaleBg: '#ffffff',
      crosshairColor: '#9598a1',
      crosshairLabelBg: '#131722',
      volumePanelBg: 'transparent',
    },
    volume: {
      visible: true,
      upColor: '#26a69a80',
      downColor: '#ef535080',
    },
    indicators: {
      ema20: { enabled: true, color: '#2962ff', thickness: 2, period: 20 },
      ema50: { enabled: true, color: '#ff6d00', thickness: 2, period: 50 },
      ema100: { enabled: false, color: '#7b1fa2', thickness: 1, period: 100 },
      ema200: { enabled: false, color: '#c2185b', thickness: 2, period: 200 },
      sma: { enabled: false, color: '#0097a7', thickness: 2, period: 20 },
      rsi: { enabled: false, color: '#7b1fa2', thickness: 2, period: 14, upperBand: 70, lowerBand: 30 },
      macd: { enabled: false, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, macdColor: '#2962ff', signalColor: '#ff6d00', histUpColor: '#26a69a', histDownColor: '#ef5350' },
      bollingerBands: { enabled: false, period: 20, stdDev: 2, upperColor: '#1976d2', middleColor: '#1976d280', lowerColor: '#1976d2' },
      atr: { enabled: false, period: 14, color: '#f57f17', thickness: 2 },
    },
  },
};

export const getStoredChartConfig = (pair: string, isDarkMode = true): ChartCustomizationConfig => {
  const key = `aurevian_chart_config_${pair}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed;
    }
  } catch (err) {
    console.warn('Failed to parse stored chart config:', err);
  }

  // Fallback to default preset based on dark/light
  return isDarkMode ? THEME_PRESETS.aurevian_black : THEME_PRESETS.tradingview_light;
};

export const saveChartConfig = (pair: string, config: ChartCustomizationConfig): void => {
  const key = `aurevian_chart_config_${pair}`;
  try {
    localStorage.setItem(key, JSON.stringify(config));
  } catch (err) {
    console.warn('Failed to save chart config to localStorage:', err);
  }
};

export const resetChartConfigToPreset = (
  pair: string,
  preset: 'aurevian_black' | 'tradingview_dark' | 'tradingview_light'
): ChartCustomizationConfig => {
  const base = THEME_PRESETS[preset];
  saveChartConfig(pair, base);
  return base;
};

// Indicator Calculation Algorithms for Lightweight Charts LineSeries
export interface CandleData {
  time: any;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export const computeEMA = (data: CandleData[], period: number) => {
  if (data.length < period) return [];
  const k = 2 / (period + 1);
  const result: Array<{ time: any; value: number }> = [];

  // Initial SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i].close;
  }
  let prevEma = sum / period;
  result.push({ time: data[period - 1].time, value: parseFloat(prevEma.toFixed(2)) });

  for (let i = period; i < data.length; i++) {
    const current = (data[i].close - prevEma) * k + prevEma;
    result.push({ time: data[i].time, value: parseFloat(current.toFixed(2)) });
    prevEma = current;
  }

  return result;
};

export const computeSMA = (data: CandleData[], period: number) => {
  if (data.length < period) return [];
  const result: Array<{ time: any; value: number }> = [];

  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close;
    }
    result.push({ time: data[i].time, value: parseFloat((sum / period).toFixed(2)) });
  }

  return result;
};

export const computeBollingerBands = (data: CandleData[], period = 20, stdDevMult = 2) => {
  if (data.length < period) return { upper: [], middle: [], lower: [] };
  const upper: Array<{ time: any; value: number }> = [];
  const middle: Array<{ time: any; value: number }> = [];
  const lower: Array<{ time: any; value: number }> = [];

  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close;
    }
    const sma = sum / period;

    let varianceSum = 0;
    for (let j = 0; j < period; j++) {
      varianceSum += Math.pow(data[i - j].close - sma, 2);
    }
    const stdDev = Math.sqrt(varianceSum / period);

    middle.push({ time: data[i].time, value: parseFloat(sma.toFixed(2)) });
    upper.push({ time: data[i].time, value: parseFloat((sma + stdDev * stdDevMult).toFixed(2)) });
    lower.push({ time: data[i].time, value: parseFloat((sma - stdDev * stdDevMult).toFixed(2)) });
  }

  return { upper, middle, lower };
};
