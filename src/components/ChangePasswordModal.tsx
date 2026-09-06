'use client';

import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Shield,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Lock,
  X,
  RefreshCw,
  ShieldCheck
} from 'lucide-react';
import Button from './ui/Button';
import Badge from './ui/Badge';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newPasscode: string) => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [currentPasscode, setCurrentPasscode] = useState('');
  const [newPasscode, setNewPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Reset form when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setCurrentPasscode('');
      setNewPasscode('');
      setConfirmPasscode('');
      setErrorMsg(null);
      setSuccessMsg(null);
      setShowCurrent(false);
      setShowNew(false);
      setShowConfirm(false);
    }
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  // Calculate password strength
  const getStrength = (pass: string): { label: string; score: number; color: string } => {
    if (!pass) return { label: 'Kosong', score: 0, color: 'bg-zinc-700' };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 2) return { label: 'Lemah', score: 1, color: 'bg-rose-500' };
    if (score <= 3) return { label: 'Sedang', score: 2, color: 'bg-amber-500' };
    return { label: 'Kuat & Aman', score: 3, color: 'bg-emerald-500' };
  };

  const strength = getStrength(newPasscode);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!currentPasscode.trim()) {
      setErrorMsg('Password saat ini harus diisi.');
      return;
    }

    if (newPasscode.trim().length < 6) {
      setErrorMsg('Password baru minimal harus 6 karakter.');
      return;
    }

    if (newPasscode.trim() !== confirmPasscode.trim()) {
      setErrorMsg('Konfirmasi password baru tidak cocok.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPasscode: currentPasscode.trim(),
          newPasscode: newPasscode.trim(),
          confirmPasscode: confirmPasscode.trim()
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessMsg(data.message || 'Password master berhasil diperbarui!');
        onSuccess?.(newPasscode.trim());
        setTimeout(() => {
          onClose();
        }, 1800);
      } else {
        setErrorMsg(data.error || 'Gagal mengubah password. Pastikan password lama benar.');
      }
    } catch {
      setErrorMsg('Gagal menghubungi server autentikasi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md bg-zinc-950/95 border border-zinc-800 rounded-3xl p-6 sm:p-7 shadow-[0_0_60px_rgba(0,0,0,0.9)] backdrop-blur-2xl font-mono space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-zinc-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 border border-emerald-500/40 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              <KeyRound className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm tracking-wider text-zinc-100 uppercase">
                  Ganti Master Password
                </h3>
                <Badge variant="emerald" size="xs">
                  SECURITY
                </Badge>
              </div>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Terminal Access & Session Management
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
            aria-label="Tutup Modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Info Banner */}
        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-zinc-300 space-y-1">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-[11px]">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Password Baru yang Ditetapkan: Alza0839</span>
          </div>
          <p className="text-[10px] text-zinc-400 leading-relaxed pl-6">
            Password aktif Anda sekarang adalah <code className="text-emerald-300 font-bold bg-zinc-900/80 px-1.5 py-0.5 rounded border border-emerald-500/30">Alza0839</code>. Anda dapat mengubahnya sewaktu-waktu kapan saja menggunakan form di bawah ini.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* 1. Password Saat Ini */}
          <div className="space-y-1.5">
            <label className="font-bold text-zinc-300 flex items-center justify-between">
              <span>Password Saat Ini (Lama)</span>
              <span className="text-[10px] text-zinc-500 font-normal">Wajib diisi</span>
            </label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPasscode}
                onChange={(e) => setCurrentPasscode(e.target.value)}
                placeholder="Masukkan password saat ini..."
                required
                className="w-full bg-zinc-900/90 border border-zinc-800 focus:border-emerald-500/80 text-zinc-100 px-3.5 py-2.5 rounded-xl font-mono text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-1"
                title={showCurrent ? 'Sembunyikan' : 'Tampilkan'}
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* 2. Password Baru */}
          <div className="space-y-1.5">
            <label className="font-bold text-zinc-300 flex items-center justify-between">
              <span>Password Baru</span>
              <span className="text-[10px] text-zinc-500 font-normal">Min. 6 karakter</span>
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPasscode}
                onChange={(e) => setNewPasscode(e.target.value)}
                placeholder="Masukkan password baru..."
                required
                className="w-full bg-zinc-900/90 border border-zinc-800 focus:border-cyan-500/80 text-zinc-100 px-3.5 py-2.5 rounded-xl font-mono text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-all pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-1"
                title={showNew ? 'Sembunyikan' : 'Tampilkan'}
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Password Strength Indicator */}
            {newPasscode && (
              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-zinc-500">Kekuatan Sandi:</span>
                  <span
                    className={`font-bold ${
                      strength.score === 1
                        ? 'text-rose-400'
                        : strength.score === 2
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {strength.label}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden flex gap-1">
                  <div
                    className={`h-full flex-1 transition-all duration-300 ${
                      strength.score >= 1 ? strength.color : 'bg-zinc-800'
                    }`}
                  />
                  <div
                    className={`h-full flex-1 transition-all duration-300 ${
                      strength.score >= 2 ? strength.color : 'bg-zinc-800'
                    }`}
                  />
                  <div
                    className={`h-full flex-1 transition-all duration-300 ${
                      strength.score >= 3 ? strength.color : 'bg-zinc-800'
                    }`}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 3. Konfirmasi Password Baru */}
          <div className="space-y-1.5">
            <label className="font-bold text-zinc-300 flex items-center justify-between">
              <span>Konfirmasi Password Baru</span>
              {confirmPasscode && (
                <span
                  className={`text-[10px] font-bold ${
                    newPasscode === confirmPasscode ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {newPasscode === confirmPasscode ? '✓ Cocok' : '✕ Tidak cocok'}
                </span>
              )}
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPasscode}
                onChange={(e) => setConfirmPasscode(e.target.value)}
                placeholder="Ulangi password baru..."
                required
                className={`w-full bg-zinc-900/90 border ${
                  confirmPasscode && newPasscode !== confirmPasscode
                    ? 'border-rose-500/60'
                    : confirmPasscode && newPasscode === confirmPasscode
                    ? 'border-emerald-500/60'
                    : 'border-zinc-800'
                } focus:border-cyan-500/80 text-zinc-100 px-3.5 py-2.5 rounded-xl font-mono text-xs focus:outline-none transition-all pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-1"
                title={showConfirm ? 'Sembunyikan' : 'Tampilkan'}
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Alerts */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1"
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={
                isLoading ||
                !currentPasscode.trim() ||
                newPasscode.trim().length < 6 ||
                newPasscode !== confirmPasscode
              }
              className="flex-1"
              leftIcon={
                isLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5" />
                )
              }
            >
              {isLoading ? 'Menyimpan...' : 'Simpan Password'}
            </Button>
          </div>
        </form>

        {/* Security Note */}
        <p className="text-[10px] text-zinc-600 text-center">
          Password baru akan langsung aktif dan sesi Anda akan diperbarui otomatis.
        </p>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
