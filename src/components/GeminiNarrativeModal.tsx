'use client';

import React, { useState } from 'react';
import { Sparkles, Brain, Check, X, ExternalLink, ShieldCheck, AlertTriangle, Key, Loader2 } from 'lucide-react';
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-terminal-panel border border-terminal-border rounded-2xl w-full max-w-lg shadow-2xl p-5 space-y-4 font-mono">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-terminal-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-terminal-cyan/10 border border-terminal-cyan/40 text-terminal-cyan">
              <Sparkles className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-sm font-black text-terminal-text uppercase tracking-wider flex items-center gap-2">
                Gemini AI Narrative Agent Inspector
              </h2>
              <p className="text-[11px] text-terminal-muted">
                Evaluasi Vektor Semantik &amp; Klasifikasi Meta Solana Real-Time
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-terminal-card text-terminal-muted hover:text-terminal-text transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selected Token Overview */}
        <div className="p-3 bg-terminal-card rounded-xl border border-terminal-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {token.iconUrl ? (
              <img src={token.iconUrl} alt={token.symbol} className="w-9 h-9 rounded-lg object-cover border border-terminal-border" />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-terminal-panel border border-terminal-border flex items-center justify-center font-bold text-xs text-terminal-text">
                {token.symbol.slice(0, 3)}
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-sm text-terminal-text">{token.symbol}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-terminal-bg border border-terminal-border text-terminal-muted">
                  {token.platform}
                </span>
              </div>
              <p className="text-[11px] text-terminal-muted truncate max-w-[240px]">{token.name}</p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-terminal-muted block">SEED COS-SIM</span>
            <span className="font-mono font-bold text-terminal-cyan">
              {token.narrativeCosineSim.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Evaluation Trigger & Key Toggle */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-terminal-muted flex items-center gap-1">
              <Brain className="w-3.5 h-3.5 text-terminal-cyan" /> Model: Gemini 1.5 Flash (atau Heuristic)
            </span>
            <button
              onClick={() => setShowKeyInput(!showKeyInput)}
              className="text-[10px] text-terminal-cyan hover:underline flex items-center gap-1"
            >
              <Key className="w-3 h-3" /> {showKeyInput ? 'Sembunyikan Key' : 'Custom API Key'}
            </button>
          </div>

          {showKeyInput && (
            <input
              type="password"
              placeholder="Masukkan GEMINI_API_KEY (opsional jika sudah di .env)..."
              value={customKey}
              onChange={(e) => setCustomKey(e.target.value)}
              className="w-full bg-terminal-bg border border-terminal-border rounded-lg px-3 py-1.5 text-xs text-terminal-text focus:outline-none focus:border-terminal-cyan font-mono"
            />
          )}

          {!evaluation && (
            <button
              onClick={handleEvaluate}
              disabled={isLoading}
              className="w-full py-2.5 bg-terminal-cyan/15 hover:bg-terminal-cyan/25 border border-terminal-cyan/50 text-terminal-cyan font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_12px_rgba(0,240,255,0.15)]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Mengevaluasi Semantik dengan Gemini AI...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Jalankan Evaluasi Narasi Gemini AI
                </>
              )}
            </button>
          )}
        </div>

        {/* AI Result Card */}
        {evaluation && (
          <div className="p-3.5 rounded-xl bg-terminal-card border border-terminal-border space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-terminal-muted uppercase">
                Hasil Analisis Semantik AI
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-black tracking-wider ${
                evaluation.isAiApproved
                  ? 'bg-terminal-green/20 text-terminal-green border border-terminal-green/50'
                  : 'bg-terminal-red/20 text-terminal-red border border-terminal-red/50'
              }`}>
                {evaluation.isAiApproved ? 'AI APPROVE' : 'AI VETO'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 bg-terminal-panel rounded border border-terminal-border">
                <span className="text-terminal-muted text-[10px] block">TEMA DOMINAN</span>
                <span className="font-bold text-terminal-text">{evaluation.dominantTheme}</span>
              </div>
              <div className="p-2 bg-terminal-panel rounded border border-terminal-border">
                <span className="text-terminal-muted text-[10px] block">COSINE SIMILARITY</span>
                <span className={`font-mono font-bold ${
                  evaluation.cosineSimilarity >= PRD_THRESHOLDS.MIN_COSINE_SIMILARITY
                    ? 'text-terminal-green'
                    : 'text-terminal-red'
                }`}>
                  {evaluation.cosineSimilarity.toFixed(2)} (Ambang: &ge; {PRD_THRESHOLDS.MIN_COSINE_SIMILARITY})
                </span>
              </div>
            </div>

            <div className="p-2.5 bg-terminal-panel rounded border border-terminal-border space-y-1">
              <span className="text-[10px] text-terminal-muted block font-bold">RATIONALISASI GEMINI AI:</span>
              <p className="text-[11px] text-terminal-text leading-relaxed font-sans">
                {evaluation.analysis}
              </p>
            </div>

            <div className="flex items-center justify-between text-[9px] text-terminal-muted pt-1 border-t border-terminal-border/50">
              <span>Engine: {evaluation.modelUsed}</span>
              <button
                onClick={handleEvaluate}
                disabled={isLoading}
                className="text-terminal-cyan hover:underline cursor-pointer"
              >
                {isLoading ? 'Mengevaluasi...' : 'Evaluasi Ulang'}
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 border-t border-terminal-border flex items-center justify-between text-[10px] text-terminal-muted">
          <span>PRD §4 Multi-Agent Narrative Threshold: &ge; 0.85</span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-terminal-card border border-terminal-border rounded hover:text-terminal-text transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
