import React, { useEffect, useRef, useState } from 'react';
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  ColorType,
  CrosshairMode,
  IChartApi,
  ISeriesApi,
} from 'lightweight-charts';
import { ChartCustomizationConfig } from '../types/trading';
import { CandleData, computeEMA, computeSMA, computeBollingerBands } from '../utils/chartConfig';
import { api } from '../services/api';

interface Props {
  pair: string;
  timeframe: string;
  config: ChartCustomizationConfig;
  height?: number | string;
  isFullScreen?: boolean;
}

export const CustomChartCanvas: React.FC<Props> = ({
  pair,
  timeframe,
  config,
  height = '100%',
  isFullScreen = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  // Indicator series refs
  const ema20Ref = useRef<ISeriesApi<'Line'> | null>(null);
  const ema50Ref = useRef<ISeriesApi<'Line'> | null>(null);
  const ema100Ref = useRef<ISeriesApi<'Line'> | null>(null);
  const ema200Ref = useRef<ISeriesApi<'Line'> | null>(null);
  const smaRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbUpperRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbMiddleRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbLowerRef = useRef<ISeriesApi<'Line'> | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastCandles, setLastCandles] = useState<CandleData[]>([]);

  // 1. Initialize Chart
  useEffect(() => {
    if (!containerRef.current) return;

    // Clean up any existing chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const container = containerRef.current;
    const chart = createChart(container, {
      width: container.clientWidth || 800,
      height: container.clientHeight || 500,
      layout: {
        background: { type: ColorType.Solid, color: config.canvas.backgroundColor },
        textColor: config.canvas.scaleTextColor,
        fontFamily: 'JetBrains Mono, monospace, sans-serif',
      },
      grid: {
        vertLines: {
          visible: config.canvas.vertGridVisible,
          color: config.canvas.gridColor,
        },
        horzLines: {
          visible: config.canvas.horzGridVisible,
          color: config.canvas.gridColor,
        },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: config.canvas.crosshairColor,
          width: 1,
          style: 3,
        },
        horzLine: {
          color: config.canvas.crosshairColor,
          width: 1,
          style: 3,
        },
      },
      rightPriceScale: {
        borderColor: config.canvas.gridColor,
        textColor: config.canvas.scaleTextColor,
      },
      timeScale: {
        borderColor: config.canvas.gridColor,
        timeVisible: true,
        secondsVisible: false,
        barSpacing: config.candles.barSpacing || 8,
      },
    });

    // Add Volume Series at bottom
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: '', // overlay
      visible: config.volume.visible,
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    // Add Candlestick Series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: config.candles.hollow ? 'transparent' : config.candles.upColor,
      downColor: config.candles.downColor,
      borderVisible: config.candles.showBorders,
      borderUpColor: config.candles.borderUpColor,
      borderDownColor: config.candles.borderDownColor,
      wickVisible: config.candles.showWicks,
      wickUpColor: config.candles.wickUpColor,
      wickDownColor: config.candles.wickDownColor,
    });

    // Add Indicator Series
    const ema20 = chart.addSeries(LineSeries, {
      color: config.indicators.ema20.color,
      lineWidth: config.indicators.ema20.thickness as any || 2,
      visible: config.indicators.ema20.enabled,
      title: `EMA ${config.indicators.ema20.period}`,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    const ema50 = chart.addSeries(LineSeries, {
      color: config.indicators.ema50.color,
      lineWidth: config.indicators.ema50.thickness as any || 2,
      visible: config.indicators.ema50.enabled,
      title: `EMA ${config.indicators.ema50.period}`,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    const ema100 = chart.addSeries(LineSeries, {
      color: config.indicators.ema100.color,
      lineWidth: config.indicators.ema100.thickness as any || 1,
      visible: config.indicators.ema100.enabled,
      title: `EMA ${config.indicators.ema100.period}`,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    const ema200 = chart.addSeries(LineSeries, {
      color: config.indicators.ema200.color,
      lineWidth: config.indicators.ema200.thickness as any || 2,
      visible: config.indicators.ema200.enabled,
      title: `EMA ${config.indicators.ema200.period}`,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    const sma = chart.addSeries(LineSeries, {
      color: config.indicators.sma.color,
      lineWidth: config.indicators.sma.thickness as any || 2,
      visible: config.indicators.sma.enabled,
      title: `SMA ${config.indicators.sma.period}`,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    const bbUpper = chart.addSeries(LineSeries, {
      color: config.indicators.bollingerBands.upperColor,
      lineWidth: 1,
      visible: config.indicators.bollingerBands.enabled,
      title: 'BB Upper',
      lastValueVisible: false,
      priceLineVisible: false,
    });

    const bbMiddle = chart.addSeries(LineSeries, {
      color: config.indicators.bollingerBands.middleColor,
      lineWidth: 1,
      visible: config.indicators.bollingerBands.enabled,
      title: 'BB Mid',
      lastValueVisible: false,
      priceLineVisible: false,
    });

    const bbLower = chart.addSeries(LineSeries, {
      color: config.indicators.bollingerBands.lowerColor,
      lineWidth: 1,
      visible: config.indicators.bollingerBands.enabled,
      title: 'BB Lower',
      lastValueVisible: false,
      priceLineVisible: false,
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;
    ema20Ref.current = ema20;
    ema50Ref.current = ema50;
    ema100Ref.current = ema100;
    ema200Ref.current = ema200;
    smaRef.current = sma;
    bbUpperRef.current = bbUpper;
    bbMiddleRef.current = bbMiddle;
    bbLowerRef.current = bbLower;

    // Resize observer
    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, []);

  // 2. Fetch Candle Data when pair or timeframe changes
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    const loadData = async () => {
      try {
        const candles = await api.getKlines(pair, timeframe, 150);
        if (!isMounted) return;

        if (Array.isArray(candles) && candles.length > 0) {
          const sorted = [...candles].sort((a: any, b: any) => a.time - b.time);
          setLastCandles(sorted);

          if (candleSeriesRef.current) {
            candleSeriesRef.current.setData(sorted as any);
          }

          if (volumeSeriesRef.current) {
            const volData = sorted.map((c: any) => ({
              time: c.time,
              value: c.volume || 0,
              color: c.close >= c.open ? config.volume.upColor : config.volume.downColor,
            }));
            volumeSeriesRef.current.setData(volData as any);
          }

          // Compute & set Indicator data
          updateIndicatorsData(sorted);

          if (chartRef.current) {
            chartRef.current.timeScale().fitContent();
          }
        } else {
          setError(`No candlestick data available for ${pair} on Delta Exchange.`);
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Failed to load market candles.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    // Auto-poll candle updates every 5 seconds from Delta Exchange feed
    const pollInterval = setInterval(loadData, 5000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [pair, timeframe]);

  // Helper to update indicator series data
  const updateIndicatorsData = (candles: CandleData[]) => {
    if (candles.length === 0) return;

    if (ema20Ref.current && config.indicators.ema20.enabled) {
      ema20Ref.current.setData(computeEMA(candles, config.indicators.ema20.period) as any);
    }
    if (ema50Ref.current && config.indicators.ema50.enabled) {
      ema50Ref.current.setData(computeEMA(candles, config.indicators.ema50.period) as any);
    }
    if (ema100Ref.current && config.indicators.ema100.enabled) {
      ema100Ref.current.setData(computeEMA(candles, config.indicators.ema100.period) as any);
    }
    if (ema200Ref.current && config.indicators.ema200.enabled) {
      ema200Ref.current.setData(computeEMA(candles, config.indicators.ema200.period) as any);
    }
    if (smaRef.current && config.indicators.sma.enabled) {
      smaRef.current.setData(computeSMA(candles, config.indicators.sma.period) as any);
    }
    if (config.indicators.bollingerBands.enabled) {
      const bb = computeBollingerBands(candles, config.indicators.bollingerBands.period, config.indicators.bollingerBands.stdDev);
      if (bbUpperRef.current) bbUpperRef.current.setData(bb.upper as any);
      if (bbMiddleRef.current) bbMiddleRef.current.setData(bb.middle as any);
      if (bbLowerRef.current) bbLowerRef.current.setData(bb.lower as any);
    }
  };

  // 3. Real-time dynamic updates when config changes
  useEffect(() => {
    if (!chartRef.current || !candleSeriesRef.current) return;

    // Apply layout and canvas options
    chartRef.current.applyOptions({
      layout: {
        background: { type: ColorType.Solid, color: config.canvas.backgroundColor },
        textColor: config.canvas.scaleTextColor,
      },
      grid: {
        vertLines: {
          visible: config.canvas.vertGridVisible,
          color: config.canvas.gridColor,
        },
        horzLines: {
          visible: config.canvas.horzGridVisible,
          color: config.canvas.gridColor,
        },
      },
      crosshair: {
        vertLine: {
          color: config.canvas.crosshairColor,
        },
        horzLine: {
          color: config.canvas.crosshairColor,
        },
      },
      rightPriceScale: {
        borderColor: config.canvas.gridColor,
        textColor: config.canvas.scaleTextColor,
      },
      timeScale: {
        borderColor: config.canvas.gridColor,
        barSpacing: config.candles.barSpacing,
      },
    });

    // Apply candle options
    candleSeriesRef.current.applyOptions({
      upColor: config.candles.hollow ? 'transparent' : config.candles.upColor,
      downColor: config.candles.downColor,
      borderVisible: config.candles.showBorders,
      borderUpColor: config.candles.borderUpColor,
      borderDownColor: config.candles.borderDownColor,
      wickVisible: config.candles.showWicks,
      wickUpColor: config.candles.wickUpColor,
      wickDownColor: config.candles.wickDownColor,
    });

    // Apply volume options
    if (volumeSeriesRef.current) {
      volumeSeriesRef.current.applyOptions({
        visible: config.volume.visible,
      });
      if (lastCandles.length > 0) {
        const volData = lastCandles.map((c: any) => ({
          time: c.time,
          value: c.volume || 0,
          color: c.close >= c.open ? config.volume.upColor : config.volume.downColor,
        }));
        volumeSeriesRef.current.setData(volData as any);
      }
    }

    // Apply indicator options
    if (ema20Ref.current) {
      ema20Ref.current.applyOptions({
        visible: config.indicators.ema20.enabled,
        color: config.indicators.ema20.color,
        lineWidth: config.indicators.ema20.thickness as any || 2,
        title: `EMA ${config.indicators.ema20.period}`,
      });
    }

    if (ema50Ref.current) {
      ema50Ref.current.applyOptions({
        visible: config.indicators.ema50.enabled,
        color: config.indicators.ema50.color,
        lineWidth: config.indicators.ema50.thickness as any || 2,
        title: `EMA ${config.indicators.ema50.period}`,
      });
    }

    if (ema100Ref.current) {
      ema100Ref.current.applyOptions({
        visible: config.indicators.ema100.enabled,
        color: config.indicators.ema100.color,
        lineWidth: config.indicators.ema100.thickness as any || 1,
        title: `EMA ${config.indicators.ema100.period}`,
      });
    }

    if (ema200Ref.current) {
      ema200Ref.current.applyOptions({
        visible: config.indicators.ema200.enabled,
        color: config.indicators.ema200.color,
        lineWidth: config.indicators.ema200.thickness as any || 2,
        title: `EMA ${config.indicators.ema200.period}`,
      });
    }

    if (smaRef.current) {
      smaRef.current.applyOptions({
        visible: config.indicators.sma.enabled,
        color: config.indicators.sma.color,
        lineWidth: config.indicators.sma.thickness as any || 2,
        title: `SMA ${config.indicators.sma.period}`,
      });
    }

    if (bbUpperRef.current && bbMiddleRef.current && bbLowerRef.current) {
      bbUpperRef.current.applyOptions({
        visible: config.indicators.bollingerBands.enabled,
        color: config.indicators.bollingerBands.upperColor,
      });
      bbMiddleRef.current.applyOptions({
        visible: config.indicators.bollingerBands.enabled,
        color: config.indicators.bollingerBands.middleColor,
      });
      bbLowerRef.current.applyOptions({
        visible: config.indicators.bollingerBands.enabled,
        color: config.indicators.bollingerBands.lowerColor,
      });
    }

    if (lastCandles.length > 0) {
      updateIndicatorsData(lastCandles);
    }
  }, [config]);

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden select-none bg-[var(--bg-main)]">
      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-2xs">
          <div className="flex items-center space-x-2 text-xs font-medium text-white bg-black/80 px-4 py-2 rounded-md border border-white/10 shadow-lg">
            <div className="w-3.5 h-3.5 border-2 border-[var(--accent-blue)] border-t-transparent rounded-full animate-spin" />
            <span>Loading Delta Exchange Market Feed...</span>
          </div>
        </div>
      )}

      {/* Error Notice */}
      {error && (
        <div className="absolute top-4 left-4 right-4 z-20 p-3 bg-[var(--color-red)]/10 border border-[var(--color-red)]/30 rounded text-xs text-[var(--color-red)]">
          <strong>Market Data Notice:</strong> {error}
        </div>
      )}

      {/* Chart Canvas Container */}
      <div
        ref={containerRef}
        className="w-full flex-1 relative"
        style={{ minHeight: '300px' }}
      />
    </div>
  );
};
