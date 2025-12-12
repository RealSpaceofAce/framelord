// =============================================================================
// LOGIN PAGE — Authentication entry point
// =============================================================================
// Uses shadcn/ui Card, Input, and Button components.
// Includes dev-only SUPER_ADMIN backdoor button.
// =============================================================================

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Terminal, Shield, Eye, EyeOff, Loader2 } from 'lucide-react';
import {
  loginWithEmailMock,
  loginAsSuperAdminDev,
} from '../../services/authStore';

interface LoginPageProps {
  onLoginSuccess: () => void;
  onBack?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onBack }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check if running in development mode
  // SECURITY: Only use import.meta.env.DEV which is set at build time.
  // Do NOT add localhost checks as those could be bypassed in production.
  const isDev = import.meta.env.DEV;

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Simulate network delay for UX
    await new Promise((resolve) => setTimeout(resolve, 500));

    try {
      const success = loginWithEmailMock(email, password);
      if (success) {
        onLoginSuccess();
      } else {
        setError('Invalid credentials. Password must be at least 6 characters.');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#030412] via-[#0a0d1f] to-[#030412] px-4">
      {/* Background grid effect */}
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

        {/* Login Card */}
        <Card className="border-[#1f2f45] bg-[#0e1a2d]/80 backdrop-blur-sm shadow-[0_0_30px_rgba(68,51,255,0.15)]">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-white">Welcome Back</CardTitle>
            <CardDescription className="text-[#8892b0]">
              Sign in to access your dashboard
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleEmailLogin} className="space-y-4">
              {/* Email Input */}
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

              {/* Password Input */}
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-[#8892b0]">
                  Password
                </label>
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

              {/* Error Message */}
              {error && (
                <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                variant="brand"
                className="w-full"
                disabled={isLoading}
              >
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
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            {/* Divider */}
            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-[#1f2f45]" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#0e1a2d] px-2 text-[#4a5568]">
                  {isDev ? 'Development Options' : 'or'}
                </span>
              </div>
            </div>

            {/* Dev-only Super Admin Login */}
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

            {/* Back to Home */}
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

        {/* Beta Notice */}
        <p className="text-center text-[#4a5568] text-xs mt-6">
          <Terminal size={12} className="inline mr-1" />
          Beta Version - Mock authentication enabled
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
