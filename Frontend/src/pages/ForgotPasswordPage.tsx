import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Cpu, ArrowLeft, Mail, AlertCircle, Loader2, CheckCircle2, ArrowRight, AlertTriangle } from 'lucide-react';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { api } from '../services/api';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [resetUrl, setResetUrl] = useState<string | null>(null);

  const validate = (): boolean => {
    if (!email.trim()) {
      setError('Email address is required.');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address.');
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
      const res = await api.post<{ message: string; reset_url?: string; email_sent?: boolean }>(
        '/auth/forgot-password',
        { email: email.trim() },
        false,
      );
      if (res.reset_url) {
        setResetUrl(res.reset_url);
      }
      setIsSuccess(true);
    } catch {
      // In case user does not exist or backend is unreachable, show success safely
      setIsSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans selection:bg-cyan-500/25 selection:text-cyan-200">
      {/* Background Ambience matching Login page */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-radial-gradient opacity-60 pointer-events-none z-0" />
      <div className="absolute inset-0 bg-dev-grid opacity-15 pointer-events-none z-0" />

      {/* Top Header Bar */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
        {/* Back to Home Link */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-cyan-400 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400 rounded px-2 py-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </Link>

        {/* Brand Logo & Theme Toggle */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            to="/"
            className="flex items-center gap-2 text-sm font-bold text-white group"
          >
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

      {/* Main Forgot Password Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md rounded-3xl bg-[#090d16]/95 border border-slate-800/90 p-7 sm:p-9 shadow-2xl shadow-cyan-950/30">
          {/* Header */}
          <div className="text-center mb-7">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-800/60 text-cyan-300 text-xs font-mono mb-4">
              <Mail className="w-3 h-3" />
              <span>TESTFORGE AI</span>
            </div>

            {isSuccess ? (
              <>
                <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto mb-3 shadow-lg shadow-emerald-950/50">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Check your email
                </h1>
                <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
                  If an account exists for <strong className="text-slate-200">{email}</strong>, you'll receive instructions to reset your password.
                </p>
              </>
            ) : (
              <>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Reset your password
                </h1>
                <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Enter your email address and we'll help you reset your password.
                </p>
              </>
            )}
          </div>

          {isSuccess ? (
            /* Success State */
            <div className="space-y-4 text-center">
              {resetUrl && (
                <div className="p-4 rounded-2xl bg-cyan-950/70 border border-cyan-800/80 text-left space-y-2">
                  <div className="flex items-center gap-1.5 text-cyan-400 font-mono text-xs font-semibold">
                    <span>⚡ DIRECT PASSWORD RESET LINK</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Outbound SMTP is running in development mode. You can click below to choose your new password right now:
                  </p>
                  <Link
                    to={resetUrl.replace(/^https?:\/\/[^/]+/, '')}
                    className="inline-flex items-center gap-1 text-xs font-bold text-cyan-300 hover:text-cyan-200 underline pt-1"
                  >
                    Reset Password Now &rarr;
                  </Link>
                </div>
              )}

              {/* ⚠️ Why You Won't Receive an Email in Your Gmail Inbox */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-left space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>Why You Won't Receive an Email in Your Gmail Inbox</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  <strong className="text-amber-200 font-medium">No SMTP / Email Server is Connected:</strong> In the project environment, there is no third-party email provider (e.g., SendGrid, AWS SES, or SMTP mail server) configured to dispatch live outbound emails to external Gmail inboxes.
                </p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  The platform simulates the password recovery flow securely (without leaking whether an email address exists in the database).
                </p>
              </div>

              <div className="pt-2 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-bold text-sm hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Back to Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsSuccess(false);
                    setEmail('');
                    setError(undefined);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 text-slate-300 hover:text-white border border-slate-800 text-xs font-mono transition-all cursor-pointer"
                >
                  Try another email
                </button>
              </div>
            </div>
          ) : (
            /* Email Form */
            <form onSubmit={handleSubmit} noValidate className="space-y-4 text-left">
              <div>
                <label
                  htmlFor="forgot-email"
                  className="block text-xs font-mono font-medium text-slate-300 mb-1.5"
                >
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="forgot-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    aria-invalid={error ? 'true' : 'false'}
                    aria-describedby={error ? 'forgot-email-error' : undefined}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError(undefined);
                    }}
                    placeholder="Enter your email"
                    className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#050810] text-sm text-white placeholder-slate-500 border transition-all focus:outline-none focus:ring-1 ${
                      error
                        ? 'border-rose-500/80 focus:ring-rose-500 focus:border-rose-500'
                        : 'border-slate-800 hover:border-slate-700 focus:ring-cyan-400 focus:border-cyan-400'
                    }`}
                  />
                </div>
                {error && (
                  <p id="forgot-email-error" className="mt-1.5 text-xs text-rose-400 flex items-center gap-1 font-mono">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{error}</span>
                  </p>
                )}
              </div>

              {/* Notice callout about environment simulation */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-left space-y-1.5">
                <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                  <span>Why You Won't Receive an Email in Your Gmail Inbox</span>
                </div>
                <p className="text-[11.5px] text-slate-300 leading-relaxed">
                  <strong className="text-amber-200 font-medium">No SMTP / Email Server is Connected:</strong> In the project environment, there is no third-party email provider (e.g., SendGrid, AWS SES, or SMTP mail server) configured to dispatch live outbound emails to external Gmail inboxes.
                </p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  The platform simulates the password recovery flow securely (without leaking whether an email address exists in the database).
                </p>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-bold text-sm hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-cyan-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:opacity-60 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending reset link...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Reset Link</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              {/* Back to Sign In Link */}
              <div className="pt-3 text-center text-xs text-slate-400">
                <span>Remember your password? </span>
                <Link
                  to="/login"
                  className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors focus:outline-none focus-visible:underline"
                >
                  Sign in
                </Link>
              </div>
            </form>
          )}

          {/* Footnote */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 text-[11px] font-mono text-slate-500 text-center">
            <span>TestForge AI • Account Recovery</span>
          </div>
        </div>
      </main>

      {/* Bottom Footer */}
      <footer className="relative z-10 py-5 px-4 text-center text-xs font-mono text-slate-500 border-t border-slate-800/60">
        <span>TestForge AI • Automated Java Testing Platform</span>
      </footer>
    </div>
  );
};
