import React, { useState, useEffect } from 'react';
import { StrategyRecord } from '../types/trading';
import { api } from '../services/api';
import { Sliders, Plus, Copy, Trash2, Save, ToggleLeft, ToggleRight } from 'lucide-react';

export const CustomStrategyBuilderSection: React.FC = () => {
  const [strategies, setStrategies] = useState<StrategyRecord[]>([]);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [timeframe, setTimeframe] = useState('15m');
  const [logicOperator, setLogicOperator] = useState<'AND' | 'OR'>('AND');
  const [riskPct, setRiskPct] = useState(2.0);
  const [riskToReward, setRiskToReward] = useState(2.0);
  const [atrMultiplier, setAtrMultiplier] = useState(1.5);

  const [longConditions, setLongConditions] = useState<Array<{
    indicator: string;
    operator: string;
    compareWith: string;
    compareTarget?: string;
    value?: number;
    description: string;
  }>>([]);

  const [shortConditions, setShortConditions] = useState<Array<{
    indicator: string;
    operator: string;
    compareWith: string;
    compareTarget?: string;
    value?: number;
    description: string;
  }>>([]);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadStrategies = async () => {
    try {
      const list = await api.getStrategies();
      setStrategies(list);
      if (list.length > 0 && !selectedStrategyId) {
        selectStrategy(list[0]);
      }
    } catch (err) {
      console.error('Failed to load strategies:', err);
    }
  };

  useEffect(() => {
    loadStrategies();
  }, []);

  const selectStrategy = (strat: StrategyRecord) => {
    setSelectedStrategyId(strat.id);
    setIsCreatingNew(false);
    setName(strat.name);
    setDescription(strat.description || '');
    setTimeframe(strat.timeframe || '15m');

    try {
      const cfg = JSON.parse(strat.config_json);
      setLogicOperator(cfg.logicOperator || 'AND');
      setRiskPct(cfg.risk?.riskPercentage || 2.0);
      setRiskToReward(cfg.risk?.riskToReward || 2.0);
      setAtrMultiplier(cfg.risk?.atrMultiplierSL || 1.5);
      setLongConditions(cfg.longConditions || []);
      setShortConditions(cfg.shortConditions || []);
    } catch {
      setLongConditions([]);
      setShortConditions([]);
    }
  };

  const handleStartNew = () => {
    setIsCreatingNew(true);
    setSelectedStrategyId(null);
    setName('New Quantitative Strategy');
    setDescription('Custom rule-based strategy with multi-indicator momentum confirmation.');
    setTimeframe('15m');
    setLogicOperator('AND');
    setRiskPct(2.0);
    setRiskToReward(2.0);
    setAtrMultiplier(1.5);
    setLongConditions([
      {
        indicator: 'RSI',
        operator: 'GREATER_THAN',
        compareWith: 'VALUE',
        value: 50,
        description: 'RSI 14 above 50 (Bullish Momentum)',
      },
      {
        indicator: 'PRICE',
        operator: 'GREATER_THAN',
        compareWith: 'INDICATOR',
        compareTarget: 'EMA_50',
        description: 'Price above EMA 50',
      },
    ]);
    setShortConditions([
      {
        indicator: 'RSI',
        operator: 'LESS_THAN',
        compareWith: 'VALUE',
        value: 50,
        description: 'RSI 14 below 50 (Bearish Momentum)',
      },
      {
        indicator: 'PRICE',
        operator: 'LESS_THAN',
        compareWith: 'INDICATOR',
        compareTarget: 'EMA_50',
        description: 'Price below EMA 50',
      },
    ]);
  };

  const handleAddCondition = (type: 'LONG' | 'SHORT') => {
    const newCond = {
      indicator: 'EMA',
      operator: 'CROSS_ABOVE',
      compareWith: 'INDICATOR',
      compareTarget: 'EMA_200',
      description: 'EMA 20 crosses above EMA 200',
    };
    if (type === 'LONG') {
      setLongConditions([...longConditions, newCond]);
    } else {
      setShortConditions([...shortConditions, newCond]);
    }
  };

  const handleRemoveCondition = (type: 'LONG' | 'SHORT', idx: number) => {
    if (type === 'LONG') {
      setLongConditions(longConditions.filter((_, i) => i !== idx));
    } else {
      setShortConditions(shortConditions.filter((_, i) => i !== idx));
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setMessage(null);

    const config = {
      name,
      entryTimeframe: timeframe,
      logicOperator,
      longConditions,
      shortConditions,
      risk: {
        riskPercentage: riskPct,
        riskToReward,
        atrMultiplierSL: atrMultiplier,
      },
    };

    try {
      if (isCreatingNew) {
        const res = await api.createStrategy({
          name,
          description,
          timeframe,
          config,
        });
        if (res.success) {
          setMessage('Custom strategy created and saved successfully!');
          await loadStrategies();
          setSelectedStrategyId(res.strategyId);
          setIsCreatingNew(false);
        }
      } else if (selectedStrategyId) {
        await api.updateStrategy(selectedStrategyId, {
          name,
          description,
          timeframe,
          config,
        });
        setMessage('Strategy updated successfully!');
        await loadStrategies();
      }
    } catch (err: any) {
      setMessage(`Error saving: ${err.message}`);
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await api.duplicateStrategy(id);
      await loadStrategies();
    } catch (err) {
      console.error('Failed to duplicate:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteStrategy(id);
      setDeletingId(null);
      await loadStrategies();
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const handleToggleEnable = async (strat: StrategyRecord) => {
    try {
      await api.updateStrategy(strat.id, { enabled: strat.enabled === 1 ? 0 : 1 });
      await loadStrategies();
    } catch (err) {
      console.error('Failed to toggle:', err);
    }
  };

  return (
    <div className="p-5 space-y-4 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg shadow-sm">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#2962FF]" />
            Custom Strategy Builder
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Construct and tune custom quantitative trading rules with visual logic blocks, configurable indicators, and risk-to-reward parameters.
          </p>
        </div>

        <button
          onClick={handleStartNew}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#2962FF] hover:bg-[#1e53e5] text-white rounded text-xs font-semibold transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Strategy</span>
        </button>
      </div>

      {message && (
        <div className="p-3 bg-[#089981]/10 border border-[#089981]/30 rounded-lg text-xs text-[#089981] font-medium">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left List of Strategies */}
        <div className="lg:col-span-4 space-y-2">
          <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider px-1">
            Saved Strategies ({strategies.length})
          </div>

          <div className="space-y-2 max-h-[700px] overflow-y-auto custom-scrollbar">
            {strategies.map(strat => {
              const isSelected = selectedStrategyId === strat.id && !isCreatingNew;
              const isBuiltin = strat.is_builtin === 1;
              return (
                <div
                  key={strat.id}
                  onClick={() => selectStrategy(strat)}
                  className={`p-3.5 rounded-lg border cursor-pointer transition-all shadow-xs ${
                    isSelected
                      ? 'bg-[var(--bg-card)] border-[#2962FF] ring-1 ring-[#2962FF]/20'
                      : 'bg-[var(--bg-card)] border-[var(--border-main)] hover:border-[#2962FF]/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-xs text-[var(--text-primary)] truncate pr-2">
                      {strat.name}
                    </div>
                    {isBuiltin ? (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#2962FF]/10 text-[#2962FF] font-mono border border-[#2962FF]/20 font-medium">
                        BUILT-IN
                      </span>
                    ) : (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleToggleEnable(strat);
                        }}
                        title={strat.enabled ? 'Enabled' : 'Disabled'}
                        className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      >
                        {strat.enabled ? (
                          <ToggleRight className="w-4 h-4 text-[#089981]" />
                        ) : (
                          <ToggleLeft className="w-4 h-4 text-[var(--text-secondary)] opacity-50" />
                        )}
                      </button>
                    )}
                  </div>

                  <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2 mt-1">
                    {strat.description || 'No description'}
                  </p>

                  <div className="mt-2.5 pt-2 border-t border-[var(--border-main)] flex items-center justify-between text-[10px] font-mono text-[var(--text-secondary)]">
                    <span>TF: {strat.timeframe}</span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleDuplicate(strat.id);
                        }}
                        title="Duplicate"
                        className="hover:text-[var(--text-primary)]"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      {!isBuiltin && (
                        deletingId === strat.id ? (
                          <div className="flex items-center space-x-1" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => handleDelete(strat.id)}
                              className="px-1.5 py-0.5 bg-[#F23645] text-white text-[10px] rounded font-bold hover:bg-[#d12433]"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeletingId(null)}
                              className="px-1 py-0.5 text-[var(--text-secondary)] text-[10px] hover:text-[var(--text-primary)]"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setDeletingId(strat.id);
                            }}
                            title="Delete"
                            className="hover:text-[#F23645]"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Strategy Form / Builder */}
        <div className="lg:col-span-8 space-y-4 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-main)]">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              {isCreatingNew ? 'Create New Strategy' : `Editing: ${name}`}
            </h3>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#2962FF] hover:bg-[#1e53e5] text-white rounded text-xs font-semibold transition-colors shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Save Strategy'}</span>
            </button>
          </div>

          {/* Basic Config */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-[var(--text-secondary)] font-medium block mb-1">Strategy Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-[var(--bg-card-sub)] border border-[var(--border-main)] rounded px-3 py-1.5 text-[var(--text-primary)] focus:border-[#2962FF] outline-none"
              />
            </div>
            <div>
              <label className="text-[var(--text-secondary)] font-medium block mb-1">Execution Timeframe</label>
              <select
                value={timeframe}
                onChange={e => setTimeframe(e.target.value)}
                className="w-full bg-[var(--bg-card-sub)] border border-[var(--border-main)] rounded px-3 py-1.5 text-[var(--text-primary)] focus:border-[#2962FF] outline-none font-mono"
              >
                {['1m', '5m', '15m', '30m', '1H', '4H', '1D'].map(tf => (
                  <option key={tf} value={tf}>{tf}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-[var(--text-secondary)] font-medium block mb-1">Description</label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full bg-[var(--bg-card-sub)] border border-[var(--border-main)] rounded px-3 py-1.5 text-[var(--text-primary)] focus:border-[#2962FF] outline-none"
              />
            </div>
          </div>

          {/* Logic & Risk Controls */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-[var(--bg-card-sub)] border border-[var(--border-main)] rounded-lg text-xs">
            <div>
              <label className="text-[var(--text-secondary)] font-medium block mb-1">Condition Logic</label>
              <select
                value={logicOperator}
                onChange={e => setLogicOperator(e.target.value as any)}
                className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded px-2.5 py-1 text-[var(--text-primary)]"
              >
                <option value="AND">AND (All conditions)</option>
                <option value="OR">OR (Any condition)</option>
              </select>
            </div>
            <div>
              <label className="text-[var(--text-secondary)] font-medium block mb-1">Risk Per Trade (%)</label>
              <input
                type="number"
                step="0.1"
                min="0.5"
                max="10"
                value={riskPct}
                onChange={e => setRiskPct(parseFloat(e.target.value))}
                className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded px-2.5 py-1 text-[var(--text-primary)] font-mono"
              />
            </div>
            <div>
              <label className="text-[var(--text-secondary)] font-medium block mb-1">Risk-to-Reward</label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="10"
                value={riskToReward}
                onChange={e => setRiskToReward(parseFloat(e.target.value))}
                className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded px-2.5 py-1 text-[var(--text-primary)] font-mono"
              />
            </div>
            <div>
              <label className="text-[var(--text-secondary)] font-medium block mb-1">ATR SL Multiplier</label>
              <input
                type="number"
                step="0.1"
                min="0.5"
                max="5"
                value={atrMultiplier}
                onChange={e => setAtrMultiplier(parseFloat(e.target.value))}
                className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded px-2.5 py-1 text-[var(--text-primary)] font-mono"
              />
            </div>
          </div>

          {/* Long Entry Conditions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-[#089981]">
              <span>LONG ENTRY CONDITIONS ({longConditions.length})</span>
              <button
                onClick={() => handleAddCondition('LONG')}
                className="flex items-center space-x-1 text-[#2962FF] hover:underline"
              >
                <Plus className="w-3.5 h-3.5" /> <span>Add Condition</span>
              </button>
            </div>

            <div className="space-y-2">
              {longConditions.map((cond, idx) => (
                <div key={idx} className="flex flex-wrap items-center gap-2 p-2.5 bg-[var(--bg-card-sub)] border border-[var(--border-main)] rounded-lg text-xs">
                  <select
                    value={cond.indicator}
                    onChange={e => {
                      const updated = [...longConditions];
                      updated[idx].indicator = e.target.value;
                      setLongConditions(updated);
                    }}
                    className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded px-2 py-1 text-[var(--text-primary)]"
                  >
                    <option value="PRICE">Price</option>
                    <option value="RSI">RSI 14</option>
                    <option value="EMA">EMA</option>
                    <option value="SMA">SMA</option>
                    <option value="MACD">MACD Histogram</option>
                    <option value="BOLLINGER">Bollinger Bands</option>
                    <option value="VOLUME">Volume</option>
                    <option value="SMC_BOS">SMC BOS</option>
                    <option value="SMC_CHOCH">SMC CHoCH</option>
                    <option value="SMC_SWEEP">SMC Liquidity Sweep</option>
                  </select>

                  <select
                    value={cond.operator}
                    onChange={e => {
                      const updated = [...longConditions];
                      updated[idx].operator = e.target.value;
                      setLongConditions(updated);
                    }}
                    className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded px-2 py-1 text-[var(--text-primary)]"
                  >
                    <option value="GREATER_THAN">&gt; (Greater Than)</option>
                    <option value="LESS_THAN">&lt; (Less Than)</option>
                    <option value="CROSS_ABOVE">Crosses Above</option>
                    <option value="CROSS_BELOW">Crosses Below</option>
                  </select>

                  <select
                    value={cond.compareWith}
                    onChange={e => {
                      const updated = [...longConditions];
                      updated[idx].compareWith = e.target.value;
                      setLongConditions(updated);
                    }}
                    className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded px-2 py-1 text-[var(--text-primary)]"
                  >
                    <option value="VALUE">Numeric Value</option>
                    <option value="INDICATOR">Indicator / Price</option>
                  </select>

                  {cond.compareWith === 'VALUE' ? (
                    <input
                      type="number"
                      value={cond.value || 0}
                      onChange={e => {
                        const updated = [...longConditions];
                        updated[idx].value = parseFloat(e.target.value);
                        setLongConditions(updated);
                      }}
                      className="w-20 bg-[var(--bg-card)] border border-[var(--border-main)] rounded px-2 py-1 text-[var(--text-primary)] font-mono"
                    />
                  ) : (
                    <select
                      value={cond.compareTarget || 'EMA_50'}
                      onChange={e => {
                        const updated = [...longConditions];
                        updated[idx].compareTarget = e.target.value;
                        setLongConditions(updated);
                      }}
                      className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded px-2 py-1 text-[var(--text-primary)]"
                    >
                      <option value="EMA_50">EMA 50</option>
                      <option value="EMA_200">EMA 200</option>
                      <option value="SMA_20">SMA 20</option>
                      <option value="PRICE">Price</option>
                      <option value="VOL_SMA_20">Volume 20-SMA</option>
                    </select>
                  )}

                  <input
                    type="text"
                    placeholder="Short description"
                    value={cond.description}
                    onChange={e => {
                      const updated = [...longConditions];
                      updated[idx].description = e.target.value;
                      setLongConditions(updated);
                    }}
                    className="flex-1 min-w-[150px] bg-[var(--bg-card)] border border-[var(--border-main)] rounded px-2 py-1 text-[var(--text-secondary)]"
                  />

                  <button
                    onClick={() => handleRemoveCondition('LONG', idx)}
                    className="text-[#F23645] hover:text-[#d12433] p-1"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Short Entry Conditions */}
          <div className="space-y-2 pt-2 border-t border-[var(--border-main)]">
            <div className="flex items-center justify-between text-xs font-semibold text-[#F23645]">
              <span>SHORT ENTRY CONDITIONS ({shortConditions.length})</span>
              <button
                onClick={() => handleAddCondition('SHORT')}
                className="flex items-center space-x-1 text-[#2962FF] hover:underline"
              >
                <Plus className="w-3.5 h-3.5" /> <span>Add Condition</span>
              </button>
            </div>

            <div className="space-y-2">
              {shortConditions.map((cond, idx) => (
                <div key={idx} className="flex flex-wrap items-center gap-2 p-2.5 bg-[var(--bg-card-sub)] border border-[var(--border-main)] rounded-lg text-xs">
                  <select
                    value={cond.indicator}
                    onChange={e => {
                      const updated = [...shortConditions];
                      updated[idx].indicator = e.target.value;
                      setShortConditions(updated);
                    }}
                    className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded px-2 py-1 text-[var(--text-primary)]"
                  >
                    <option value="PRICE">Price</option>
                    <option value="RSI">RSI 14</option>
                    <option value="EMA">EMA</option>
                    <option value="SMA">SMA</option>
                    <option value="MACD">MACD Histogram</option>
                    <option value="BOLLINGER">Bollinger Bands</option>
                    <option value="VOLUME">Volume</option>
                    <option value="SMC_BOS">SMC BOS</option>
                    <option value="SMC_CHOCH">SMC CHoCH</option>
                    <option value="SMC_SWEEP">SMC Liquidity Sweep</option>
                  </select>

                  <select
                    value={cond.operator}
                    onChange={e => {
                      const updated = [...shortConditions];
                      updated[idx].operator = e.target.value;
                      setShortConditions(updated);
                    }}
                    className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded px-2 py-1 text-[var(--text-primary)]"
                  >
                    <option value="LESS_THAN">&lt; (Less Than)</option>
                    <option value="GREATER_THAN">&gt; (Greater Than)</option>
                    <option value="CROSS_BELOW">Crosses Below</option>
                    <option value="CROSS_ABOVE">Crosses Above</option>
                  </select>

                  <select
                    value={cond.compareWith}
                    onChange={e => {
                      const updated = [...shortConditions];
                      updated[idx].compareWith = e.target.value;
                      setShortConditions(updated);
                    }}
                    className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded px-2 py-1 text-[var(--text-primary)]"
                  >
                    <option value="VALUE">Numeric Value</option>
                    <option value="INDICATOR">Indicator / Price</option>
                  </select>

                  {cond.compareWith === 'VALUE' ? (
                    <input
                      type="number"
                      value={cond.value || 0}
                      onChange={e => {
                        const updated = [...shortConditions];
                        updated[idx].value = parseFloat(e.target.value);
                        setShortConditions(updated);
                      }}
                      className="w-20 bg-[var(--bg-card)] border border-[var(--border-main)] rounded px-2 py-1 text-[var(--text-primary)] font-mono"
                    />
                  ) : (
                    <select
                      value={cond.compareTarget || 'EMA_50'}
                      onChange={e => {
                        const updated = [...shortConditions];
                        updated[idx].compareTarget = e.target.value;
                        setShortConditions(updated);
                      }}
                      className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded px-2 py-1 text-[var(--text-primary)]"
                    >
                      <option value="EMA_50">EMA 50</option>
                      <option value="EMA_200">EMA 200</option>
                      <option value="SMA_20">SMA 20</option>
                      <option value="PRICE">Price</option>
                      <option value="VOL_SMA_20">Volume 20-SMA</option>
                    </select>
                  )}

                  <input
                    type="text"
                    placeholder="Short description"
                    value={cond.description}
                    onChange={e => {
                      const updated = [...shortConditions];
                      updated[idx].description = e.target.value;
                      setShortConditions(updated);
                    }}
                    className="flex-1 min-w-[150px] bg-[var(--bg-card)] border border-[var(--border-main)] rounded px-2 py-1 text-[var(--text-secondary)]"
                  />

                  <button
                    onClick={() => handleRemoveCondition('SHORT', idx)}
                    className="text-[#F23645] hover:text-[#d12433] p-1"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
