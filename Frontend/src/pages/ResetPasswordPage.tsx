import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Cpu, ArrowLeft, KeyRound, AlertCircle, Loader2, CheckCircle2, Eye, EyeOff, Check } from 'lucide-react';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { api } from '../services/api';

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const hasLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const passwordsMatch = password && password === confirmPassword;

  const validate = (): boolean => {
    if (!token) {
      setError('Missing or invalid reset token. Please request a new password reset link.');
      return false;
    }
    if (!hasLength) {
      setError('Password must be at least 8 characters long.');
      return false;
    }
    if (!hasUpper) {
      setError('Password must contain at least one uppercase letter.');
      return false;
    }
    if (!hasDigit) {
      setError('Password must contain at least one digit.');
      return false;
    }
    if (!passwordsMatch) {
      setError('Passwords do not match.');
      return false;
    }
    setError(undefined);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || isSubmitting) return;

    setIsSubmitting(true);
    setError(undefined);

    try {
      await api.post('/auth/reset-password', {
        token,
        new_password: password,
      });

      setIsSuccess(true);
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2500);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to reset password. The link may have expired.';
      setError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans selection:bg-cyan-500/25 selection:text-cyan-200">
      {/* Background Ambience */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-radial-gradient opacity-60 pointer-events-none z-0" />
      <div className="absolute inset-0 bg-dev-grid opacity-15 pointer-events-none z-0" />

      {/* Top Header Bar */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-cyan-400 transition-colors rounded px-2 py-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Sign In</span>
        </Link>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link to="/" className="flex items-center gap-2 text-sm font-bold text-white group">
            <div className="w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-800/80 flex items-center justify-center text-cyan-400 group-hover:border-cyan-400 transition-colors shadow-sm">
              <Cpu className="w-3.5 h-3.5" />
            </div>
            <span>
              TestForge{' '}
              <span className="text-cyan-400 font-mono text-xs px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/60">
                AI
              </span>
            </span>
          </Link>
        </div>
      </header>

      {/* Main Reset Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md rounded-3xl bg-[#090d16]/95 border border-slate-800/90 p-7 sm:p-9 shadow-2xl shadow-cyan-950/30">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-800/60 text-cyan-300 text-xs font-mono mb-4">
              <KeyRound className="w-3 h-3" />
              <span>TESTFORGE AI • SECURITY</span>
            </div>

            {isSuccess ? (
              <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
                <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto shadow-lg shadow-emerald-950/50">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h1 className="text-2xl font-extrabold text-white tracking-tight">Password Reset Complete</h1>
                <p className="text-xs sm:text-sm text-slate-400">
                  Your new password is now active. Redirecting you to sign in...
                </p>
                <div className="pt-2">
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center w-full py-2.5 rounded-xl text-xs font-bold bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-colors"
                  >
                    Go to Sign In Now &rarr;
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Set New Password</h1>
                <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Choose a strong password to secure your TestForge AI account.
                </p>
              </>
            )}
          </div>

          {!isSuccess && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <span>{error}</span>
                </div>
              )}

              {!token && (
                <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 text-xs text-amber-300">
                  No reset token detected in URL. Please use the link sent to your email or request a new one from the{' '}
                  <Link to="/forgot-password" className="text-cyan-400 underline font-medium">
                    Forgot Password
                  </Link>{' '}
                  page.
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-300">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter at least 8 characters"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-300">Confirm Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Requirement indicators */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5 text-[11px]">
                <div className={`flex items-center gap-2 ${hasLength ? 'text-emerald-400' : 'text-slate-400'}`}>
                  <Check className="w-3 h-3" />
                  <span>At least 8 characters</span>
                </div>
                <div className={`flex items-center gap-2 ${hasUpper ? 'text-emerald-400' : 'text-slate-400'}`}>
                  <Check className="w-3 h-3" />
                  <span>At least one uppercase letter (A-Z)</span>
                </div>
                <div className={`flex items-center gap-2 ${hasDigit ? 'text-emerald-400' : 'text-slate-400'}`}>
                  <Check className="w-3 h-3" />
                  <span>At least one number (0-9)</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !token}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Resetting Password...</span>
                  </>
                ) : (
                  <span>Update Password</span>
                )}
              </button>
            </form>
          )}
        </div>
      </main>

      <footer className="relative z-10 py-6 text-center text-xs text-slate-400">
        TestForge AI &bull; Automated Java Unit Test Generation
      </footer>
    </div>
  );
};
