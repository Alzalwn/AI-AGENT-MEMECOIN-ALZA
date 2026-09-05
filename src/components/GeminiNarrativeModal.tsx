'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Brain,
  Check,
  X,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Key,
  Loader2,
  Copy,
  Terminal,
  Zap,
  Flame,
  Bot
} from 'lucide-react';
import { TokenSignal } from '../types/terminal';
import { GeminiNarrativeEvaluation } from '../lib/gemini';
import { GrokNarrativeEvaluation } from '../lib/grok';
import { PRD_THRESHOLDS } from '../config/constants';

interface GeminiNarrativeModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: TokenSignal | null;
}

export default function GeminiNarrativeModal({
  isOpen,
  onClose,
  token,
}: GeminiNarrativeModalProps) {
  const [selectedEngine, setSelectedEngine] = useState<'GROK' | 'GEMINI'>('GROK');
  
  // Results
  const [geminiResult, setGeminiResult] = useState<GeminiNarrativeEvaluation | null>(null);
  const [grokResult, setGrokResult] = useState<GrokNarrativeEvaluation | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // API Keys (with localStorage persistence)
  const [grokKey, setGrokKey] = useState<string>('');
  const [geminiKey, setGeminiKey] = useState<string>('');
  const [showKeyInput, setShowKeyInput] = useState<boolean>(false);
  const [showPromptDetails, setShowPromptDetails] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Load stored keys on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedGrok = localStorage.getItem('GT_XAI_KEY') || '';
      const storedGemini = localStorage.getItem('GT_GEMINI_KEY') || '';
      setGrokKey(storedGrok);
      setGeminiKey(storedGemini);
    }
  }, []);

  // Auto-evaluate token upon opening modal or changing token / engine
  useEffect(() => {
    if (isOpen && token) {
      handleEvaluate(selectedEngine);
    }
  }, [isOpen, token?.mint, selectedEngine]);

  if (!isOpen || !token) return null;

  const handleEvaluate = async (engine: 'GROK' | 'GEMINI') => {
    if (!token) return;
    try {
      setIsLoading(true);
      if (engine === 'GROK') {
        const res = await fetch('/api/grok/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            apiKey: grokKey.trim() || undefined,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setGrokResult(data);
        }
      } else {
        const res = await fetch('/api/narrative/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            apiKey: geminiKey.trim() || undefined,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setGeminiResult(data);
        }
      }
    } catch (err) {
      console.error(`Failed to run ${engine} narrative evaluation:`, err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveKeys = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('GT_XAI_KEY', grokKey.trim());
      localStorage.setItem('GT_GEMINI_KEY', geminiKey.trim());
    }
    setShowKeyInput(false);
    handleEvaluate(selectedEngine);
  };

  const handleCopyMint = () => {
    if (navigator?.clipboard && token.mint) {
      navigator.clipboard.writeText(token.mint);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isApproved = selectedEngine === 'GROK'
    ? grokResult?.isAiApproved
    : geminiResult?.isAiApproved;

  const cosineSim = selectedEngine === 'GROK'
    ? grokResult?.cosineSimilarity
    : geminiResult?.cosineSimilarity;

  const dominantTheme = selectedEngine === 'GROK'
    ? grokResult?.dominantTheme
    : geminiResult?.dominantTheme;

  const analysisText = selectedEngine === 'GROK'
    ? grokResult?.analysis
    : geminiResult?.analysis;

  const modelUsed = selectedEngine === 'GROK'
    ? grokResult?.modelUsed
    : geminiResult?.modelUsed;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-terminal-panel border border-terminal-border rounded-2xl w-full max-w-lg shadow-2xl p-5 space-y-4 font-mono select-none">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-terminal-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg border ${
              selectedEngine === 'GROK'
                ? 'bg-terminal-green/10 border-terminal-green/40 text-terminal-green'
                : 'bg-terminal-cyan/10 border-terminal-cyan/40 text-terminal-cyan'
            }`}>
              {selectedEngine === 'GROK' ? <Zap className="w-5 h-5 animate-pulse" /> : <Sparkles className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-sm font-black text-terminal-text uppercase tracking-wider flex items-center gap-2">
                AI Narrative & Alpha Inspector
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-terminal-green/20 border border-terminal-green/40 text-terminal-green">
                  {selectedEngine === 'GROK' ? 'xAI GROK-2' : 'GEMINI 1.5'}
                </span>
              </h2>
              <p className="text-[11px] text-terminal-muted">
                {selectedEngine === 'GROK'
                  ? 'Real-Time X/Twitter Virality, Sentiment & Cultural Alpha'
                  : 'Vektor Semantik Cosine Similarity & Solana Meta Classification'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-terminal-card text-terminal-muted hover:text-terminal-text transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* AI Engine Switcher Tab */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-terminal-bg rounded-xl border border-terminal-border">
          <button
            onClick={() => setSelectedEngine('GROK')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedEngine === 'GROK'
                ? 'bg-terminal-card border border-terminal-green/50 text-terminal-green shadow-[0_0_12px_rgba(13,242,137,0.15)]'
                : 'text-terminal-muted hover:text-terminal-text'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-terminal-green" />
            <span>xAI Grok Engine</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-terminal-green/20 text-terminal-green font-normal">
              Twitter Alpha
            </span>
          </button>

          <button
            onClick={() => setSelectedEngine('GEMINI')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedEngine === 'GEMINI'
                ? 'bg-terminal-card border border-terminal-cyan/50 text-terminal-cyan shadow-[0_0_12px_rgba(34,211,238,0.15)]'
                : 'text-terminal-muted hover:text-terminal-text'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-terminal-cyan" />
            <span>Google Gemini</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-terminal-cyan/20 text-terminal-cyan font-normal">
              Semantic
            </span>
          </button>
        </div>

        {/* Selected Token Overview */}
        <div className="p-3 bg-terminal-card rounded-xl border border-terminal-border flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            {token.iconUrl ? (
              <img src={token.iconUrl} alt={token.symbol} className="w-10 h-10 rounded-lg object-cover border border-terminal-border shrink-0 mt-0.5" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-terminal-panel border border-terminal-border flex items-center justify-center font-bold text-xs text-terminal-text shrink-0 mt-0.5">
                {token.symbol.slice(0, 3)}
              </div>
            )}
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-black text-base text-terminal-text">{token.symbol}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-terminal-bg border border-terminal-border text-terminal-muted">
                  {token.platform}
                </span>
                {token.isRealData && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-terminal-green/20 text-terminal-green font-bold">
                    ON-CHAIN LIVE
                  </span>
                )}
              </div>
              <p className="text-[11px] text-terminal-muted truncate max-w-[220px]">{token.name}</p>
              
              <div className="flex items-center gap-2 pt-0.5 text-[10px]">
                <button
                  onClick={handleCopyMint}
                  className="text-terminal-muted hover:text-terminal-text flex items-center gap-1 cursor-pointer"
                  title="Copy Mint Address"
                >
                  <span className="font-mono text-terminal-cyan truncate max-w-[120px]">{token.mint}</span>
                  {copied ? <Check className="w-3 h-3 text-terminal-green" /> : <Copy className="w-3 h-3" />}
                </button>

                {token.dexUrl && (
                  <a
                    href={token.dexUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-terminal-green hover:underline flex items-center gap-0.5 text-[10px]"
                  >
                    DexScreener <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[9px] text-terminal-muted block">INITIAL LP</span>
            <span className="font-mono font-bold text-terminal-green text-xs block">
              ${token.initialLpUsd.toLocaleString()}
            </span>
            <span className="text-[9px] text-terminal-muted block mt-1">BASE COS-SIM</span>
            <span className="font-mono font-bold text-terminal-cyan text-xs">
              {token.narrativeCosineSim.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Custom API Key Collapsible */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-terminal-muted flex items-center gap-1">
              <Bot className="w-3.5 h-3.5 text-terminal-cyan" />
              Engine: {selectedEngine === 'GROK' ? 'xAI Grok-2 (or Heuristic)' : 'Gemini 1.5 Flash (or Heuristic)'}
            </span>
            <button
              onClick={() => setShowKeyInput(!showKeyInput)}
              className="text-terminal-cyan hover:underline flex items-center gap-1 cursor-pointer font-bold"
            >
              <Key className="w-3 h-3" /> {showKeyInput ? 'Tutup Konfigurasi Key' : 'Atur Custom API Key'}
            </button>
          </div>

          {showKeyInput && (
            <div className="p-3 bg-terminal-bg rounded-xl border border-terminal-border space-y-2.5 animate-in fade-in">
              <div className="space-y-1">
                <label className="text-[10px] text-terminal-muted flex items-center justify-between">
                  <span>xAI Grok API Key (xai-...)</span>
                  <span className="text-[9px] text-terminal-green">Tersimpan di Local Browser</span>
                </label>
                <input
                  type="password"
                  placeholder="xai-xxxxxxxxxxxxxxxx..."
                  value={grokKey}
                  onChange={(e) => setGrokKey(e.target.value)}
                  className="w-full bg-terminal-panel border border-terminal-border rounded-lg px-3 py-1.5 text-xs text-terminal-text focus:outline-none focus:border-terminal-green font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-terminal-muted flex items-center justify-between">
                  <span>Google Gemini API Key (AIzaSy...)</span>
                </label>
                <input
                  type="password"
                  placeholder="AIzaSy-xxxxxxxx..."
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  className="w-full bg-terminal-panel border border-terminal-border rounded-lg px-3 py-1.5 text-xs text-terminal-text focus:outline-none focus:border-terminal-cyan font-mono"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  onClick={handleSaveKeys}
                  className="px-3 py-1.5 bg-terminal-card border border-terminal-green text-terminal-green rounded-lg text-xs font-bold hover:bg-terminal-green/10 transition-colors cursor-pointer"
                >
                  Simpan &amp; Evaluasi Ulang
                </button>
              </div>
            </div>
          )}
        </div>

        {/* AI Result Card or Loading Indicator */}
        {isLoading ? (
          <div className="p-6 rounded-xl bg-terminal-card border border-terminal-border text-center space-y-2.5 animate-pulse">
            <Loader2 className={`w-6 h-6 animate-spin mx-auto ${
              selectedEngine === 'GROK' ? 'text-terminal-green' : 'text-terminal-cyan'
            }`} />
            <p className="font-bold text-xs text-terminal-text">
              {selectedEngine === 'GROK'
                ? 'Menghubungkan ke xAI Grok untuk Analisis Sentimen X...'
                : 'Menjalankan Inferensi Semantik Gemini AI...'}
            </p>
            <p className="text-[10px] text-terminal-muted">
              {selectedEngine === 'GROK'
                ? 'Membedah potensi viralitas meme, korelasi kultural, dan probabilitas bot farm'
                : 'Mengevaluasi keselarasan narasi koin terhadap klaster aktif Solana (AI, PolitiFi, Cults, Animals)'}
            </p>
          </div>
        ) : (selectedEngine === 'GROK' ? grokResult : geminiResult) ? (
          <div className="p-3.5 rounded-xl bg-terminal-card border border-terminal-border space-y-3 animate-in fade-in duration-200">
            
            {/* Approval Status Header */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-terminal-muted uppercase flex items-center gap-1.5">
                {selectedEngine === 'GROK' ? <Zap className="w-3.5 h-3.5 text-terminal-green" /> : <Brain className="w-3.5 h-3.5 text-terminal-cyan" />}
                {selectedEngine === 'GROK' ? 'Hasil Analisis xAI Grok' : 'Hasil Analisis Vektor Gemini'}
              </span>
              <span className={`text-[10px] px-2.5 py-0.5 rounded font-black tracking-wider ${
                isApproved
                  ? 'bg-terminal-green/20 text-terminal-green border border-terminal-green/50 shadow-[0_0_8px_rgba(13,242,137,0.25)]'
                  : 'bg-terminal-red/20 text-terminal-red border border-terminal-red/50'
              }`}>
                {isApproved ? 'AI APPROVED (>= 0.85)' : 'AI VETOED (< 0.85)'}
              </span>
            </div>

            {/* Grok-specific Meme Virality & Twitter Sentiment Grid */}
            {selectedEngine === 'GROK' && grokResult && (
              <div className="p-3 bg-terminal-panel rounded-xl border border-terminal-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-terminal-muted font-bold flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-orange-400" />
                    X / TWITTER MEME VIRALITY SCORE
                  </span>
                  <span className="font-mono font-black text-sm text-terminal-green">
                    {grokResult.memeViralityScore}/100
                  </span>
                </div>
                
                {/* Virality Progress Bar */}
                <div className="w-full bg-terminal-bg h-2 rounded-full overflow-hidden border border-terminal-border">
                  <div
                    className={`h-full transition-all duration-500 ${
                      grokResult.memeViralityScore >= 75
                        ? 'bg-gradient-to-r from-terminal-green to-emerald-400 shadow-[0_0_8px_rgba(13,242,137,0.6)]'
                        : grokResult.memeViralityScore >= 45
                        ? 'bg-yellow-400'
                        : 'bg-terminal-red'
                    }`}
                    style={{ width: `${grokResult.memeViralityScore}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] pt-1">
                  <span className="text-terminal-muted flex items-center gap-1.5">
                    <span className="font-bold text-sky-400 text-xs leading-none">𝕏</span> Sentiment:
                  </span>
                  <span className={`px-2 py-0.5 rounded font-black text-[9px] ${
                    grokResult.twitterSentiment === 'EXTREME_BULLISH'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : grokResult.twitterSentiment === 'BULLISH'
                      ? 'bg-terminal-green/20 text-terminal-green border border-terminal-green/40'
                      : grokResult.twitterSentiment === 'BOT_FARM_SUSPECT'
                      ? 'bg-terminal-red/20 text-terminal-red border border-terminal-red/40'
                      : 'bg-terminal-card text-terminal-muted border border-terminal-border'
                  }`}>
                    {grokResult.twitterSentiment}
                  </span>
                </div>
              </div>
            )}

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 bg-terminal-panel rounded-lg border border-terminal-border">
                <span className="text-terminal-muted text-[10px] block">TEMA DOMINAN</span>
                <span className="font-bold text-terminal-text">{dominantTheme}</span>
              </div>
              <div className="p-2 bg-terminal-panel rounded-lg border border-terminal-border">
                <span className="text-terminal-muted text-[10px] block">COSINE SIMILARITY</span>
                <span className={`font-mono font-bold ${
                  (cosineSim ?? 0) >= PRD_THRESHOLDS.MIN_COSINE_SIMILARITY
                    ? 'text-terminal-green glow-green'
                    : 'text-terminal-red'
                }`}>
                  {(cosineSim ?? 0).toFixed(2)} (Ambang: &ge; {PRD_THRESHOLDS.MIN_COSINE_SIMILARITY})
                </span>
              </div>
            </div>

            {/* AI Analysis Text */}
            <div className="p-3 bg-terminal-panel rounded-lg border border-terminal-border space-y-1">
              <span className="text-[10px] text-terminal-muted block font-bold flex items-center gap-1">
                {selectedEngine === 'GROK' ? (
                  <Zap className="w-3 h-3 text-terminal-green" />
                ) : (
                  <Brain className="w-3 h-3 text-terminal-cyan" />
                )}
                {selectedEngine === 'GROK' ? 'OPINI & ANALISIS xAI GROK:' : 'RATIONALISASI GEMINI AI:'}
              </span>
              <p className="text-[11px] text-terminal-text leading-relaxed font-sans">
                {analysisText}
              </p>
            </div>

            {/* Prompt Details Collapsible */}
            <div>
              <button
                onClick={() => setShowPromptDetails(!showPromptDetails)}
                className="text-[10px] text-terminal-muted hover:text-terminal-text flex items-center gap-1 cursor-pointer"
              >
                <Terminal className="w-3 h-3" />
                {showPromptDetails ? 'Sembunyikan System Prompt' : 'Lihat System Prompt LLM'}
              </button>
              {showPromptDetails && (
                <div className="mt-1.5 p-2 bg-terminal-bg rounded border border-terminal-border text-[9px] text-terminal-muted font-mono leading-relaxed max-h-[110px] overflow-y-auto">
                  {selectedEngine === 'GROK'
                    ? `[xAI Grok System] Analisis viralitas token ${token.symbol} (${token.name}) terhadap narasi aktif X (Twitter). Hitung meme virality score 0-100, korelasi sentimen, dan filter bot-farm.`
                    : `[Gemini System] Analisis token ${token.symbol} (${token.name}) terhadap 4 klaster narasi Solana aktif (AI/AGENTIC, POLITIFI, CULT, ANIMALS). Suhu: 0.2.`}
                </div>
              )}
            </div>

            {/* Footer Status */}
            <div className="flex items-center justify-between text-[9px] text-terminal-muted pt-1 border-t border-terminal-border/50">
              <span>Engine Active: <strong className="text-terminal-text">{modelUsed}</strong></span>
              <button
                onClick={() => handleEvaluate(selectedEngine)}
                disabled={isLoading}
                className="text-terminal-green hover:underline cursor-pointer font-bold"
              >
                Evaluasi Ulang
              </button>
            </div>
          </div>
        ) : null}

        {/* Modal Footer */}
        <div className="pt-2 border-t border-terminal-border flex items-center justify-between text-[10px] text-terminal-muted">
          <span>PRD §4 Narrative Threshold: Cosine Sim &ge; 0.85</span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-terminal-card border border-terminal-border rounded hover:text-terminal-text transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
