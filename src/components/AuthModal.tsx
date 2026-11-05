import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  X,
  User,
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  Zap,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    authModalMode,
    openAuthModal,
    closeAuthModal,
    login,
    signup,
    loginAsDemo,
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup'>(authModalMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync mode when modal opens
  React.useEffect(() => {
    setMode(authModalMode);
    setError(null);
  }, [authModalMode, isAuthModalOpen]);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'signup') {
      if (!name.trim()) {
        setError('Please enter your full name.');
        return;
      }
      if (!email.trim()) {
        setError('Please enter your email address.');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match. Please re-enter.');
        return;
      }

      setLoading(true);
      const res = await signup(name.trim(), email.trim(), password);
      setLoading(false);
      if (!res.success) {
        setError(res.error || 'Failed to create account.');
      }
    } else {
      if (!email.trim() || !password) {
        setError('Please enter both your email and password.');
        return;
      }

      setLoading(true);
      const res = await login(email.trim(), password);
      setLoading(false);
      if (!res.success) {
        setError(res.error || 'Invalid email or password.');
      }
    }
  };

  const handleDemoAccess = async () => {
    setError(null);
    setLoading(true);
    await loginAsDemo();
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 select-none">
      <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl shadow-2xl max-w-md w-full overflow-hidden text-xs flex flex-col transition-colors">
        {/* Header */}
        <div className="p-5 border-b border-[var(--border-main)] flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-base font-bold text-[var(--text-primary)]">
                AUREVIAN ALGO TRADER
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] font-mono font-medium">
                ACCOUNT
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
              {mode === 'login'
                ? 'Sign in to access your quantitative paper portfolio and strategies.'
                : 'Create an account to start paper trading and build custom algorithms.'}
            </p>
          </div>

          <button
            onClick={closeAuthModal}
            className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-sub)] rounded-md transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-[var(--border-main)] bg-[var(--bg-main)]">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`flex-1 py-2.5 text-center font-semibold transition-colors cursor-pointer ${
              mode === 'login'
                ? 'text-[var(--accent-blue)] border-b-2 border-[var(--accent-blue)] bg-[var(--bg-card)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError(null);
            }}
            className={`flex-1 py-2.5 text-center font-semibold transition-colors cursor-pointer ${
              mode === 'signup'
                ? 'text-[var(--accent-blue)] border-b-2 border-[var(--accent-blue)] bg-[var(--bg-card)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Create New Account
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-[var(--color-red)]/10 border border-[var(--color-red)]/30 rounded-lg text-[var(--color-red)] flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'signup' && (
              <div>
                <label className="text-[11px] font-medium text-[var(--text-secondary)] block mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    className="w-full bg-[var(--bg-main)] border border-[var(--border-main)] rounded-lg pl-9 pr-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent-blue)]"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-[11px] font-medium text-[var(--text-secondary)] block mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="trader@example.com"
                  className="w-full bg-[var(--bg-main)] border border-[var(--border-main)] rounded-lg pl-9 pr-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent-blue)]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-[var(--text-secondary)] block mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[var(--bg-main)] border border-[var(--border-main)] rounded-lg pl-9 pr-9 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent-blue)]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {mode === 'signup' && (
              <div>
                <label className="text-[11px] font-medium text-[var(--text-secondary)] block mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[var(--bg-main)] border border-[var(--border-main)] rounded-lg pl-9 pr-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent-blue)]"
                    required
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 py-2.5 bg-[var(--accent-blue)] hover:opacity-90 text-white rounded-lg font-semibold transition-opacity cursor-pointer disabled:opacity-50 mt-2"
            >
              <span>{loading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Create Account'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-[var(--border-main)]"></div>
            <span className="shrink mx-3 text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">
              Or Try Instantly
            </span>
            <div className="flex-grow border-t border-[var(--border-main)]"></div>
          </div>

          {/* Quick Demo Login */}
          <button
            type="button"
            onClick={handleDemoAccess}
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 py-2 bg-[var(--bg-main)] hover:bg-[var(--bg-card-sub)] text-[var(--text-primary)] border border-[var(--border-main)] rounded-lg font-medium transition-colors cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-[var(--accent-purple)]" />
            <span>One-Click Guest Demo Trader Access</span>
          </button>
        </div>

        {/* Footer info */}
        <div className="p-3 bg-[var(--bg-main)] border-t border-[var(--border-main)] text-[10px] text-[var(--text-secondary)] flex items-center justify-between">
          <div className="flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[var(--color-green)]" />
            <span>Zero real funds required · Simulated paper trading only</span>
          </div>
          <span>Sehaj Jatana</span>
        </div>
      </div>
    </div>
  );
};
