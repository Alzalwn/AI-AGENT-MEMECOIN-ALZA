'use client';

import React, { useState, useEffect } from 'react';
import { Send, X, Check, AlertCircle, Loader2, Key, HelpCircle, ExternalLink, ShieldCheck } from 'lucide-react';
import { TelegramConfig, testTelegramConnection } from '../lib/telegram';

interface TelegramSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: TelegramConfig;
  onSaveConfig: (cfg: TelegramConfig) => void;
}

export default function TelegramSettingsModal({
  isOpen,
  onClose,
  config,
  onSaveConfig,
}: TelegramSettingsModalProps) {
  const [botToken, setBotToken] = useState(config.botToken);
  const [chatId, setChatId] = useState(config.chatId);
  const [isEnabled, setIsEnabled] = useState(config.isEnabled);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    setBotToken(config.botToken);
    setChatId(config.chatId);
    setIsEnabled(config.isEnabled);
  }, [config]);

  if (!isOpen) return null;

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    const result = await testTelegramConnection(botToken, chatId);
    setTestResult(result);
    setIsTesting(false);
  };

  const handleSave = () => {
    const updated: TelegramConfig = {
      botToken: botToken.trim(),
      chatId: chatId.trim(),
      isEnabled,
    };
    onSaveConfig(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('GT_TELEGRAM_CONFIG', JSON.stringify(updated));
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-terminal-panel border border-terminal-border rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4 font-mono select-none">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-terminal-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/40 text-sky-400">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-terminal-text uppercase tracking-wider flex items-center gap-2">
                Telegram Alpha Alerts
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-400 border border-sky-500/40 font-bold">
                  WEBHOOK
                </span>
              </h2>
              <p className="text-[11px] text-terminal-muted">Notifikasi Instan 5/5 AI Agent Approved Gems</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-terminal-card text-terminal-muted hover:text-terminal-text transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Enable Alert Toggle */}
        <div className="p-3 rounded-xl bg-terminal-card border border-terminal-border flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-terminal-text block">Aktifkan Notifikasi Otomatis</span>
            <span className="text-[10px] text-terminal-muted block">Kirim alert saat koin disetujui 5 agen</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={(e) => setIsEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-terminal-panel peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-terminal-green border border-terminal-border"></div>
          </label>
        </div>

        {/* Inputs */}
        <div className="space-y-3 text-xs">
          <div className="space-y-1">
            <label className="text-[11px] text-terminal-muted font-bold block">Telegram Bot Token</label>
            <input
              type="password"
              placeholder="Contoh: 123456789:ABCdefGhIJKlmNoPQRs..."
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              className="w-full bg-terminal-bg border border-terminal-border rounded-lg px-3 py-2 text-xs text-terminal-text focus:outline-none focus:border-sky-400 font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-terminal-muted font-bold block">Chat ID / Channel Username</label>
            <input
              type="text"
              placeholder="Contoh: 987654321 atau @nama_channel"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              className="w-full bg-terminal-bg border border-terminal-border rounded-lg px-3 py-2 text-xs text-terminal-text focus:outline-none focus:border-sky-400 font-mono"
            />
          </div>
        </div>

        {/* Test Result Message */}
        {testResult && (
          <div className={`p-2.5 rounded-lg border text-[11px] flex items-center gap-2 ${
            testResult.success
              ? 'bg-terminal-green/10 border-terminal-green/40 text-terminal-green'
              : 'bg-terminal-red/10 border-terminal-red/40 text-terminal-red'
          }`}>
            {testResult.success ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{testResult.message}</span>
          </div>
        )}

        {/* Collapsible How-To Guide */}
        <div>
          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            className="text-[10px] text-sky-400 hover:underline flex items-center gap-1 cursor-pointer font-bold"
          >
            <HelpCircle className="w-3 h-3" />
            {showHelp ? 'Sembunyikan Panduan Setup Bot' : 'Cara Buat Bot Telegram & Dapatkan Chat ID (Gratis)'}
          </button>
          {showHelp && (
            <div className="mt-2 p-3 bg-terminal-bg rounded-lg border border-terminal-border text-[10px] text-terminal-muted space-y-1 leading-relaxed">
              <p>1. Buka Telegram dan cari <strong>@BotFather</strong>, ketik <code>/newbot</code>.</p>
              <p>2. Ikuti instruksi untuk nama & username bot. Salin token API yang diberikan.</p>
              <p>3. Untuk Chat ID: chat bot Anda dengan <code>/start</code>, lalu buka <strong>@userinfobot</strong> untuk melihat Chat ID akun Anda.</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-2 border-t border-terminal-border flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleTest}
            disabled={isTesting || !botToken.trim() || !chatId.trim()}
            className="py-2 px-3 rounded-lg bg-terminal-card border border-terminal-border hover:border-sky-400 text-xs font-bold text-sky-400 flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-40"
          >
            {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Test Ping Bot
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-3 rounded-lg bg-terminal-card border border-terminal-border text-xs font-semibold text-terminal-muted hover:text-terminal-text transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="py-2 px-4 rounded-lg bg-terminal-green text-terminal-bg text-xs font-black hover:bg-terminal-green/90 transition-all cursor-pointer shadow-[0_0_10px_rgba(13,242,137,0.3)]"
            >
              Simpan
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
