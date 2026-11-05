import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { marketData } from './marketData.js';
import { db } from './db.js';
import {
  calculateEMA,
  calculateSMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateATR,
  analyzeSMC,
} from './indicators.js';

export interface AiErrorDetail {
  type: 'HIGH_DEMAND' | 'QUOTA_EXHAUSTED' | 'RATE_LIMITED' | 'BILLING_REQUIRED' | 'AUTHENTICATION_REQUIRED' | 'API_ERROR';
  title: string;
  message: string;
  quotaDetail: string;
  retryAfterSeconds?: number;
  suggestedModel?: string;
  modelUsed: string;
}

const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  return new GoogleGenAI({
    apiKey: apiKey || '',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

export class AiAnalystService {
  /**
   * Parse errors returned by the Gemini API into human-actionable diagnosis
   */
  public parseGeminiError(err: any, modelName: string): AiErrorDetail {
    const rawMsg = err?.message || String(err);
    const status = err?.status || err?.code || (err?.error && (err.error.code || err.error.status)) || 0;
    const str = `${rawMsg} ${JSON.stringify(err?.error || '')}`.toLowerCase();

    // Check for retry-after / retryDelay in seconds
    let retryAfterSeconds: number | undefined;
    const retryMatch = rawMsg.match(/retry after ([0-9]+)s/i) || rawMsg.match(/retrydelay['":\s]+([0-9]+)s/i);
    if (retryMatch && retryMatch[1]) {
      retryAfterSeconds = parseInt(retryMatch[1], 10);
    }

    // 1. High Demand / 503 / Server Capacity Spike
    if (
      status === 503 ||
      str.includes('503') ||
      str.includes('high demand') ||
      str.includes('spikes in demand') ||
      str.includes('service unavailable')
    ) {
      const suggested = modelName === 'gemini-3.8-flash' ? 'gemini-3.1-flash-lite' : 'gemini-3.8-flash';
      return {
        type: 'HIGH_DEMAND',
        title: 'Model Experiencing High Demand (503)',
        message: `${modelName} is currently experiencing temporary traffic spikes on Google's servers.`,
        quotaDetail: `Spikes in demand are temporary. Switching to ${suggested} is recommended for high reliability. The strategy engine and paper-trading daemon remain 100% active.`,
        retryAfterSeconds: retryAfterSeconds || 10,
        suggestedModel: suggested,
        modelUsed: modelName,
      };
    }

    // 2. Quota / 429 / Resource Exhausted
    if (status === 429 || str.includes('resource_exhausted') || str.includes('quota') || str.includes('429')) {
      if (str.includes('daily') || str.includes('per day') || str.includes('free tier limit') || str.includes('quota metric')) {
        return {
          type: 'QUOTA_EXHAUSTED',
          title: 'Daily AI Quota Exhausted',
          message: `The daily Free Tier quota for ${modelName} has been reached for this project.`,
          quotaDetail: 'Free tier enforces daily limits (resets at 00:00 UTC). You can switch to gemini-3.1-flash-lite or attach a billing key. Strategy engine & paper trading continue unaffected.',
          retryAfterSeconds,
          suggestedModel: modelName === 'gemini-4-argon' ? 'gemini-3.1-flash-lite' : 'gemini-3.1-flash-lite',
          modelUsed: modelName,
        };
      }

      if (modelName === 'gemini-4-argon') {
        return {
          type: 'BILLING_REQUIRED',
          title: 'Billing Tier Required',
          message: `Model ${modelName} requires a billing-enabled project key.`,
          quotaDetail: 'gemini-4-argon is an advanced reasoning tier model. For standard Free Tier keys, switch to gemini-3.1-flash-lite or gemini-3.8-flash.',
          retryAfterSeconds: retryAfterSeconds || 60,
          suggestedModel: 'gemini-3.1-flash-lite',
          modelUsed: modelName,
        };
      }

      return {
        type: 'RATE_LIMITED',
        title: 'Requests-Per-Minute Rate Limited',
        message: `Rate limit reached (requests-per-minute) on ${modelName}.`,
        quotaDetail: retryAfterSeconds
          ? `Please wait ${retryAfterSeconds} seconds before requesting a new analysis.`
          : 'Free tier limits concurrent requests per minute. Wait a few moments before retrying.',
        retryAfterSeconds: retryAfterSeconds || 20,
        suggestedModel: 'gemini-3.1-flash-lite',
        modelUsed: modelName,
      };
    }

    // 3. Authentication / Permission Denied
    if (status === 403 || str.includes('permission_denied') || str.includes('api key') || str.includes('authentication scopes')) {
      return {
        type: 'AUTHENTICATION_REQUIRED',
        title: 'API Authentication Scope Notice',
        message: 'Gemini API authentication scope or API key is not configured for this project.',
        quotaDetail: 'Ensure an API key is configured in the AI Studio environment secrets panel. Market data and rule-based paper trading continue unaffected.',
        modelUsed: modelName,
      };
    }

    // 4. Clean error message extraction for general fallback (avoiding raw JSON dump)
    let cleanMsg = rawMsg;
    if (err?.error?.message) {
      cleanMsg = err.error.message;
    } else if (rawMsg.startsWith('{') || rawMsg.includes('{"error"')) {
      try {
        const parsed = JSON.parse(rawMsg.replace(/^[^{]*/, ''));
        if (parsed?.error?.message) cleanMsg = parsed.error.message;
      } catch {}
    }

    return {
      type: 'API_ERROR',
      title: 'AI Service Temporarily Unavailable',
      message: cleanMsg.length > 150 ? cleanMsg.slice(0, 150) + '...' : cleanMsg,
      quotaDetail: 'The Gemini API service was temporarily unreachable. The rule-based strategy engine and automated paper-trading daemon remain fully operational.',
      suggestedModel: modelName === 'gemini-3.8-flash' ? 'gemini-3.1-flash-lite' : 'gemini-3.8-flash',
      modelUsed: modelName,
    };
  }

  /**
   * Run market analysis with configurable Gemini model, automatic high-demand fallback, and robust error handling
   */
  public async analyzeMarket(pair: string, timeframe = '15m', userNotes?: string, requestedModel?: string) {
    // Default to gemini-3.1-flash-lite for maximum availability and stability
    const savedSettingModel = db.getSetting<string>('ai_model', 'gemini-3.1-flash-lite');
    const primaryModel = requestedModel || savedSettingModel || 'gemini-3.1-flash-lite';

    // Build fallback candidate chain
    const modelCandidates = [primaryModel];
    if (primaryModel === 'gemini-3.8-flash') {
      modelCandidates.push('gemini-3.1-flash-lite');
    } else if (primaryModel === 'gemini-3.1-flash-lite') {
      modelCandidates.push('gemini-3.8-flash');
    } else if (primaryModel === 'gemini-4-argon') {
      modelCandidates.push('gemini-3.1-flash-lite');
    }

    const ticker = marketData.getTicker(pair) || await marketData.fetchTicker(pair);
    const candles = await marketData.getKlines(pair, timeframe, 80);
    const trendCandles = await marketData.getKlines(pair, '1H', 80);

    if (!candles || candles.length < 30) {
      throw new Error(`Insufficient market data to conduct AI analysis on ${pair}.`);
    }

    const lastCandle = candles[candles.length - 1];
    const closes = candles.map(c => c.close);
    const volumes = candles.map(c => c.volume);

    // Indicators snapshot
    const ema20 = calculateEMA(closes, 20);
    const ema50 = calculateEMA(closes, 50);
    const ema200 = calculateEMA(closes, 200);
    const rsi14 = calculateRSI(closes, 14);
    const macd = calculateMACD(closes);
    const bb = calculateBollingerBands(closes);
    const atr = calculateATR(candles, 14);
    const volSma20 = calculateSMA(volumes, 20);
    const { swingPoints, smcSignals } = analyzeSMC(candles, 5);

    const trendCloses = trendCandles.map(c => c.close);
    const trendEma200 = calculateEMA(trendCloses, 200);
    const lastTrendEma = trendEma200[trendEma200.length - 1] ?? 0;

    const lastIdx = closes.length - 1;
    const currentPrice = ticker?.price || lastCandle.close;

    const marketContext = {
      pair,
      timeframe,
      currentPrice,
      bid: ticker?.bid,
      ask: ticker?.ask,
      change24hPct: ticker?.change24hPct,
      volume24h: ticker?.volume24h,
      high24h: ticker?.high24h,
      low24h: ticker?.low24h,
      indicators: {
        rsi14: rsi14[lastIdx]?.toFixed(2),
        ema20: ema20[lastIdx]?.toFixed(2),
        ema50: ema50[lastIdx]?.toFixed(2),
        ema200: ema200[lastIdx]?.toFixed(2),
        trend1HEma200: lastTrendEma ? lastTrendEma.toFixed(2) : 'N/A',
        macdHist: macd.hist[lastIdx]?.toFixed(4),
        bbUpper: bb.upper[lastIdx]?.toFixed(2),
        bbMiddle: bb.middle[lastIdx]?.toFixed(2),
        bbLower: bb.lower[lastIdx]?.toFixed(2),
        atr14: atr[lastIdx]?.toFixed(2),
        volVsSma: volSma20[lastIdx] ? (lastCandle.volume / volSma20[lastIdx]!).toFixed(2) + 'x average' : 'N/A',
      },
      recentSMC: smcSignals.slice(-5).map(s => ({
        type: s.type,
        price: s.price,
        description: s.description,
      })),
      recentSwings: swingPoints.slice(-4).map(sp => `${sp.type} at ${sp.price.toFixed(2)}`),
      recentCandlesTail: candles.slice(-5).map(c => ({
        time: new Date(c.time * 1000).toISOString(),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
      })),
    };

    const prompt = `
You are the institutional Quantitative Intelligence Analyst for AUREVIAN ALGO TRADER (founded by Sehaj Jatana).

Analyze the following REAL cryptocurrency market data and SMC structure:
${JSON.stringify(marketContext, null, 2)}

${userNotes ? `User Tactical Notes: ${userNotes}` : ''}

Provide a concise, professional quantitative breakdown:
1. **Market Structure & Trend Alignment**: 1H Macro Trend vs 15M structure. Price relative to EMAs.
2. **Momentum & Volume Diagnostics**: RSI 14 velocity, MACD histogram, and Volume vs 20-SMA.
3. **Smart Money Concepts (SMC)**: Break of Structure (BOS), Change of Character (CHoCH), and Liquidity sweeps.
4. **Hypothetical Setup**: Bias, Invalidation level (SL), Target (TP) with minimum 1:2 R:R.
5. **Safeguard Notice**: Reiterate that this is probabilistic analysis decoupled from rule-based automated paper execution.
`;

    const ai = getAiClient();
    let lastError: any = null;
    let finalModelUsed = primaryModel;

    // Try candidates in order; if primary hits 503 high demand or quota, seamlessly try fallback
    for (let i = 0; i < modelCandidates.length; i++) {
      const candidateModel = modelCandidates[i];
      finalModelUsed = candidateModel;
      try {
        const config: any = {
          systemInstruction: 'You are an institutional crypto quantitative trading system analyst for Aurevian Algo Trader. Provide deep, rigorous, objective technical analysis without fluff or guaranteed predictions. Never fabricate prices or indicators.',
        };

        if (candidateModel === 'gemini-4-argon') {
          config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
        }

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`503: Request timed out after 12s on model ${candidateModel}`)), 12000)
        );

        const response = await Promise.race([
          ai.models.generateContent({
            model: candidateModel,
            contents: prompt,
            config,
          }),
          timeoutPromise,
        ]);

        if (response && response.text) {
          return {
            success: true,
            pair,
            timeframe,
            analyzedAt: Date.now(),
            marketContext,
            analysisText: response.text,
            modelUsed: candidateModel,
            fallbackUsed: candidateModel !== primaryModel,
          };
        }
      } catch (err: any) {
        lastError = err;
        const parsed = this.parseGeminiError(err, candidateModel);
        const hasNextCandidate = i < modelCandidates.length - 1;

        if (hasNextCandidate && (parsed.type === 'HIGH_DEMAND' || parsed.type === 'RATE_LIMITED' || parsed.type === 'API_ERROR' || parsed.type === 'BILLING_REQUIRED')) {
          console.info(`[AUREVIAN AI] ${candidateModel} busy or limited (${parsed.type}), falling back to ${modelCandidates[i + 1]}...`);
          continue;
        }
        break;
      }
    }

    const parsedError = this.parseGeminiError(lastError, finalModelUsed);
    return {
      success: false,
      error: parsedError,
      modelUsed: finalModelUsed,
    };
  }

  /**
   * High-Quality Visual Trade Setup Generator with error handling
   */
  public async generateVisualSetup(params: {
    pair: string;
    concept: string;
    imageSize: '1K' | '2K' | '4K';
    aspectRatio?: '16:9' | '1:1' | '4:3';
  }) {
    const { pair, concept, imageSize = '1K', aspectRatio = '16:9' } = params;
    const ai = getAiClient();
    const model = 'gemini-3-pro-image-preview';

    const prompt = `
Institutional cryptocurrency algorithmic trading visual setup for ${pair}.
High-tech financial terminal view with clean styling, candlestick chart pattern, Smart Money Concepts order blocks, liquidity sweep vectors, Break of Structure annotations, clean typography, luxury aesthetic inspired by Aurevian Algo Trader. ${concept}.
Masterpiece financial visualization, ultra-sharp rendering.
`;

    try {
      const response = await ai.models.generateContent({
        model,
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
          imageConfig: {
            aspectRatio,
            imageSize,
          },
        },
      });

      let imageUrl: string | null = null;
      for (const part of response.candidates?.[0]?.content?.parts ?? []) {
        if (part.inlineData?.data) {
          const base64EncodeString: string = part.inlineData.data;
          const mime = part.inlineData.mimeType ?? 'image/png';
          imageUrl = `data:${mime};base64,${base64EncodeString}`;
          break;
        }
      }

      if (!imageUrl) {
        throw new Error('Image generation completed but no image binary was returned.');
      }

      return {
        success: true,
        pair,
        imageUrl,
        imageSize,
        aspectRatio,
        prompt,
        generatedAt: Date.now(),
      };
    } catch (err: any) {
      const parsedError = this.parseGeminiError(err, model);
      return {
        success: false,
        error: parsedError,
      };
    }
  }
}

export const aiAnalyst = new AiAnalystService();
