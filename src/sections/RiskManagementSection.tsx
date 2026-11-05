import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ShieldAlert, Calculator, Check, Save } from 'lucide-react';

export const RiskManagementSection: React.FC = () => {
  const [settings, setSettings] = useState<any>({
    virtual_balance: 10000.0,
    risk_per_trade: 2.0,
    risk_to_reward: 2.0,
    daily_loss_limit: 5.0,
    max_drawdown: 15.0,
    max_open_positions: 1,
    max_consecutive_losses: 3,
    trading_fee_pct: 0.05,
    slippage_pct: 0.02,
  });

  // Position Sizing Calculator state
  const [calcEquity, setCalcEquity] = useState(10000);
  const [calcRiskPct, setCalcRiskPct] = useState(2.0);
  const [calcEntryPrice, setCalcEntryPrice] = useState(2500);
  const [calcSlPrice, setCalcSlPrice] = useState(2450);

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    api.getSettings().then(res => {
      if (res) {
        setSettings((prev: any) => ({ ...prev, ...res }));
        if (res.virtual_balance) setCalcEquity(res.virtual_balance);
        if (res.risk_per_trade) setCalcRiskPct(res.risk_per_trade);
      }
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.saveSettings(settings);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const calcRiskAmount = calcEquity * (calcRiskPct / 100);
  const calcStopDistance = Math.abs(calcEntryPrice - calcSlPrice);
  const calcPositionUnits = calcStopDistance > 0 ? calcRiskAmount / calcStopDistance : 0;
  const calcTotalValue = calcPositionUnits * calcEntryPrice;

  return (
    <div className="p-5 space-y-4 max-w-7xl mx-auto">
      {/* Disclaimer Card */}
      <div className="p-4 bg-[var(--bg-card)] border border-[#F23645]/30 rounded-lg shadow-sm text-xs flex items-start space-x-3">
        <ShieldAlert className="w-5 h-5 text-[#F23645] shrink-0 mt-0.5" />
        <div>
          <strong className="text-[var(--text-primary)]">Mandatory Risk Safeguard:</strong> This application executes strictly virtual paper trades in simulated memory. The risk rules and capital configurations configured below enforce algorithmic position sizing on virtual equity only and will never authorize real-money trading or require private broker credentials.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Global Account Risk Controls */}
        <div className="lg:col-span-7 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg shadow-sm p-4 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-main)]">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#2962FF]" />
              Account Risk Parameters
            </h3>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#2962FF] hover:bg-[#1e53e5] text-white rounded text-xs font-semibold transition-colors shadow-xs"
            >
              {savedSuccess ? <Check className="w-3.5 h-3.5 text-white" /> : <Save className="w-3.5 h-3.5" />}
              <span>{savedSuccess ? 'Saved!' : saving ? 'Saving...' : 'Save Parameters'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-[var(--text-secondary)] font-medium block mb-1">Virtual Account Capital ($)</label>
              <input
                type="number"
                value={settings.virtual_balance}
                onChange={e => setSettings({ ...settings, virtual_balance: parseFloat(e.target.value) })}
                className="w-full bg-[var(--bg-card-sub)] border border-[var(--border-main)] rounded px-3 py-1.5 text-[var(--text-primary)] font-mono outline-none"
              />
              <span className="text-[10px] text-[var(--text-secondary)]">Default: $10,000.00</span>
            </div>

            <div>
              <label className="text-[var(--text-secondary)] font-medium block mb-1">Risk Per Trade (%)</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="10"
                value={settings.risk_per_trade}
                onChange={e => setSettings({ ...settings, risk_per_trade: parseFloat(e.target.value) })}
                className="w-full bg-[var(--bg-card-sub)] border border-[var(--border-main)] rounded px-3 py-1.5 text-[var(--text-primary)] font-mono outline-none"
              />
              <span className="text-[10px] text-[var(--text-secondary)]">Default: 2.0%</span>
            </div>

            <div>
              <label className="text-[var(--text-secondary)] font-medium block mb-1">Default Risk-to-Reward</label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="10"
                value={settings.risk_to_reward}
                onChange={e => setSettings({ ...settings, risk_to_reward: parseFloat(e.target.value) })}
                className="w-full bg-[var(--bg-card-sub)] border border-[var(--border-main)] rounded px-3 py-1.5 text-[var(--text-primary)] font-mono outline-none"
              />
              <span className="text-[10px] text-[var(--text-secondary)]">Default: 1:2.0</span>
            </div>

            <div>
              <label className="text-[var(--text-secondary)] font-medium block mb-1">Max Open Positions</label>
              <input
                type="number"
                min="1"
                max="5"
                value={settings.max_open_positions}
                onChange={e => setSettings({ ...settings, max_open_positions: parseInt(e.target.value) })}
                className="w-full bg-[var(--bg-card-sub)] border border-[var(--border-main)] rounded px-3 py-1.5 text-[var(--text-primary)] font-mono outline-none"
              />
              <span className="text-[10px] text-[var(--text-secondary)]">Default: 1 position</span>
            </div>

            <div>
              <label className="text-[var(--text-secondary)] font-medium block mb-1">Daily Loss Limit (%)</label>
              <input
                type="number"
                step="0.5"
                value={settings.daily_loss_limit}
                onChange={e => setSettings({ ...settings, daily_loss_limit: parseFloat(e.target.value) })}
                className="w-full bg-[var(--bg-card-sub)] border border-[var(--border-main)] rounded px-3 py-1.5 text-[var(--text-primary)] font-mono outline-none"
              />
              <span className="text-[10px] text-[var(--text-secondary)]">Halt trades if daily loss hit</span>
            </div>

            <div>
              <label className="text-[var(--text-secondary)] font-medium block mb-1">Max Drawdown Limit (%)</label>
              <input
                type="number"
                step="0.5"
                value={settings.max_drawdown}
                onChange={e => setSettings({ ...settings, max_drawdown: parseFloat(e.target.value) })}
                className="w-full bg-[var(--bg-card-sub)] border border-[var(--border-main)] rounded px-3 py-1.5 text-[var(--text-primary)] font-mono outline-none"
              />
              <span className="text-[10px] text-[var(--text-secondary)]">Halt bot if max drawdown breached</span>
            </div>

            <div>
              <label className="text-[var(--text-secondary)] font-medium block mb-1">Exchange Fee Rate (%)</label>
              <input
                type="number"
                step="0.01"
                value={settings.trading_fee_pct}
                onChange={e => setSettings({ ...settings, trading_fee_pct: parseFloat(e.target.value) })}
                className="w-full bg-[var(--bg-card-sub)] border border-[var(--border-main)] rounded px-3 py-1.5 text-[var(--text-primary)] font-mono outline-none"
              />
              <span className="text-[10px] text-[var(--text-secondary)]">Deducted per fill (0.05% default)</span>
            </div>

            <div>
              <label className="text-[var(--text-secondary)] font-medium block mb-1">Execution Slippage (%)</label>
              <input
                type="number"
                step="0.01"
                value={settings.slippage_pct}
                onChange={e => setSettings({ ...settings, slippage_pct: parseFloat(e.target.value) })}
                className="w-full bg-[var(--bg-card-sub)] border border-[var(--border-main)] rounded px-3 py-1.5 text-[var(--text-primary)] font-mono outline-none"
              />
              <span className="text-[10px] text-[var(--text-secondary)]">Simulated fill variance (0.02% default)</span>
            </div>
          </div>
        </div>

        {/* Right: Interactive Position Sizing Engine Calculator */}
        <div className="lg:col-span-5 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg shadow-sm p-4 space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-[var(--border-main)]">
            <Calculator className="w-4 h-4 text-[#2962FF]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Position Sizing Calculator
            </h3>
          </div>

          <p className="text-xs text-[var(--text-secondary)]">
            Demonstrates how Aurevian Algo Trader computes exact order quantities from account equity, risk percentage, and ATR/structural stop loss distance.
          </p>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-[var(--text-secondary)] font-medium block mb-1">Account Equity ($)</label>
              <input
                type="number"
                value={calcEquity}
                onChange={e => setCalcEquity(parseFloat(e.target.value))}
                className="w-full bg-[var(--bg-card-sub)] border border-[var(--border-main)] rounded px-3 py-1.5 text-[var(--text-primary)] font-mono outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[var(--text-secondary)] font-medium block mb-1">Risk %</label>
                <input
                  type="number"
                  step="0.1"
                  value={calcRiskPct}
                  onChange={e => setCalcRiskPct(parseFloat(e.target.value))}
                  className="w-full bg-[var(--bg-card-sub)] border border-[var(--border-main)] rounded px-3 py-1.5 text-[var(--text-primary)] font-mono outline-none"
                />
              </div>
              <div>
                <label className="text-[var(--text-secondary)] font-medium block mb-1">Max Risk ($)</label>
                <div className="px-3 py-1.5 bg-[var(--bg-card-sub)] border border-[var(--border-main)] rounded font-mono font-semibold text-[#F23645]">
                  ${calcRiskAmount.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[var(--text-secondary)] font-medium block mb-1">Entry Price ($)</label>
                <input
                  type="number"
                  value={calcEntryPrice}
                  onChange={e => setCalcEntryPrice(parseFloat(e.target.value))}
                  className="w-full bg-[var(--bg-card-sub)] border border-[var(--border-main)] rounded px-3 py-1.5 text-[var(--text-primary)] font-mono outline-none"
                />
              </div>
              <div>
                <label className="text-[var(--text-secondary)] font-medium block mb-1">Stop Loss ($)</label>
                <input
                  type="number"
                  value={calcSlPrice}
                  onChange={e => setCalcSlPrice(parseFloat(e.target.value))}
                  className="w-full bg-[var(--bg-card-sub)] border border-[var(--border-main)] rounded px-3 py-1.5 text-[var(--text-primary)] font-mono outline-none"
                />
              </div>
            </div>

            {/* Sizing Output Box */}
            <div className="p-3.5 bg-[var(--bg-card-sub)] border border-[var(--border-main)] rounded-lg space-y-2 mt-4 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">SL Distance:</span>
                <span className="text-[var(--text-primary)] font-semibold">${calcStopDistance.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Recommended Size:</span>
                <span className="text-[#089981] font-bold">{calcPositionUnits.toFixed(4)} Units</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Total Position Value:</span>
                <span className="text-[#2962FF] font-bold">${calcTotalValue.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
