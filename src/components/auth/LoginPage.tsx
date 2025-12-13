// =============================================================================
// LOGIN PAGE — Supabase Authentication
// =============================================================================
// Real authentication using Supabase Auth.
// Supports email/password login, signup, and magic links.
// =============================================================================

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Terminal, Shield, Eye, EyeOff, Loader2, Mail, ArrowLeft } from 'lucide-react';
import {
  loginWithEmail,
  signUpWithEmail,
  loginWithMagicLink,
  resetPassword,
  loginAsSuperAdminDev,
} from '../../services/authStore';

interface LoginPageProps {
  onLoginSuccess: () => void;
  onBack?: () => void;
}

type AuthMode = 'login' | 'signup' | 'magic-link' | 'forgot-password';

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onBack }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isDev = import.meta.env.DEV;

  const resetForm = () => {
    setError(null);
    setMessage(null);
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    resetForm();
    setIsLoading(true);

    try {
      const result = await loginWithEmail(email, password);
      if (result.success) {
        onLoginSuccess();
      } else {
        setError(result.error || 'Login failed. Please try again.');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    resetForm();
    setIsLoading(true);

    try {
      const result = await signUpWithEmail(email, password, fullName);
      if (result.success) {
        if (result.error) {
          // Email confirmation required
          setMessage(result.error);
        } else {
          onLoginSuccess();
        }
      } else {
        setError(result.error || 'Sign up failed. Please try again.');
      }
    } catch (err) {
      setError('Sign up failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    resetForm();
    setIsLoading(true);

    try {
      const result = await loginWithMagicLink(email);
      if (result.success) {
        setMessage(result.error || 'Check your email for the magic link!');
      } else {
        setError(result.error || 'Failed to send magic link.');
      }
    } catch (err) {
      setError('Failed to send magic link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    resetForm();
    setIsLoading(true);

    try {
      const result = await resetPassword(email);
      if (result.success) {
        setMessage(result.error || 'Check your email for the reset link!');
      } else {
        setError(result.error || 'Failed to send reset link.');
      }
    } catch (err) {
      setError('Failed to send reset link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuperAdminLogin = () => {
    const success = loginAsSuperAdminDev();
    if (success) {
      onLoginSuccess();
    } else {
      setError('Super Admin login only available in development mode.');
    }
  };

  const renderForm = () => {
    switch (mode) {
      case 'signup':
        return (
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="fullName" className="text-sm font-medium text-[#8892b0]">
                Full Name
              </label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Smith"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="bg-[#0a0d1f] border-[#1f2f45] text-white placeholder:text-[#4a5568] focus:border-[#4433FF] focus:ring-[#4433FF]/20"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-[#8892b0]">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-[#0a0d1f] border-[#1f2f45] text-white placeholder:text-[#4a5568] focus:border-[#4433FF] focus:ring-[#4433FF]/20"
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-[#8892b0]">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-[#0a0d1f] border-[#1f2f45] text-white placeholder:text-[#4a5568] focus:border-[#4433FF] focus:ring-[#4433FF]/20 pr-10"
                  required
                  disabled={isLoading}
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4a5568] hover:text-white transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <Button type="submit" variant="brand" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>
        );

      case 'magic-link':
        return (
          <form onSubmit={handleMagicLink} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-[#8892b0]">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-[#0a0d1f] border-[#1f2f45] text-white placeholder:text-[#4a5568] focus:border-[#4433FF] focus:ring-[#4433FF]/20"
                required
                disabled={isLoading}
              />
            </div>
            <Button type="submit" variant="brand" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail size={16} />
                  Send Magic Link
                </>
              )}
            </Button>
          </form>
        );

      case 'forgot-password':
        return (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-[#8892b0]">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-[#0a0d1f] border-[#1f2f45] text-white placeholder:text-[#4a5568] focus:border-[#4433FF] focus:ring-[#4433FF]/20"
                required
                disabled={isLoading}
              />
            </div>
            <Button type="submit" variant="brand" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Reset Link'
              )}
            </Button>
          </form>
        );

      default: // login
        return (
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-[#8892b0]">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-[#0a0d1f] border-[#1f2f45] text-white placeholder:text-[#4a5568] focus:border-[#4433FF] focus:ring-[#4433FF]/20"
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium text-[#8892b0]">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => { setMode('forgot-password'); resetForm(); }}
                  className="text-xs text-[#4433FF] hover:text-[#5544FF] transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-[#0a0d1f] border-[#1f2f45] text-white placeholder:text-[#4a5568] focus:border-[#4433FF] focus:ring-[#4433FF]/20 pr-10"
                  required
                  disabled={isLoading}
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4a5568] hover:text-white transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <Button type="submit" variant="brand" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        );
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'signup': return 'Create Account';
      case 'magic-link': return 'Magic Link';
      case 'forgot-password': return 'Reset Password';
      default: return 'Welcome Back';
    }
  };

  const getDescription = () => {
    switch (mode) {
      case 'signup': return 'Start your authority diagnostics journey';
      case 'magic-link': return 'Sign in without a password';
      case 'forgot-password': return "We'll send you a reset link";
      default: return 'Sign in to access your dashboard';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#030412] via-[#0a0d1f] to-[#030412] px-4">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4433FF05_1px,transparent_1px),linear-gradient(to_bottom,#4433FF05_1px,transparent_1px)] bg-[size:4rem_4rem]" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 text-white font-display font-bold text-2xl tracking-widest">
            <span className="px-2 py-1 rounded-md border border-[#1f2f45] bg-[#0e1a2d]/80 text-[#4433FF] shadow-[0_0_14px_rgba(68,51,255,0.35)]">[ ]</span>
            FRAMELORD
          </div>
          <p className="text-[#8892b0] text-sm mt-2">Authority Diagnostics Platform</p>
        </div>

        {/* Card */}
        <Card className="border-[#1f2f45] bg-[#0e1a2d]/80 backdrop-blur-sm shadow-[0_0_30px_rgba(68,51,255,0.15)]">
          <CardHeader className="text-center">
            {mode !== 'login' && (
              <button
                onClick={() => { setMode('login'); resetForm(); }}
                className="absolute left-4 top-4 text-[#8892b0] hover:text-white transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <CardTitle className="text-xl text-white">{getTitle()}</CardTitle>
            <CardDescription className="text-[#8892b0]">{getDescription()}</CardDescription>
          </CardHeader>

          <CardContent>
            {/* Error Message */}
            {error && (
              <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2 mb-4">
                {error}
              </div>
            )}

            {/* Success Message */}
            {message && (
              <div className="text-green-400 text-sm bg-green-500/10 border border-green-500/20 rounded-md px-3 py-2 mb-4">
                {message}
              </div>
            )}

            {renderForm()}
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            {mode === 'login' && (
              <>
                <div className="relative w-full">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-[#1f2f45]" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-[#0e1a2d] px-2 text-[#4a5568]">or</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 w-full">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-[#1f2f45] text-[#8892b0] hover:bg-[#1f2f45]/50"
                    onClick={() => { setMode('magic-link'); resetForm(); }}
                  >
                    <Mail size={16} />
                    Sign in with Magic Link
                  </Button>

                  <button
                    type="button"
                    onClick={() => { setMode('signup'); resetForm(); }}
                    className="text-[#8892b0] text-sm hover:text-white transition-colors"
                  >
                    Don't have an account? <span className="text-[#4433FF]">Sign up</span>
                  </button>
                </div>

                {isDev && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10 hover:text-yellow-400"
                    onClick={handleSuperAdminLogin}
                  >
                    <Shield size={16} />
                    Login as SUPER_ADMIN (Dev)
                  </Button>
                )}
              </>
            )}

            {mode === 'signup' && (
              <button
                type="button"
                onClick={() => { setMode('login'); resetForm(); }}
                className="text-[#8892b0] text-sm hover:text-white transition-colors"
              >
                Already have an account? <span className="text-[#4433FF]">Sign in</span>
              </button>
            )}

            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="text-[#8892b0] text-sm hover:text-white transition-colors"
              >
                Back to Home
              </button>
            )}
          </CardFooter>
        </Card>

        <p className="text-center text-[#4a5568] text-xs mt-6">
          <Terminal size={12} className="inline mr-1" />
          Secure authentication powered by Supabase
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
