'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ShieldAlert,
  Lock,
  Unlock,
  KeyRound,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  Zap
} from 'lucide-react';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/';

  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim() || isLoading) return;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: passcode.trim() })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Successful login, redirect to dashboard
        router.push(redirectPath);
        router.refresh();
      } else {
        setErrorMsg(data.error || 'Passcode salah. Akses ditolak.');
      }
    } catch {
      setErrorMsg('Gagal terhubung ke server autentikasi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030706] text-zinc-100 flex items-center justify-center p-4 font-mono relative overflow-hidden selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* Background Ambience Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#161B19_1px,transparent_1px),linear-gradient(to_bottom,#161B19_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="relative w-full max-w-md bg-zinc-950/90 border border-zinc-800/90 rounded-3xl p-6 sm:p-8 shadow-[0_0_60px_rgba(0,0,0,0.9)] backdrop-blur-xl space-y-6">
        {/* Terminal Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 border border-emerald-500/40 mx-auto flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)]">
            <Lock className="w-6 h-6 text-emerald-400" />
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[10px] font-black uppercase tracking-wider mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
              Restricted Area • Private Terminal
            </div>
            <h1 className="text-xl font-black tracking-wider text-zinc-100 uppercase">
              Grok Trencher
            </h1>
            <p className="text-xs text-zinc-500 mt-1">
              Autonomous Solana Multi-Agent Trading Architecture
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                <span>Master Admin Passcode</span>
              </span>
              <span className="text-[10px] text-zinc-600">256-bit Encrypted</span>
            </label>

            <div className="relative">
              <input
                type={showPasscode ? 'text' : 'password'}
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Masukkan kata sandi admin..."
                autoFocus
                required
                className="w-full bg-zinc-900/80 border border-zinc-800 focus:border-emerald-500/80 text-zinc-100 px-4 py-3 rounded-xl text-sm font-mono placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all pr-10"
              />

              <button
                type="button"
                onClick={() => setShowPasscode(!showPasscode)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors p-1"
                title={showPasscode ? 'Sembunyikan' : 'Tampilkan'}
              >
                {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error Notice */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400 flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !passcode.trim()}
            className="w-full py-3 px-4 rounded-xl font-mono font-bold text-sm bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99]"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <span>Memverifikasi Sesi...</span>
              </>
            ) : (
              <>
                <span>Buka Akses Terminal</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Security Footer Notice */}
        <div className="pt-4 border-t border-zinc-900 text-center space-y-1">
          <p className="text-[11px] text-zinc-500">
            Sesi aman menggunakan cookie <code className="text-zinc-400">HttpOnly</code>, <code className="text-zinc-400">SameSite=Strict</code>.
          </p>
          <p className="text-[10px] text-zinc-600">
            Default local passcode: <code className="text-emerald-500/80 font-bold">grok2026</code> (dapat diubah di Vercel Environment Variables).
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#030706] text-zinc-100 flex items-center justify-center font-mono">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-zinc-400">Loading Secure Terminal Gate...</span>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}

