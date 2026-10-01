import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Cpu, ArrowLeft, ArrowRight, Lock, Mail, User, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from '../components/ui/ThemeToggle';

export const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    terms?: string;
  }>({});

  const [signupError, setSignupError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Field validation
  const validate = (): boolean => {
    const newErrors: {
      fullName?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
      terms?: string;
    } = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Full name is required.';
    }

    if (!email.trim()) {
      newErrors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Enter a valid email address.';
    }

    if (!password) {
      newErrors.password = 'Password is required.';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters.';
    } else if (!/[A-Z]/.test(password)) {
      newErrors.password = 'Password must contain at least one uppercase letter.';
    } else if (!/[0-9]/.test(password)) {
      newErrors.password = 'Password must contain at least one digit.';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Confirm your password.';
    } else if (confirmPassword !== password) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    if (!agreeTerms) {
      newErrors.terms = 'You must agree to the Terms and Privacy Policy.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError(null);
    if (!validate() || isSubmitting) return;

    setIsSubmitting(true);

    try {
      await register(email.trim().toLowerCase(), password, fullName.trim(), 'Developer');
      navigate('/login', {
        state: {
          successMessage: 'Account created successfully! Please enter your password to sign in.',
          prefillEmail: email,
        },
      });
    } catch (err: unknown) {
      setIsSubmitting(false);
      if (err instanceof Error) {
        setSignupError(err.message);
      } else {
        setSignupError('Failed to create account. Please try again.');
      }
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

      {/* Main Signup Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md rounded-3xl bg-[#090d16]/95 border border-slate-800/90 p-7 sm:p-9 shadow-2xl shadow-cyan-950/30">
          {/* Header */}
          <div className="text-center mb-7">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-800/60 text-cyan-300 text-xs font-mono mb-4">
              <User className="w-3 h-3" />
              <span>TESTFORGE AI</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Create your account
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
              Set up your workspace and start generating Java tests.
            </p>
          </div>

          {/* Error Banner */}
          {signupError && (
            <div
              role="alert"
              className="mb-5 p-3.5 rounded-2xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-2.5 font-mono shadow-sm"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <div className="flex-1 leading-relaxed">{signupError}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4 text-left">
            {/* Field 1: Full Name */}
            <div>
              <label
                htmlFor="signup-name"
                className="block text-xs font-mono font-medium text-slate-300 mb-1.5"
              >
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="signup-name"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  aria-invalid={errors.fullName ? 'true' : 'false'}
                  aria-describedby={errors.fullName ? 'name-error' : undefined}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: undefined }));
                  }}
                  placeholder="Enter your full name"
                  className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#050810] text-sm text-white placeholder-slate-500 border transition-all focus:outline-none focus:ring-1 ${
                    errors.fullName
                      ? 'border-rose-500/80 focus:ring-rose-500 focus:border-rose-500'
                      : 'border-slate-800 hover:border-slate-700 focus:ring-cyan-400 focus:border-cyan-400'
                  }`}
                />
              </div>
              {errors.fullName && (
                <p id="name-error" className="mt-1.5 text-xs text-rose-400 flex items-center gap-1 font-mono">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{errors.fullName}</span>
                </p>
              )}
            </div>

            {/* Field 2: Email */}
            <div>
              <label
                htmlFor="signup-email"
                className="block text-xs font-mono font-medium text-slate-300 mb-1.5"
              >
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="signup-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  aria-invalid={errors.email ? 'true' : 'false'}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
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
                <p id="email-error" className="mt-1.5 text-xs text-rose-400 flex items-center gap-1 font-mono">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{errors.email}</span>
                </p>
              )}
            </div>

            {/* Field 3: Password */}
            <div>
              <label
                htmlFor="signup-password"
                className="block text-xs font-mono font-medium text-slate-300 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  aria-invalid={errors.password ? 'true' : 'false'}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  placeholder="Create a password"
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
                <p id="password-error" className="mt-1.5 text-xs text-rose-400 flex items-center gap-1 font-mono">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{errors.password}</span>
                </p>
              )}
            </div>

            {/* Field 4: Confirm Password */}
            <div>
              <label
                htmlFor="signup-confirm-password"
                className="block text-xs font-mono font-medium text-slate-300 mb-1.5"
              >
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="signup-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  aria-invalid={errors.confirmPassword ? 'true' : 'false'}
                  aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errors.confirmPassword)
                      setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                  }}
                  placeholder="Confirm your password"
                  className={`w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#050810] text-sm text-white placeholder-slate-500 border transition-all focus:outline-none focus:ring-1 ${
                    errors.confirmPassword
                      ? 'border-rose-500/80 focus:ring-rose-500 focus:border-rose-500'
                      : 'border-slate-800 hover:border-slate-700 focus:ring-cyan-400 focus:border-cyan-400'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p id="confirm-password-error" className="mt-1.5 text-xs text-rose-400 flex items-center gap-1 font-mono">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{errors.confirmPassword}</span>
                </p>
              )}
            </div>

            {/* Terms and Privacy Checkbox */}
            <div className="pt-1">
              <label className="flex items-start gap-2.5 text-xs text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  aria-invalid={errors.terms ? 'true' : 'false'}
                  aria-describedby={errors.terms ? 'terms-error' : undefined}
                  onChange={(e) => {
                    setAgreeTerms(e.target.checked);
                    if (errors.terms) setErrors((prev) => ({ ...prev, terms: undefined }));
                  }}
                  className="w-4 h-4 mt-0.5 rounded bg-[#050810] border-slate-800 text-cyan-500 focus:ring-cyan-400 focus:ring-offset-0 focus:ring-offset-slate-900 cursor-pointer accent-cyan-500 shrink-0"
                />
                <span className="leading-snug">
                  I agree to the{' '}
                  <span className="text-cyan-400 hover:underline cursor-pointer">Terms</span> and{' '}
                  <span className="text-cyan-400 hover:underline cursor-pointer">Privacy Policy</span>
                </span>
              </label>
              {errors.terms && (
                <p id="terms-error" className="mt-1.5 text-xs text-rose-400 flex items-center gap-1 font-mono">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{errors.terms}</span>
                </p>
              )}
            </div>

            {/* Primary Action Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-bold text-sm hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-cyan-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:opacity-60 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {/* Signup Footer: Already have an account? Sign in */}
            <div className="pt-3 text-center text-xs text-slate-400">
              <span>Already have an account? </span>
              <Link
                to="/login"
                className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors focus:outline-none focus-visible:underline"
              >
                Sign in
              </Link>
            </div>
          </form>

          {/* Footnote */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 text-[11px] font-mono text-slate-500 text-center">
            <span>TestForge AI • Secure Registration</span>
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
