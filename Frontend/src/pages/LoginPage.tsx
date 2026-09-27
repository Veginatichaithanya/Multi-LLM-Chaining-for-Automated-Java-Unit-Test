import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Cpu, ArrowLeft, ArrowRight, Lock, Mail, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from '../components/ui/ThemeToggle';


export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();

  const state = location.state as { successMessage?: string; prefillEmail?: string } | null;
  const signupSuccessMsg = state?.successMessage;
  const prefillEmail = state?.prefillEmail;

  const [email, setEmail] = useState(prefillEmail || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Form error state
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already authenticated, redirect to /dashboard
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Validation logic
  const validate = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      newErrors.password = 'Password is required.';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!validate() || isSubmitting) return;

    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      setIsSubmitting(false);
      if (err instanceof Error) {
        setAuthError(err.message);
      } else {
        setAuthError('Authentication failed. Please check credentials.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans selection:bg-cyan-500/25 selection:text-cyan-200">
      {/* Background Ambience */}
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

      {/* Main Login Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md rounded-3xl bg-[#090d16]/95 border border-slate-800/90 p-7 sm:p-9 shadow-2xl shadow-cyan-950/30">
          {/* Header */}
          <div className="text-center mb-7">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-800/60 text-cyan-300 text-xs font-mono mb-4">
              <Lock className="w-3 h-3" />
              <span>TESTFORGE AI</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome back
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
              Sign in to continue to your TestForge workspace.
            </p>
          </div>


          {/* Auth Error Banner */}
          {authError && (
            <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs font-mono flex items-center gap-2 mb-6 animate-in fade-in duration-300 shadow-md shadow-rose-950/40">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {/* Signup Success Banner from /signup redirect */}
          {signupSuccessMsg && !authError && (
            <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs font-mono flex items-center gap-2 mb-6 animate-in fade-in duration-300 shadow-md shadow-emerald-950/40">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{signupSuccessMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4 text-left">
              {/* Email Field */}
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-xs font-mono font-medium text-slate-300 mb-1.5"
                >
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    aria-invalid={errors.email ? 'true' : 'false'}
                    aria-describedby={errors.email ? 'login-email-error' : undefined}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                      if (authError) setAuthError(null);
                    }}
                    placeholder="Enter your email"
                    className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#050810] text-sm text-white placeholder-slate-500 border transition-all focus:outline-none focus:ring-1 ${
                      errors.email
                        ? 'border-rose-500/80 focus:ring-rose-500 focus:border-rose-500'
                        : 'border-slate-800 hover:border-slate-700 focus:ring-cyan-400 focus:border-cyan-400'
                    }`}
                  />
                </div>
                {errors.email && (
                  <p id="login-email-error" className="mt-1.5 text-xs text-rose-400 flex items-center gap-1 font-mono">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{errors.email}</span>
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="login-password"
                    className="block text-xs font-mono font-medium text-slate-300"
                  >
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 transition-colors focus:outline-none focus-visible:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    aria-invalid={errors.password ? 'true' : 'false'}
                    aria-describedby={errors.password ? 'login-password-error' : undefined}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                      if (authError) setAuthError(null);
                    }}
                    placeholder="Enter your password"
                    className={`w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#050810] text-sm text-white placeholder-slate-500 border transition-all focus:outline-none focus:ring-1 ${
                      errors.password
                        ? 'border-rose-500/80 focus:ring-rose-500 focus:border-rose-500'
                        : 'border-slate-800 hover:border-slate-700 focus:ring-cyan-400 focus:border-cyan-400'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p id="login-password-error" className="mt-1.5 text-xs text-rose-400 flex items-center gap-1 font-mono">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{errors.password}</span>
                  </p>
                )}
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center">
                <label className="flex items-center gap-2.5 text-xs text-slate-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded bg-[#050810] border-slate-800 text-cyan-500 focus:ring-cyan-400 focus:ring-offset-0 focus:ring-offset-slate-900 cursor-pointer accent-cyan-500"
                  />
                  <span>Remember me</span>
                </label>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-bold text-sm hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-cyan-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <span>Validating credentials...</span>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Create Account Link */}
              <div className="pt-3 text-center text-xs text-slate-400">
                <span>Don't have an account? </span>
                <Link
                  to="/signup"
                  className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors focus:outline-none focus-visible:underline"
                >
                  Create an account
                </Link>
              </div>
            </form>

          {/* Phase 1 Integration Footnote */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 text-[11px] font-mono text-slate-500 text-center">
            <span>TestForge AI • Secure Authentication</span>
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
