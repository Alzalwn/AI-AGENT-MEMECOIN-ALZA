'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Brain, Check, X, ExternalLink, ShieldCheck, AlertTriangle, Key, Loader2, Copy, Terminal } from 'lucide-react';
import { TokenSignal } from '../types/terminal';
import { GeminiNarrativeEvaluation } from '../lib/gemini';
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
  const [evaluation, setEvaluation] = useState<GeminiNarrativeEvaluation | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [customKey, setCustomKey] = useState<string>('');
  const [showKeyInput, setShowKeyInput] = useState<boolean>(false);
  const [showPromptDetails, setShowPromptDetails] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Auto-evaluate token upon opening modal or changing token
  useEffect(() => {
    if (isOpen && token) {
      setEvaluation(null);
      handleEvaluate();
    }
  }, [isOpen, token?.mint]);

  if (!isOpen || !token) return null;

  const handleEvaluate = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/narrative/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          apiKey: customKey.trim() || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setEvaluation(data);
      }
    } catch (err) {
      console.error('Failed to run Gemini narrative evaluation:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyMint = () => {
    if (navigator?.clipboard && token.mint) {
      navigator.clipboard.writeText(token.mint);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-terminal-panel border border-terminal-border rounded-2xl w-full max-w-lg shadow-2xl p-5 space-y-4 font-mono select-none">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-terminal-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-terminal-cyan/10 border border-terminal-cyan/40 text-terminal-cyan">
              <Sparkles className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-sm font-black text-terminal-text uppercase tracking-wider flex items-center gap-2">
                Gemini AI Narrative Agent Inspector
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-terminal-cyan/20 border border-terminal-cyan/40 text-terminal-cyan">
                  PRD §4 &amp; §5
                </span>
              </h2>
              <p className="text-[11px] text-terminal-muted">
                Evaluasi Vektor Semantik &amp; Klasifikasi Meta Solana Real-Time
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
            <span className="text-[9px] text-terminal-muted block">SEED COS-SIM</span>
            <span className="font-mono font-bold text-terminal-cyan text-sm">
              {token.narrativeCosineSim.toFixed(2)}
            </span>
          </div>
        </div>

        {/* API Key Toggle & Model Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-terminal-muted flex items-center gap-1">
              <Brain className="w-3.5 h-3.5 text-terminal-cyan" /> Model: Gemini 1.5 Flash (atau Heuristic Vector)
            </span>
            <button
              onClick={() => setShowKeyInput(!showKeyInput)}
              className="text-terminal-cyan hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Key className="w-3 h-3" /> {showKeyInput ? 'Tutup Input Key' : 'Gunakan Custom API Key'}
            </button>
          </div>

          {showKeyInput && (
            <input
              type="password"
              placeholder="Masukkan GEMINI_API_KEY..."
              value={customKey}
              onChange={(e) => setCustomKey(e.target.value)}
              className="w-full bg-terminal-bg border border-terminal-border rounded-lg px-3 py-1.5 text-xs text-terminal-text focus:outline-none focus:border-terminal-cyan font-mono"
            />
          )}
        </div>

        {/* AI Result Card or Loading Indicator */}
        {isLoading ? (
          <div className="p-6 rounded-xl bg-terminal-card border border-terminal-border text-center space-y-2.5 animate-pulse">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-terminal-cyan" />
            <p className="font-bold text-xs text-terminal-text">Menjalankan Inferensi Semantik AI...</p>
            <p className="text-[10px] text-terminal-muted">
              Mengevaluasi keselarasan narasi koin terhadap klaster aktif Solana (AI/Agentic, PolitiFi, Cults, Animals)
            </p>
          </div>
        ) : evaluation ? (
          <div className="p-3.5 rounded-xl bg-terminal-card border border-terminal-border space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-terminal-muted uppercase">
                Hasil Analisis Vektor Semantik
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-black tracking-wider ${
                evaluation.isAiApproved
                  ? 'bg-terminal-green/20 text-terminal-green border border-terminal-green/50 shadow-[0_0_8px_rgba(13,242,137,0.25)]'
                  : 'bg-terminal-red/20 text-terminal-red border border-terminal-red/50'
              }`}>
                {evaluation.isAiApproved ? 'AI APPROVED (>= 0.85)' : 'AI VETOED (< 0.85)'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 bg-terminal-panel rounded-lg border border-terminal-border">
                <span className="text-terminal-muted text-[10px] block">TEMA DOMINAN</span>
                <span className="font-bold text-terminal-text">{evaluation.dominantTheme}</span>
              </div>
              <div className="p-2 bg-terminal-panel rounded-lg border border-terminal-border">
                <span className="text-terminal-muted text-[10px] block">COSINE SIMILARITY</span>
                <span className={`font-mono font-bold ${
                  evaluation.cosineSimilarity >= PRD_THRESHOLDS.MIN_COSINE_SIMILARITY
                    ? 'text-terminal-green glow-green'
                    : 'text-terminal-red'
                }`}>
                  {evaluation.cosineSimilarity.toFixed(2)} (Ambang: &ge; {PRD_THRESHOLDS.MIN_COSINE_SIMILARITY})
                </span>
              </div>
            </div>

            <div className="p-3 bg-terminal-panel rounded-lg border border-terminal-border space-y-1">
              <span className="text-[10px] text-terminal-muted block font-bold flex items-center gap-1">
                <Brain className="w-3 h-3 text-terminal-cyan" /> RATIONALISASI GEMINI AI:
              </span>
              <p className="text-[11px] text-terminal-text leading-relaxed font-sans">
                {evaluation.analysis}
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
                  Analisis token <code>{token.symbol}</code> ({token.name}) terhadap 4 klaster narasi Solana aktif (AI/AGENTIC, POLITIFI, CULT, ANIMALS). Suhu generasi: 0.2. Respon JSON terstruktur.
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-[9px] text-terminal-muted pt-1 border-t border-terminal-border/50">
              <span>Engine: <strong>{evaluation.modelUsed}</strong></span>
              <button
                onClick={handleEvaluate}
                disabled={isLoading}
                className="text-terminal-cyan hover:underline cursor-pointer font-bold"
              >
                Evaluasi Ulang
              </button>
            </div>
          </div>
        ) : null}

        {/* Footer */}
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
