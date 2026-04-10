'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button, Card } from '@heroui/react';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [showEmployeeCode, setShowEmployeeCode] = useState(false);
  const [code, setCode] = useState('');
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        router.replace('/');
      } else {
        setCheckingAuth(false);
      }
    });
  }, [router]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        setError(error.message);
        setLoading(false);
      }
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const handleEmployeeLogin = async () => {
    if (!code.trim()) return;
    setValidating(true);
    setError(null);
    try {
      const res = await fetch('/api/employee/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid code');
        setValidating(false);
        return;
      }

      // Store employee session
      localStorage.setItem(
        'employee_session',
        JSON.stringify({
          keyId: data.keyId,
          ownerId: data.ownerId,
          label: data.label,
          loginAt: new Date().toISOString(),
        })
      );
      router.replace('/');
    } catch {
      setError('Failed to validate code');
    } finally {
      setValidating(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-violet-500" />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <Card className="animate-in w-full max-w-sm border border-white/10 bg-slate-900/80 p-8 backdrop-blur-xl">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-violet-500/20">
            <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
              <path
                d="M15 24L21 30L33 18"
                stroke="white"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            LendTracker
          </h1>
          <p className="mt-2 text-center text-sm text-slate-400">
            Track who owes you &amp; who you owe.
            <br />
            {showEmployeeCode
              ? 'Enter your access code to continue.'
              : 'Sign in to sync your data across devices.'}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-xl bg-red-500/10 px-4 py-3 text-center text-sm text-red-400">
            {error}
          </div>
        )}

        {showEmployeeCode ? (
          <>
            {/* Employee Code Input */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Enter 6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
                autoFocus
                maxLength={6}
                className="w-full rounded-xl border border-white/10 bg-slate-800/60 px-4 py-3 text-center font-mono text-lg font-bold tracking-[0.3em] text-slate-100 uppercase outline-none placeholder:text-slate-500 placeholder:tracking-normal placeholder:text-sm placeholder:font-normal focus:border-violet-500/50"
                id="employee-code-input"
              />
            </div>
            <Button
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition-transform active:scale-[0.98]"
              onPress={handleEmployeeLogin}
              isDisabled={validating || code.length < 4}
              id="employee-login-btn"
            >
              {validating ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : null}
              {validating ? 'Verifying...' : 'Continue'}
            </Button>
            <button
              className="mt-4 w-full text-center text-xs text-slate-500 hover:text-slate-400"
              onClick={() => { setShowEmployeeCode(false); setError(null); setCode(''); }}
            >
              ← Back to sign in
            </button>
          </>
        ) : (
          <>
            {/* Google Sign-In */}
            <Button
              className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-lg transition-transform active:scale-[0.98]"
              onPress={handleGoogleLogin}
              isDisabled={loading}
              id="google-login-btn"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800" />
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              )}
              {loading ? 'Signing in...' : 'Continue with Google'}
            </Button>

            {/* Divider */}
            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/5" />
              <span className="text-[0.65rem] text-slate-600">or</span>
              <div className="h-px flex-1 bg-white/5" />
            </div>

            {/* Employee Login */}
            <button
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-slate-800/40 px-4 py-3 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800/60 hover:text-slate-300"
              onClick={() => { setShowEmployeeCode(true); setError(null); }}
              id="employee-toggle"
            >
              Employee? Enter access code
            </button>
          </>
        )}

        <p className="mt-6 text-center text-[0.7rem] text-slate-500">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </Card>
    </div>
  );
}
