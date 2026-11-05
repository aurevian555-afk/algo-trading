import React, { useState, useEffect } from 'react';
import { InstrumentInfo, StrategyRecord, DeltaAccountInfo } from '../types/trading';
import { api } from '../services/api';
import {
  Settings as SettingsIcon,
  Download,
  Trash2,
  AlertTriangle,
  ShieldCheck,
  Save,
  Check,
  Sun,
  Moon,
  Sparkles,
  Palette,
  Link2,
  Unlink,
  Lock,
  Wallet,
  CheckCircle2,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface Props {
  tickers: InstrumentInfo[];
}

export const SettingsSection: React.FC<Props> = ({ tickers }) => {
  const { theme, setTheme } = useTheme();

  const [settings, setSettings] = useState<any>({
    default_pair: 'ETHUSD',
    default_timeframe: '15m',
    default_strategy: 'aurevian-smc-momentum',
    ai_model: 'gemini-3.1-flash-lite',
  });
  const [strategies, setStrategies] = useState<StrategyRecord[]>([]);

  // Delta Exchange Account Connection State
  const [deltaAccount, setDeltaAccount] = useState<DeltaAccountInfo | null>(null);
  const [deltaApiKey, setDeltaApiKey] = useState('');
  const [deltaApiSecret, setDeltaApiSecret] = useState('');
  const [deltaEnv, setDeltaEnv] = useState<'india' | 'global'>('india');
  const [deltaConnecting, setDeltaConnecting] = useState(false);
  const [deltaError, setDeltaError] = useState<string | null>(null);
  const [deltaSuccessMsg, setDeltaSuccessMsg] = useState<string | null>(null);

  // Confirmation modal state
  const [showResetModal, setShowResetModal] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    api.getSettings().then(res => {
      if (res) {
        setSettings((prev: any) => ({ ...prev, ...res }));
      }
    });
    api.getStrategies().then(strats => {
      setStrategies(strats);
    });
    fetchDeltaStatus();
  }, []);

  const fetchDeltaStatus = async () => {
    try {
      const res = await api.getDeltaAccount();
      if (res?.account) {
        setDeltaAccount(res.account);
      }
    } catch {}
  };

  const handleConnectDelta = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setDeltaConnecting(true);
    setDeltaError(null);
    setDeltaSuccessMsg(null);

    try {
      const res = await api.connectDeltaAccount({
        apiKey: deltaApiKey,
        apiSecret: deltaApiSecret,
        environment: deltaEnv,
      });

      if (res.success && res.account) {
        setDeltaAccount(res.account);
        setDeltaApiKey('');
        setDeltaApiSecret('');
        setDeltaSuccessMsg('Delta Exchange account verified and connected in READ-ONLY mode.');
        setTimeout(() => setDeltaSuccessMsg(null), 4000);
      } else {
        setDeltaError(res.error || 'Failed to authenticate read-only API credentials on Delta Exchange.');
      }
    } catch (err: any) {
      setDeltaError(err.message || 'Network error communicating with Delta Exchange.');
    } finally {
      setDeltaConnecting(false);
    }
  };

  const handleDisconnectDelta = async () => {
    try {
      await api.disconnectDeltaAccount();
      await fetchDeltaStatus();
      setDeltaSuccessMsg('Delta Exchange account credentials successfully disconnected and removed.');
      setTimeout(() => setDeltaSuccessMsg(null), 3000);
    } catch (err: any) {
      setDeltaError(`Disconnect error: ${err.message}`);
    }
  };

  const handleUseDemoCredentials = () => {
    setDeltaApiKey('demo_dlt_readonly_key_77a2');
    setDeltaApiSecret('demo_dlt_readonly_secret_99b3');
    setDeltaEnv('india');
  };

  const handleSavePreferences = async () => {
    setSaving(true);
    try {
      await api.saveSettings({ ...settings, theme });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleExportBackup = () => {
    const link = document.createElement('a');
    link.href = '/api/data/export';
    link.download = `aurevian_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExecuteReset = async () => {
    if (confirmInput !== 'RESET_AUREVIAN_DATA') {
      return;
    }

    setResetting(true);
    try {
      handleExportBackup();

      const res = await api.resetData(confirmInput);
      if (res.success) {
        setResetMessage(res.message);
        setShowResetModal(false);
        setConfirmInput('');
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    } catch (err: any) {
      setResetMessage(`Error during reset: ${err.message}`);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="p-5 space-y-4 max-w-7xl mx-auto transition-colors">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg shadow-xs">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-[var(--accent-blue)]" />
            Application Settings & Exchange Integrations
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Delta Exchange read-only account connection, theme preferences, AI intelligence model, and market-data audits.
          </p>
        </div>

        <button
          onClick={handleExportBackup}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-[var(--bg-card-sub)] hover:border-[var(--accent-blue)] border border-[var(--border-main)] rounded text-[var(--text-primary)] text-xs font-medium transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-[var(--accent-blue)]" />
          <span>Export Complete Backup (JSON)</span>
        </button>
      </div>

      {resetMessage && (
        <div className="p-3 bg-[var(--color-green)]/10 border border-[var(--color-green)]/30 rounded-lg text-xs text-[var(--color-green)] font-medium">
          {resetMessage}
        </div>
      )}

      {/* Row 1: Delta Exchange Read-Only Account Connection Card */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg shadow-xs p-4 space-y-4 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--border-main)]">
          <div className="flex items-center space-x-2">
            <Link2 className="w-4 h-4 text-[var(--accent-blue)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Delta Exchange Account Connection (Read-Only)
            </h3>
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${
              deltaAccount?.isConnected
                ? 'bg-[var(--color-green)]/10 text-[var(--color-green)] border-[var(--color-green)]/30'
                : 'bg-[var(--bg-card-sub)] text-[var(--text-secondary)] border-[var(--border-main)]'
            }`}>
              {deltaAccount?.isConnected ? 'READ-ONLY ACTIVE' : 'DISCONNECTED'}
            </span>
          </div>

          <div className="flex items-center space-x-1.5 text-[11px] text-[var(--text-secondary)]">
            <Lock className="w-3.5 h-3.5 text-[var(--color-green)]" />
            <span>Withdrawals Disabled • Zero Order Placement Rights</span>
          </div>
        </div>

        {/* Security Boundary Notice */}
        <div className="p-3 bg-[var(--bg-card-sub)] border border-[var(--border-main)] rounded-lg text-[11px] text-[var(--text-secondary)] space-y-1">
          <div className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[var(--color-green)] shrink-0" />
            <span>Strict Read-Only Architecture Protocol</span>
          </div>
          <p className="leading-relaxed">
            Aurevian operates on genuine Delta Exchange India market data. Connecting your account allows read-only synchronization of portfolio balances. API credentials are stored securely on your local backend and never exposed in frontend code. Aurevian never requests, accepts, or supports withdrawal or live order placement permissions.
          </p>
        </div>

        {deltaError && (
          <div className="p-3 bg-[var(--color-red)]/10 border border-[var(--color-red)]/30 rounded-lg text-xs text-[var(--color-red)] font-medium">
            {deltaError}
          </div>
        )}

        {deltaSuccessMsg && (
          <div className="p-3 bg-[var(--color-green)]/10 border border-[var(--color-green)]/30 rounded-lg text-xs text-[var(--color-green)] font-medium">
            {deltaSuccessMsg}
          </div>
        )}

        {/* Connected View vs Connection Form */}
        {deltaAccount?.isConnected ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 bg-[var(--bg-card-sub)] border border-[var(--border-main)] rounded-lg">
                <div className="text-[10px] text-[var(--text-secondary)] uppercase font-mono">Masked API Key</div>
                <div className="font-mono font-semibold text-[var(--text-primary)] text-sm mt-0.5">
                  {deltaAccount.maskedKey}
                </div>
                <div className="text-[10px] text-[var(--color-green)] mt-1 font-mono">
                  HMAC-SHA256 Authenticated
                </div>
              </div>

              <div className="p-3 bg-[var(--bg-card-sub)] border border-[var(--border-main)] rounded-lg">
                <div className="text-[10px] text-[var(--text-secondary)] uppercase font-mono">Exchange Endpoint</div>
                <div className="font-mono font-semibold text-[var(--text-primary)] text-sm mt-0.5 capitalize">
                  Delta Exchange {deltaAccount.environment}
                </div>
                <div className="text-[10px] text-[var(--text-secondary)] mt-1 font-mono">
                  api.{deltaAccount.environment}.delta.exchange
                </div>
              </div>

              <div className="p-3 bg-[var(--bg-card-sub)] border border-[var(--border-main)] rounded-lg">
                <div className="text-[10px] text-[var(--text-secondary)] uppercase font-mono">Connection Timestamp</div>
                <div className="font-mono font-semibold text-[var(--text-primary)] text-sm mt-0.5">
                  {deltaAccount.connectedAt ? new Date(deltaAccount.connectedAt).toLocaleDateString() : 'Active'}
                </div>
                <div className="text-[10px] text-[var(--text-secondary)] mt-1 font-mono">
                  {deltaAccount.connectedAt ? new Date(deltaAccount.connectedAt).toLocaleTimeString() : ''}
                </div>
              </div>
            </div>

            {/* Read-Only Permissions List */}
            <div className="p-3 bg-[var(--bg-card-sub)] border border-[var(--border-main)] rounded-lg space-y-2">
              <div className="font-semibold text-[var(--text-primary)] text-xs">
                Verified Read-Only Capabilities:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-mono text-[var(--text-secondary)]">
                <div className="flex items-center space-x-1.5 text-[var(--color-green)]">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>READ_ONLY_BALANCES</span>
                </div>
                <div className="flex items-center space-x-1.5 text-[var(--color-green)]">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>READ_ONLY_POSITIONS</span>
                </div>
                <div className="flex items-center space-x-1.5 text-[var(--color-green)]">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>WITHDRAWALS_BLOCKED</span>
                </div>
              </div>
            </div>

            {/* Wallet Balances if returned */}
            {deltaAccount.balances && deltaAccount.balances.length > 0 && (
              <div className="p-3 bg-[var(--bg-card-sub)] border border-[var(--border-main)] rounded-lg space-y-2">
                <div className="font-semibold text-[var(--text-primary)] text-xs flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-[var(--accent-blue)]" />
                  <span>Synchronized Exchange Wallet Balances (Read-Only):</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {deltaAccount.balances.map(b => (
                    <div key={b.asset} className="px-3 py-1.5 bg-[var(--bg-card)] border border-[var(--border-main)] rounded font-mono text-xs">
                      <span className="text-[var(--text-secondary)]">{b.asset}: </span>
                      <strong className="text-[var(--text-primary)]">{b.available_balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-1">
              <button
                onClick={handleDisconnectDelta}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-[var(--color-red)]/10 hover:bg-[var(--color-red)]/20 text-[var(--color-red)] border border-[var(--color-red)]/30 rounded font-semibold transition-colors cursor-pointer"
              >
                <Unlink className="w-3.5 h-3.5" />
                <span>Disconnect Delta Account</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleConnectDelta} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[var(--text-secondary)] font-medium block mb-1">
                  Delta Exchange API Key (Read-Only)
                </label>
                <input
                  type="text"
                  value={deltaApiKey}
                  onChange={e => setDeltaApiKey(e.target.value)}
                  placeholder="e.g. dlt_live_key_982b1c4..."
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded px-3 py-1.5 text-[var(--text-primary)] font-mono outline-none focus:border-[var(--accent-blue)]"
                  required
                />
              </div>

              <div>
                <label className="text-[var(--text-secondary)] font-medium block mb-1">
                  Delta Exchange API Secret
                </label>
                <input
                  type="password"
                  value={deltaApiSecret}
                  onChange={e => setDeltaApiSecret(e.target.value)}
                  placeholder="••••••••••••••••••••••••••••••••"
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded px-3 py-1.5 text-[var(--text-primary)] font-mono outline-none focus:border-[var(--accent-blue)]"
                  required
                />
              </div>

              <div>
                <label className="text-[var(--text-secondary)] font-medium block mb-1">
                  Exchange Region
                </label>
                <select
                  value={deltaEnv}
                  onChange={e => setDeltaEnv(e.target.value as any)}
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded px-3 py-1.5 text-[var(--text-primary)] font-mono outline-none"
                >
                  <option value="india">Delta Exchange India (api.india.delta.exchange) — Recommended</option>
                  <option value="global">Delta Exchange Global (api.delta.exchange)</option>
                </select>
              </div>

              <div className="flex items-end justify-between gap-2">
                <button
                  type="button"
                  onClick={handleUseDemoCredentials}
                  className="text-[11px] text-[var(--accent-blue)] hover:underline cursor-pointer pb-1.5"
                >
                  Fill Demo Credentials
                </button>
                <button
                  type="submit"
                  disabled={deltaConnecting || !deltaApiKey || !deltaApiSecret}
                  className="flex items-center space-x-1.5 px-4 py-1.5 bg-[var(--accent-blue)] hover:opacity-90 text-white rounded font-semibold transition-colors disabled:opacity-50 shadow-xs cursor-pointer"
                >
                  <Link2 className={`w-3.5 h-3.5 ${deltaConnecting ? 'animate-spin' : ''}`} />
                  <span>{deltaConnecting ? 'Verifying Read-Only...' : 'Connect Read-Only Account'}</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Row 2: Appearance Theme Switcher */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg shadow-xs p-4 space-y-4 text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-main)]">
          <div className="flex items-center space-x-2">
            <Palette className="w-4 h-4 text-[var(--accent-blue)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Interface Theme Mode</h3>
          </div>
          <span className="text-[11px] font-mono text-[var(--text-secondary)]">
            Active: <strong className="text-[var(--text-primary)] capitalize">{theme} Theme</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Dark Theme Card */}
          <div
            onClick={() => setTheme('dark')}
            className={`p-4 rounded-lg border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
              theme === 'dark'
                ? 'border-[#398BFF] bg-[#101010] shadow-md ring-1 ring-[#398BFF]'
                : 'border-[var(--border-main)] bg-[var(--bg-card-sub)] opacity-75 hover:opacity-100 hover:border-[var(--border-sub)]'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-full bg-[#151515] border border-[#292929] flex items-center justify-center">
                    <Moon className="w-3.5 h-3.5 text-[#398BFF]" />
                  </div>
                  <span className="text-sm font-semibold text-white">Dark Theme</span>
                </div>
                {theme === 'dark' && (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-[#398BFF]/20 text-[#398BFF] font-semibold border border-[#398BFF]/40 font-mono">
                    ACTIVE
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#A0A0A0] leading-relaxed mb-3">
                High-contrast deep financial terminal palette. Minimizes eye fatigue in dark environments.
              </p>
            </div>

            {/* Color Swatches */}
            <div className="space-y-1.5 pt-2 border-t border-[#292929]">
              <div className="text-[10px] font-mono text-[#A0A0A0]">Palette Matrix:</div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-[#050505] border border-[#292929]" title="Background #050505" />
                <span className="w-5 h-5 rounded bg-[#101010] border border-[#292929]" title="Sidebar #101010" />
                <span className="w-5 h-5 rounded bg-[#151515] border border-[#292929]" title="Cards #151515" />
                <span className="w-5 h-5 rounded bg-[#398BFF]" title="Accent Blue #398BFF" />
                <span className="w-5 h-5 rounded bg-[#9065E8]" title="Accent Purple #9065E8" />
                <span className="w-5 h-5 rounded bg-[#36B87A]" title="Success Green #36B87A" />
              </div>
            </div>
          </div>

          {/* Light Theme Card */}
          <div
            onClick={() => setTheme('light')}
            className={`p-4 rounded-lg border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
              theme === 'light'
                ? 'border-[#2962FF] bg-[#FFFFFF] shadow-md ring-1 ring-[#2962FF]'
                : 'border-[var(--border-main)] bg-[var(--bg-card-sub)] opacity-75 hover:opacity-100 hover:border-[var(--border-sub)]'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-full bg-[#F5F6F8] border border-[#E5E7EB] flex items-center justify-center">
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <span className="text-sm font-semibold text-[#20242B]">Light Theme (Classic)</span>
                </div>
                {theme === 'light' && (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-[#2962FF]/15 text-[#2962FF] font-semibold border border-[#2962FF]/30 font-mono">
                    ACTIVE
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#737B87] leading-relaxed mb-3">
                Clean, crisp institutional daylight appearance. Maximum clarity for boardroom presentations and daytime trading.
              </p>
            </div>

            {/* Color Swatches */}
            <div className="space-y-1.5 pt-2 border-t border-[#E5E7EB]">
              <div className="text-[10px] font-mono text-[#737B87]">Palette Matrix:</div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-[#F5F6F8] border border-[#E5E7EB]" title="Background #F5F6F8" />
                <span className="w-5 h-5 rounded bg-[#FFFFFF] border border-[#E5E7EB]" title="Sidebar / Cards #FFFFFF" />
                <span className="w-5 h-5 rounded bg-[#2962FF]" title="Accent Blue #2962FF" />
                <span className="w-5 h-5 rounded bg-[#9065E8]" title="Accent Purple #9065E8" />
                <span className="w-5 h-5 rounded bg-[#089981]" title="Success Green #089981" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: General Preferences & AI Model */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg shadow-xs p-4 space-y-4 text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-main)]">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">System Default Preferences</h3>
            <button
              onClick={handleSavePreferences}
              disabled={saving}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-[var(--accent-blue)] hover:opacity-90 text-white rounded text-xs font-semibold transition-colors shadow-xs cursor-pointer"
            >
              {savedSuccess ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              <span>{savedSuccess ? 'Saved!' : saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[var(--text-secondary)] font-medium block mb-1">Default Trading Pair</label>
              <select
                value={settings.default_pair}
                onChange={e => setSettings({ ...settings, default_pair: e.target.value })}
                className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded px-3 py-1.5 text-[var(--text-primary)] font-mono outline-none"
              >
                <option value="ETHUSD">ETHUSD (Ethereum Perpetual)</option>
                <option value="BTCUSD.P">BTCUSD.P (Bitcoin Perpetual)</option>
                <option value="PAXGUSD.P">PAXGUSD.P (PAX Gold Perp)</option>
              </select>
            </div>

            <div>
              <label className="text-[var(--text-secondary)] font-medium block mb-1">Default Chart Timeframe</label>
              <select
                value={settings.default_timeframe}
                onChange={e => setSettings({ ...settings, default_timeframe: e.target.value })}
                className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded px-3 py-1.5 text-[var(--text-primary)] font-mono outline-none"
              >
                {['1m', '5m', '15m', '30m', '1H', '4H', '1D'].map(tf => (
                  <option key={tf} value={tf}>{tf}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[var(--text-secondary)] font-medium block mb-1">Default Algorithmic Strategy</label>
              <select
                value={settings.default_strategy}
                onChange={e => setSettings({ ...settings, default_strategy: e.target.value })}
                className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded px-3 py-1.5 text-[var(--text-primary)] outline-none"
              >
                {strategies.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* AI Model Preference */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[var(--text-secondary)] font-medium flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[var(--accent-purple)]" />
                  <span>Default Gemini AI Intelligence Model</span>
                </label>
              </div>
              <select
                value={settings.ai_model || 'gemini-3.1-flash-lite'}
                onChange={e => setSettings({ ...settings, ai_model: e.target.value })}
                className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded px-3 py-1.5 text-[var(--text-primary)] font-mono outline-none"
              >
                <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Recommended • High Availability & Low Latency)</option>
                <option value="gemini-3.8-flash">gemini-3.8-flash (Standard Free Tier • Subject to Traffic Spikes)</option>
                <option value="gemini-4-argon">gemini-4-argon (Deep Thinking Level High • Requires Paid Billing)</option>
              </select>
              <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                gemini-3.1-flash-lite provides reliable high-availability quantitative analysis and automatic fallback.
              </p>
            </div>
          </div>
        </div>

        {/* Right: Market Data Connection & Delta Exchange Transparency */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg shadow-xs p-4 space-y-3 text-xs">
          <div className="flex items-center space-x-2 pb-3 border-b border-[var(--border-main)]">
            <ShieldCheck className="w-4 h-4 text-[var(--color-green)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Delta Exchange Market Data Audit
            </h3>
          </div>

          <div className="space-y-2.5">
            {tickers.map(t => (
              <div key={t.pair} className="p-3 bg-[var(--bg-card-sub)] border border-[var(--border-main)] rounded-lg">
                <div className="flex items-center justify-between font-mono">
                  <span className="font-semibold text-[var(--text-primary)]">{t.pair}</span>
                  <span className="text-[var(--color-green)] flex items-center gap-1 text-[11px] font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-green)] animate-pulse" />
                    {t.connectionStatus}
                  </span>
                </div>
                <div className="text-[11px] text-[var(--text-secondary)] mt-1 font-medium">
                  Source: {t.provider} (Symbol: {t.providerSymbol})
                </div>
                <div className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">
                  Type: {t.type} | Decimals: {t.priceDecimals} | Bid: ${t.bid.toFixed(t.priceDecimals)} | Ask: ${t.ask.toFixed(t.priceDecimals)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Danger Zone: Factory Data Reset */}
      <div className="p-4 bg-[var(--bg-card)] border border-[var(--color-red)]/30 rounded-lg shadow-xs space-y-3 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-[var(--color-red)]">
            <Trash2 className="w-4 h-4" />
            <h3 className="text-sm font-semibold">Factory Data Reset</h3>
          </div>
          <button
            onClick={() => setShowResetModal(true)}
            className="px-3 py-1.5 bg-[var(--color-red)]/10 hover:bg-[var(--color-red)]/20 text-[var(--color-red)] border border-[var(--color-red)]/30 rounded font-semibold transition-colors cursor-pointer"
          >
            Reset All Trading Data
          </button>
        </div>

        <p className="text-[var(--text-secondary)] leading-relaxed">
          Clears all open paper positions, trade history, backtest results, and custom strategies. Restores account equity to $10,000.00 and 2% default risk. Creates an automatic exportable backup prior to resetting. Application source code and database structure remain intact.
        </p>
      </div>

      {/* Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl shadow-xl max-w-md w-full p-5 space-y-4 text-xs">
            <div className="flex items-center space-x-2 text-[var(--color-red)]">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-semibold">Confirm Full System Data Reset</h3>
            </div>

            <p className="text-[var(--text-secondary)] leading-relaxed">
              This action will irreversibly clear your paper-trading history and restore your account to clean factory settings. An automatic JSON backup will download to your device immediately before reset.
            </p>

            <div>
              <label className="text-[var(--text-secondary)] block mb-1">
                Type <strong className="text-[var(--text-primary)] font-mono">RESET_AUREVIAN_DATA</strong> below to confirm:
              </label>
              <input
                type="text"
                value={confirmInput}
                onChange={e => setConfirmInput(e.target.value)}
                placeholder="RESET_AUREVIAN_DATA"
                className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded px-3 py-2 text-[var(--text-primary)] font-mono outline-none focus:border-[var(--color-red)]"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[var(--border-main)]">
              <button
                onClick={() => setShowResetModal(false)}
                className="px-3 py-1.5 bg-[var(--bg-card-sub)] hover:border-[var(--border-sub)] text-[var(--text-secondary)] border border-[var(--border-main)] rounded font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteReset}
                disabled={confirmInput !== 'RESET_AUREVIAN_DATA' || resetting}
                className="px-3 py-1.5 bg-[var(--color-red)] hover:opacity-90 text-white rounded font-semibold disabled:opacity-50 cursor-pointer"
              >
                {resetting ? 'Resetting...' : 'Confirm & Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
