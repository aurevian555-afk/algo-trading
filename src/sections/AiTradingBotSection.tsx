import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Sparkles,
  BrainCircuit,
  Image as ImageIcon,
  ShieldAlert,
  Clock,
  RotateCcw,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react';
import { AiErrorDetail } from '../../server/aiAnalyst';

interface Props {
  selectedPair: string;
}

export const AiTradingBotSection: React.FC<Props> = ({ selectedPair }) => {
  const [activeTab, setActiveTab] = useState<'ANALYSIS' | 'VISUAL'>('ANALYSIS');
  const [timeframe, setTimeframe] = useState('15m');
  const [userNotes, setUserNotes] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.1-flash-lite');
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [aiError, setAiError] = useState<AiErrorDetail | null>(null);
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);

  // Visual Image Generator State
  const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [concept, setConcept] = useState('Smart Money Concepts Liquidity Sweep and Bullish Break of Structure');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '1:1' | '4:3'>('16:9');
  const [generatingVisual, setGeneratingVisual] = useState(false);
  const [generatedVisual, setGeneratedVisual] = useState<any>(null);
  const [visualError, setVisualError] = useState<string | null>(null);

  // Load default saved model from settings on mount
  useEffect(() => {
    api.getSettings().then(s => {
      if (s?.ai_model) setSelectedModel(s.ai_model);
    }).catch(() => {});
  }, []);

  // Countdown timer for rate limits or quota retryDelay
  useEffect(() => {
    if (retryCountdown === null || retryCountdown <= 0) return;
    const timer = setInterval(() => {
      setRetryCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [retryCountdown]);

  const handleRunAnalysis = async (overrideModel?: string) => {
    const modelToUse = overrideModel || selectedModel;
    if (overrideModel) {
      setSelectedModel(overrideModel);
    }

    setLoadingAnalysis(true);
    setAiError(null);
    try {
      const data = await api.analyzeWithAi(selectedPair, timeframe, userNotes, modelToUse);
      if (data.success && data.analysis) {
        setAnalysisResult(data.analysis);
        setAiError(null);
        setRetryCountdown(null);
      } else {
        const errObj: AiErrorDetail = typeof data.error === 'object' && data.error?.title
          ? data.error
          : {
              type: 'API_ERROR',
              title: 'AI Analysis Temporarily Unavailable',
              message: typeof data.error === 'string' ? data.error : 'AI service could not process the request.',
              quotaDetail: 'Quota or network response issue. Automated paper-trading engine continues running independently.',
              modelUsed: modelToUse,
            };

        setAiError(errObj);
        if (errObj.retryAfterSeconds && errObj.retryAfterSeconds > 0) {
          setRetryCountdown(errObj.retryAfterSeconds);
        }
      }
    } catch (err: any) {
      setAiError({
        type: 'API_ERROR',
        title: 'AI Analysis Temporarily Unavailable',
        message: err.message || 'Network error communicating with AI server.',
        quotaDetail: 'Please verify your network connection and retry.',
        modelUsed: modelToUse,
      });
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const handleGenerateVisual = async () => {
    setGeneratingVisual(true);
    setVisualError(null);
    try {
      const data = await api.generateAiVisual({
        pair: selectedPair,
        concept,
        imageSize,
        aspectRatio,
      });
      if (data.success) {
        setGeneratedVisual(data.visual);
      } else {
        const msg = typeof data.error === 'object' ? data.error?.message || data.error?.title : data.error;
        setVisualError(msg || 'Failed to generate visual setup. Quota may be limited.');
      }
    } catch (err: any) {
      setVisualError(err.message || 'Visual generation error.');
    } finally {
      setGeneratingVisual(false);
    }
  };

  return (
    <div className="p-5 space-y-4 max-w-7xl mx-auto transition-colors">
      {/* Top Header Card */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-[var(--accent-purple)]" />
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              AI TRADING INTELLIGENCE & QUANTITATIVE REASONING
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] bg-[var(--accent-purple)]/10 text-[var(--accent-purple)] font-mono border border-[var(--accent-purple)]/20 font-medium">
              {selectedModel}
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Institutional AI reasoning powered by Google Gemini. Strictly separated from automated execution rules.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-[var(--bg-card-sub)] border border-[var(--border-main)] rounded-lg p-0.5 text-xs">
          <button
            onClick={() => setActiveTab('ANALYSIS')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded transition-colors cursor-pointer ${
              activeTab === 'ANALYSIS'
                ? 'bg-[var(--bg-card)] text-[var(--text-primary)] font-semibold shadow-xs border border-[var(--border-main)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <BrainCircuit className="w-3.5 h-3.5 text-[var(--accent-blue)]" />
            <span>Deep Market Reasoning</span>
          </button>
          <button
            onClick={() => setActiveTab('VISUAL')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded transition-colors cursor-pointer ${
              activeTab === 'VISUAL'
                ? 'bg-[var(--bg-card)] text-[var(--text-primary)] font-semibold shadow-xs border border-[var(--border-main)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5 text-[var(--accent-purple)]" />
            <span>Visual Trade Setup</span>
          </button>
        </div>
      </div>

      {/* Clean Compact "AI Analysis Temporarily Unavailable" Notice */}
      {aiError && (
        <div className="p-4 bg-[var(--bg-card)] border-l-4 border-l-amber-500 border border-[var(--border-main)] rounded-lg shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                {aiError.title || 'AI Analysis Temporarily Unavailable'}
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                {aiError.type}
              </span>
            </div>

            {/* Model Used Tag */}
            <span className="text-[11px] font-mono text-[var(--text-secondary)]">
              Model: <strong className="text-[var(--text-primary)]">{aiError.modelUsed}</strong>
            </span>
          </div>

          {/* Reason and Diagnosis */}
          <div className="text-xs space-y-1.5 text-[var(--text-secondary)]">
            <p className="text-[var(--text-primary)] font-medium">
              {aiError.message}
            </p>
            <p className="text-[11px] leading-relaxed">
              {aiError.quotaDetail}
            </p>
          </div>

          {/* Action Row: Retry Button + Model Switcher + Fallback Status */}
          <div className="pt-2 border-t border-[var(--border-main)] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleRunAnalysis()}
                disabled={loadingAnalysis || (retryCountdown !== null && retryCountdown > 0)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-[var(--accent-blue)] hover:opacity-90 text-white rounded font-medium transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${loadingAnalysis ? 'animate-spin' : ''}`} />
                <span>
                  {retryCountdown !== null && retryCountdown > 0
                    ? `Retry in ${retryCountdown}s`
                    : loadingAnalysis
                    ? 'Retrying...'
                    : 'Retry AI Analysis'}
                </span>
              </button>

              {aiError.suggestedModel && aiError.suggestedModel !== selectedModel && (
                <button
                  onClick={() => handleRunAnalysis(aiError.suggestedModel)}
                  disabled={loadingAnalysis}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-[var(--bg-card-sub)] hover:border-[var(--accent-blue)] border border-[var(--border-main)] text-[var(--text-primary)] rounded font-medium transition-colors cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--accent-blue)]" />
                  <span>Switch to {aiError.suggestedModel} & Retry</span>
                </button>
              )}
            </div>

            {/* Uninterrupted Autonomous Engine Guarantee */}
            <div className="flex items-center space-x-2 text-[11px] text-[var(--color-green)] font-mono font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-green)] shrink-0" />
              <span>Strategy Engine & Paper Trading Operational (Decoupled)</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 1: Deep Market Reasoning */}
      {activeTab === 'ANALYSIS' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg shadow-xs grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="text-[var(--text-secondary)] font-medium block mb-1">Target Instrument</label>
              <div className="px-3 py-1.5 bg-[var(--bg-card-sub)] border border-[var(--border-main)] rounded font-mono font-semibold text-[var(--text-primary)]">
                {selectedPair}
              </div>
            </div>

            <div>
              <label className="text-[var(--text-secondary)] font-medium block mb-1">Execution Timeframe</label>
              <select
                value={timeframe}
                onChange={e => setTimeframe(e.target.value)}
                className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded px-3 py-1.5 text-[var(--text-primary)] font-mono outline-none"
              >
                {['1m', '5m', '15m', '30m', '1H', '4H', '1D'].map(tf => (
                  <option key={tf} value={tf}>{tf}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[var(--text-secondary)] font-medium block mb-1">Gemini AI Model</label>
              <select
                value={selectedModel}
                onChange={e => setSelectedModel(e.target.value)}
                className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded px-3 py-1.5 text-[var(--text-primary)] font-mono outline-none"
              >
                <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Recommended • High Availability)</option>
                <option value="gemini-3.8-flash">gemini-3.8-flash (Standard Free Tier • High Traffic)</option>
                <option value="gemini-4-argon">gemini-4-argon (Deep Thinking • Paid Billing)</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => handleRunAnalysis()}
                disabled={loadingAnalysis || (retryCountdown !== null && retryCountdown > 0)}
                className="w-full flex items-center justify-center space-x-2 px-4 py-1.5 bg-[var(--accent-purple)] hover:opacity-90 text-white rounded font-semibold transition-colors disabled:opacity-50 shadow-xs cursor-pointer"
              >
                <BrainCircuit className={`w-4 h-4 ${loadingAnalysis ? 'animate-spin' : ''}`} />
                <span>
                  {loadingAnalysis
                    ? 'Reasoning...'
                    : retryCountdown !== null && retryCountdown > 0
                    ? `Wait (${retryCountdown}s)`
                    : 'Run Quant Analysis'}
                </span>
              </button>
            </div>

            <div className="sm:col-span-2 md:col-span-4">
              <label className="text-[var(--text-secondary)] font-medium block mb-1">Optional Tactical User Notes</label>
              <input
                type="text"
                value={userNotes}
                onChange={e => setUserNotes(e.target.value)}
                placeholder="e.g. Monitoring 15m bullish order block after New York session open"
                className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded px-3 py-1.5 text-[var(--text-primary)] outline-none"
              />
            </div>
          </div>

          {/* Institutional Safeguards & Separation Banner */}
          <div className="p-3.5 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg shadow-xs text-xs text-[var(--text-secondary)] flex items-start space-x-2.5">
            <ShieldAlert className="w-4 h-4 text-[var(--accent-blue)] shrink-0 mt-0.5" />
            <div>
              <strong className="text-[var(--text-primary)]">Autonomous Boundary & Reliability Notice:</strong> AI analysis provides probabilistic mathematical market intelligence. It does not issue financial advice, cannot bypass predefined account risk limits, and remains completely decoupled from the automated strategy execution daemon. If AI quota is exhausted, algorithmic trading continues uninterrupted.
            </div>
          </div>

          {/* Analysis Output */}
          {analysisResult ? (
            <div className="p-5 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-main)]">
                <div className="flex items-center space-x-2 text-xs">
                  <span className="font-semibold text-[var(--text-primary)]">Analysis Report: {analysisResult.pair}</span>
                  <span className="text-[var(--text-secondary)]">({analysisResult.timeframe})</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] border border-[var(--accent-blue)]/20 font-medium">
                    {analysisResult.modelUsed}
                  </span>
                  {analysisResult.fallbackUsed && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-medium">
                      High Demand Auto-Fallback
                    </span>
                  )}
                </div>
                <div className="text-[11px] font-mono text-[var(--text-secondary)] flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Evaluated at {new Date(analysisResult.analyzedAt).toLocaleTimeString()}</span>
                </div>
              </div>

              {/* Rendered Text Analysis */}
              <div className="text-xs leading-relaxed text-[var(--text-primary)] space-y-3 font-sans bg-[var(--bg-card-sub)] p-4 rounded-lg border border-[var(--border-main)]">
                <pre className="whitespace-pre-wrap font-sans bg-transparent p-0 text-[var(--text-primary)] border-0 text-xs">
                  {analysisResult.analysisText}
                </pre>
              </div>
            </div>
          ) : !aiError ? (
            <div className="p-12 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg shadow-xs text-center text-xs text-[var(--text-secondary)]">
              Click <strong className="text-[var(--text-primary)]">"Run Quant Analysis"</strong> to generate a comprehensive institutional evaluation using real-time price feeds and technical indicators.
            </div>
          ) : null}
        </div>
      )}

      {/* Tab 2: Visual Trade Setup Generator */}
      {activeTab === 'VISUAL' && (
        <div className="space-y-4">
          <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg shadow-xs space-y-3 text-xs">
            <div className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-[var(--accent-purple)]" />
              AI Visual Trade Setup / Pattern Blueprint Generator
            </div>
            <p className="text-[var(--text-secondary)]">
              Generate institutional quantitative trade visualizations and pattern maps with model <strong>gemini-3-pro-image-preview</strong>. Select from 1K, 2K, or 4K resolution.
            </p>

            {visualError && (
              <div className="p-3 bg-[var(--bg-card-sub)] border-l-4 border-l-amber-500 border border-[var(--border-main)] rounded text-xs text-[var(--text-secondary)] space-y-1">
                <div className="font-semibold text-[var(--text-primary)]">Visual Generation Notice</div>
                <div>{visualError}</div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[var(--text-secondary)] font-medium block mb-1">Image Size (Resolution)</label>
                <div className="flex items-center space-x-2 bg-[var(--bg-card-sub)] p-1 border border-[var(--border-main)] rounded-lg">
                  {(['1K', '2K', '4K'] as const).map(size => (
                    <button
                      key={size}
                      onClick={() => setImageSize(size)}
                      className={`flex-1 py-1 rounded text-center font-mono font-medium transition-colors cursor-pointer ${
                        imageSize === size
                          ? 'bg-[var(--accent-purple)] text-white shadow-xs'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[var(--text-secondary)] font-medium block mb-1">Aspect Ratio</label>
                <select
                  value={aspectRatio}
                  onChange={e => setAspectRatio(e.target.value as any)}
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded px-3 py-1.5 text-[var(--text-primary)] font-mono outline-none"
                >
                  <option value="16:9">16:9 (Landscape Terminal)</option>
                  <option value="1:1">1:1 (Square Matrix)</option>
                  <option value="4:3">4:3 (Chart Presentation)</option>
                </select>
              </div>

              <div>
                <label className="text-[var(--text-secondary)] font-medium block mb-1">Trading Pair Focus</label>
                <div className="px-3 py-1.5 bg-[var(--bg-card-sub)] border border-[var(--border-main)] rounded font-mono font-semibold text-[var(--text-primary)]">
                  {selectedPair}
                </div>
              </div>

              <div className="sm:col-span-3">
                <label className="text-[var(--text-secondary)] font-medium block mb-1">Setup Concept / Technical Focus</label>
                <input
                  type="text"
                  value={concept}
                  onChange={e => setConcept(e.target.value)}
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded px-3 py-2 text-[var(--text-primary)] outline-none"
                  placeholder="e.g. Smart Money Concepts Liquidity Sweep and Bullish Break of Structure"
                />
              </div>
            </div>

            <button
              onClick={handleGenerateVisual}
              disabled={generatingVisual}
              className="flex items-center space-x-2 px-5 py-2.5 bg-[var(--accent-purple)] hover:opacity-90 text-white rounded font-semibold transition-colors disabled:opacity-50 shadow-xs cursor-pointer"
            >
              <Sparkles className={`w-4 h-4 ${generatingVisual ? 'animate-spin' : ''}`} />
              <span>{generatingVisual ? `Generating High-Quality ${imageSize} Visual...` : `Generate ${imageSize} Trade Visual`}</span>
            </button>
          </div>

          {/* Generated Image Result */}
          {generatedVisual && (
            <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg shadow-xs space-y-3">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-[var(--border-main)]">
                <span className="font-semibold text-[var(--text-primary)]">
                  Generated Visual Blueprint ({generatedVisual.imageSize} • {generatedVisual.aspectRatio})
                </span>
                <span className="text-[11px] font-mono text-[var(--text-secondary)]">
                  {new Date(generatedVisual.generatedAt).toLocaleTimeString()}
                </span>
              </div>

              <div className="relative rounded-lg overflow-hidden border border-[var(--border-main)] bg-[var(--bg-card-sub)] flex items-center justify-center">
                <img
                  src={generatedVisual.imageUrl}
                  alt="AI Generated Visual Setup"
                  className="w-full max-h-[600px] object-contain"
                />
              </div>

              <div className="text-[11px] text-[var(--text-secondary)] font-mono">
                Prompt: {generatedVisual.prompt}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
