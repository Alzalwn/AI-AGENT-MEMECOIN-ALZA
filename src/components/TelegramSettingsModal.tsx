'use client';

import React, { useState, useEffect } from 'react';
import { Send, X, Check, AlertCircle, Loader2, HelpCircle, MessageSquare } from 'lucide-react';
import { TelegramConfig, testTelegramConnection, sendTelegramExitAlert } from '../lib/telegram';
import { DiscordConfig, testDiscordWebhook, sendDiscordExitAlert } from '../lib/discord';

interface TelegramSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: TelegramConfig;
  onSaveConfig: (cfg: TelegramConfig) => void;
  discordConfig: DiscordConfig;
  onSaveDiscordConfig: (cfg: DiscordConfig) => void;
}

export default function TelegramSettingsModal({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  discordConfig,
  onSaveDiscordConfig,
}: TelegramSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'telegram' | 'discord'>('telegram');

  // Telegram state
  const [botToken, setBotToken] = useState(config.botToken);
  const [chatId, setChatId] = useState(config.chatId);
  const [isTelegramEnabled, setIsTelegramEnabled] = useState(config.isEnabled);
  const [isTestingTelegram, setIsTestingTelegram] = useState(false);
  const [telegramTestResult, setTelegramTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Discord state
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState(discordConfig.webhookUrl);
  const [isDiscordEnabled, setIsDiscordEnabled] = useState(discordConfig.isEnabled);
  const [isTestingDiscord, setIsTestingDiscord] = useState(false);
  const [discordTestResult, setDiscordTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    setBotToken(config.botToken);
    setChatId(config.chatId);
    setIsTelegramEnabled(config.isEnabled);
    setDiscordWebhookUrl(discordConfig.webhookUrl);
    setIsDiscordEnabled(discordConfig.isEnabled);
  }, [config, discordConfig]);

  if (!isOpen) return null;

  const handleTestTelegram = async () => {
    setIsTestingTelegram(true);
    setTelegramTestResult(null);
    const result = await testTelegramConnection(botToken, chatId);
    setTelegramTestResult(result);
    setIsTestingTelegram(false);
  };

  const handleTestTelegramTrade = async () => {
    setIsTestingTelegram(true);
    setTelegramTestResult(null);
    const dummyTrade = {
      token: {
        id: 'TEST-1',
        mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        symbol: '$TEST',
        name: 'Grok Alpha Test',
        platform: 'Pump.fun' as const,
        initialLpUsd: 25000,
        burntLiquidityPct: 100,
        mintAuthorityRevoked: true,
        freezeAuthorityRevoked: true,
        top10HolderPct: 12,
        volumeDelta15s: 18,
        uniqueBuyersCount: 10,
        narrativeCosineSim: 0.94,
        narrativeTheme: 'AI / AGENTIC',
        priceSol: 0.000035,
        detectedAt: Date.now()
      },
      entryPriceSol: 0.000035,
      exitPriceSol: 0.000056,
      solInvested: 0.5,
      pnlSol: 0.300,
      pnlPct: 60.0,
      rMultiplier: 3.2,
      holdDurationSec: 38,
      exitReason: 'Target Take-Profit Reached (+3.2R)'
    };
    const ok = await sendTelegramExitAlert(dummyTrade, { botToken, chatId, isEnabled: true });
    setTelegramTestResult({
      success: ok,
      message: ok ? 'Contoh Trade Alert berhasil dikirim ke Telegram!' : 'Gagal mengirim Test Trade Alert. Periksa Bot Token & Chat ID.'
    });
    setIsTestingTelegram(false);
  };

  const handleTestDiscord = async () => {
    setIsTestingDiscord(true);
    setDiscordTestResult(null);
    const result = await testDiscordWebhook(discordWebhookUrl);
    setDiscordTestResult(result);
    setIsTestingDiscord(false);
  };

  const handleTestDiscordTrade = async () => {
    setIsTestingDiscord(true);
    setDiscordTestResult(null);
    const dummyTrade = {
      token: {
        id: 'TEST-1',
        mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        symbol: '$TEST',
        name: 'Grok Alpha Test',
        platform: 'Pump.fun' as const,
        initialLpUsd: 25000,
        burntLiquidityPct: 100,
        mintAuthorityRevoked: true,
        freezeAuthorityRevoked: true,
        top10HolderPct: 12,
        volumeDelta15s: 18,
        uniqueBuyersCount: 10,
        narrativeCosineSim: 0.94,
        narrativeTheme: 'AI / AGENTIC',
        priceSol: 0.000035,
        detectedAt: Date.now()
      },
      entryPriceSol: 0.000035,
      exitPriceSol: 0.000056,
      solInvested: 0.5,
      pnlSol: 0.300,
      pnlPct: 60.0,
      rMultiplier: 3.2,
      holdDurationSec: 38,
      exitReason: 'Target Take-Profit Reached (+3.2R)'
    };
    const ok = await sendDiscordExitAlert(dummyTrade, { webhookUrl: discordWebhookUrl, isEnabled: true });
    setDiscordTestResult({
      success: ok,
      message: ok ? 'Contoh Rich Embed Trade Alert berhasil dikirim ke Discord!' : 'Gagal mengirim Test Trade Alert. Periksa URL Webhook.'
    });
    setIsTestingDiscord(false);
  };

  const handleSave = () => {
    const updatedTg: TelegramConfig = {
      botToken: botToken.trim(),
      chatId: chatId.trim(),
      isEnabled: isTelegramEnabled,
    };
    onSaveConfig(updatedTg);
    if (typeof window !== 'undefined') {
      localStorage.setItem('GT_TELEGRAM_CONFIG', JSON.stringify(updatedTg));
    }

    const updatedDc: DiscordConfig = {
      webhookUrl: discordWebhookUrl.trim(),
      isEnabled: isDiscordEnabled,
    };
    onSaveDiscordConfig(updatedDc);
    if (typeof window !== 'undefined') {
      localStorage.setItem('GT_DISCORD_CONFIG', JSON.stringify(updatedDc));
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
                Omnichannel Alpha Alerts
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-terminal-green/20 text-terminal-green border border-terminal-green/40 font-bold">
                  WEBHOOKS
                </span>
              </h2>
              <p className="text-[11px] text-terminal-muted">Notifikasi Instan 5/5 AI Consensus (Telegram &amp; Discord)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-terminal-card text-terminal-muted hover:text-terminal-text transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Channel Tab Switcher */}
        <div className="flex items-center gap-1.5 bg-terminal-card p-1 rounded-xl border border-terminal-border">
          <button
            type="button"
            onClick={() => setActiveTab('telegram')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'telegram'
                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40 shadow-[0_0_8px_rgba(14,165,233,0.2)]'
                : 'text-terminal-muted hover:text-terminal-text border border-transparent'
            }`}
          >
            <Send className="w-3.5 h-3.5" /> Telegram Bot
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('discord')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'discord'
                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 shadow-[0_0_8px_rgba(99,102,241,0.2)]'
                : 'text-terminal-muted hover:text-terminal-text border border-transparent'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" /> Discord Webhook
          </button>
        </div>

        {/* Telegram Tab */}
        {activeTab === 'telegram' && (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-terminal-card border border-terminal-border flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-terminal-text block">Aktifkan Telegram Bot</span>
                <span className="text-[10px] text-terminal-muted block">Kirim sinyal approval ke Telegram</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isTelegramEnabled}
                  onChange={(e) => setIsTelegramEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-terminal-panel peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500 border border-terminal-border"></div>
              </label>
            </div>

            <div className="space-y-2 text-xs">
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
                <label className="text-[11px] text-terminal-muted font-bold block">Chat ID / Channel</label>
                <input
                  type="text"
                  placeholder="Contoh: 987654321 atau @nama_channel"
                  value={chatId}
                  onChange={(e) => setChatId(e.target.value)}
                  className="w-full bg-terminal-bg border border-terminal-border rounded-lg px-3 py-2 text-xs text-terminal-text focus:outline-none focus:border-sky-400 font-mono"
                />
              </div>
            </div>

            {telegramTestResult && (
              <div className={`p-2.5 rounded-lg border text-[11px] flex items-center gap-2 ${
                telegramTestResult.success
                  ? 'bg-terminal-green/10 border-terminal-green/40 text-terminal-green'
                  : 'bg-terminal-red/10 border-terminal-red/40 text-terminal-red'
              }`}>
                {telegramTestResult.success ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{telegramTestResult.message}</span>
              </div>
            )}

            <div className="pt-1 flex flex-wrap gap-2 justify-between items-center">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTestTelegram}
                  disabled={isTestingTelegram || !botToken.trim() || !chatId.trim()}
                  className="py-1.5 px-3 rounded-lg bg-terminal-card border border-terminal-border hover:border-sky-400 text-xs font-bold text-sky-400 flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-40"
                >
                  {isTestingTelegram ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Test Ping Bot
                </button>
                <button
                  type="button"
                  onClick={handleTestTelegramTrade}
                  disabled={isTestingTelegram || !botToken.trim() || !chatId.trim()}
                  className="py-1.5 px-3 rounded-lg bg-sky-500/10 border border-sky-500/30 hover:border-sky-400 text-xs font-bold text-sky-300 flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-40"
                >
                  ⚡ Test Trade Alert
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowHelp(!showHelp)}
                className="text-[10px] text-sky-400 hover:underline flex items-center gap-1 cursor-pointer font-bold"
              >
                <HelpCircle className="w-3 h-3" />
                {showHelp ? 'Tutup Panduan' : 'Panduan Telegram'}
              </button>
            </div>

            {showHelp && (
              <div className="p-3 bg-terminal-bg rounded-lg border border-terminal-border text-[10px] text-terminal-muted space-y-1 leading-relaxed">
                <p>1. Buka Telegram dan cari <strong>@BotFather</strong>, ketik <code>/newbot</code>.</p>
                <p>2. Dapatkan API token bot Anda.</p>
                <p>3. Dapatkan Chat ID dengan membuka <strong>@userinfobot</strong>.</p>
              </div>
            )}
          </div>
        )}

        {/* Discord Tab */}
        {activeTab === 'discord' && (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-terminal-card border border-terminal-border flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-terminal-text block">Aktifkan Discord Webhook</span>
                <span className="text-[10px] text-terminal-muted block">Kirim rich embed alpha alert ke Discord channel</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDiscordEnabled}
                  onChange={(e) => setIsDiscordEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-terminal-panel peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500 border border-terminal-border"></div>
              </label>
            </div>

            <div className="space-y-2 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] text-terminal-muted font-bold block">Discord Webhook URL</label>
                <input
                  type="password"
                  placeholder="https://discord.com/api/webhooks/..."
                  value={discordWebhookUrl}
                  onChange={(e) => setDiscordWebhookUrl(e.target.value)}
                  className="w-full bg-terminal-bg border border-terminal-border rounded-lg px-3 py-2 text-xs text-terminal-text focus:outline-none focus:border-indigo-400 font-mono"
                />
              </div>
            </div>

            {discordTestResult && (
              <div className={`p-2.5 rounded-lg border text-[11px] flex items-center gap-2 ${
                discordTestResult.success
                  ? 'bg-terminal-green/10 border-terminal-green/40 text-terminal-green'
                  : 'bg-terminal-red/10 border-terminal-red/40 text-terminal-red'
              }`}>
                {discordTestResult.success ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{discordTestResult.message}</span>
              </div>
            )}

            <div className="pt-1 flex flex-wrap gap-2 justify-between items-center">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTestDiscord}
                  disabled={isTestingDiscord || !discordWebhookUrl.trim()}
                  className="py-1.5 px-3 rounded-lg bg-terminal-card border border-terminal-border hover:border-indigo-400 text-xs font-bold text-indigo-400 flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-40"
                >
                  {isTestingDiscord ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageSquare className="w-3.5 h-3.5" />}
                  Test Ping Discord
                </button>
                <button
                  type="button"
                  onClick={handleTestDiscordTrade}
                  disabled={isTestingDiscord || !discordWebhookUrl.trim()}
                  className="py-1.5 px-3 rounded-lg bg-indigo-500/10 border border-indigo-500/30 hover:border-indigo-400 text-xs font-bold text-indigo-300 flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-40"
                >
                  ⚡ Test Trade Alert
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowHelp(!showHelp)}
                className="text-[10px] text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer font-bold"
              >
                <HelpCircle className="w-3 h-3" />
                {showHelp ? 'Tutup Panduan' : 'Panduan Discord'}
              </button>
            </div>

            {showHelp && (
              <div className="p-3 bg-terminal-bg rounded-lg border border-terminal-border text-[10px] text-terminal-muted space-y-1 leading-relaxed">
                <p>1. Buka Discord Server &gt; Klik kanan Channel &gt; <strong>Edit Channel</strong>.</p>
                <p>2. Pilih <strong>Integrations</strong> &gt; <strong>Webhooks</strong> &gt; <strong>New Webhook</strong>.</p>
                <p>3. Beri nama &amp; klik <strong>Copy Webhook URL</strong> lalu tempel di atas.</p>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 border-t border-terminal-border flex items-center justify-end gap-2">
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
            Simpan Konfigurasi
          </button>
        </div>

      </div>
    </div>
  );
}
