'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, User, ChevronDown, Sparkles, ShieldCheck, Trash2, Zap } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

const QUICK_ACTIONS = [
  { label: '🛡️ 10 Perintah Trader', query: 'Sebutkan 10 Perintah Trader Binance Futures dari SOP resmi saya dan checklist yang harus saya patuhi sebelum entry.' },
  { label: '🚨 Status Bitcoin Guard', query: 'Bagaimana aturan Bitcoin Guard saat ini? Apakah saya diizinkan Long altcoin jika BTC dump?' },
  { label: '📉 Kalkulasi Sizing 2%', query: 'Jelaskan cara menghitung position sizing dengan modal $1000 agar risiko saya tetap maksimal 2% sesuai SOP.' },
  { label: '🛑 Protokol 2x Stop Loss', query: 'Apa yang harus saya lakukan jika hari ini saya sudah terkena 2x Stop Loss berturut-turut?' },
  { label: '🎯 Setup Koin Terbaik', query: 'Koin futures mana dari sinyal aktif saat ini yang memiliki konfluensi tertinggi dan RR paling bagus?' },
];

export const FuturesAIChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'model',
      text: 'Halo Alza! Saya Binance Futures Copilot pribadi Anda. SOP 10 Perintah Trader & protokol manajemen risiko 2% telah aktif mengawal setiap setup trade Anda. Koin mana yang ingin kita analisa hari ini?',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const sendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMessage = textToSend.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessages((prev) => [...prev, { role: 'model', text: data.reply }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'model', text: `⚠️ ${data.error || 'Terjadi kesalahan saat memproses jawaban AI.'}` },
        ]);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: 'model', text: '⚠️ Gagal terhubung ke AI server. Periksa koneksi jaringan Anda.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleClearChat = () => {
    setMessages([
      {
        role: 'model',
        text: 'Riwayat percakapan dibersihkan. Alza, saya siap mengawal eksekusi sinyal Binance Futures Anda berikutnya.',
      },
    ]);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Chat Window */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-[340px] sm:w-[420px] h-[580px] max-h-[85vh] bg-zinc-950/95 backdrop-blur-xl border border-emerald-500/30 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-emerald-950/40 border-b border-zinc-800 p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm text-zinc-100 tracking-wide">Alza&apos;s Futures Copilot</h3>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono font-semibold">
                    PRO
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                    <span className="text-emerald-400 font-medium">SOP Guard Active</span>
                  </span>
                  <span>•</span>
                  <span className="text-amber-400/90 font-mono">Max 2% Risk</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleClearChat}
                title="Bersihkan chat"
                className="p-1.5 hover:bg-zinc-800/80 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Tutup jendela"
                className="p-1.5 hover:bg-zinc-800/80 rounded-lg text-zinc-400 hover:text-white transition-colors"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Action Chips */}
          <div className="bg-zinc-900/60 border-b border-zinc-800/70 px-3 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
            <span className="text-[10px] uppercase font-mono font-bold text-zinc-500 shrink-0 flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" /> SOP:
            </span>
            {QUICK_ACTIONS.map((action, idx) => (
              <button
                key={idx}
                onClick={() => sendMessage(action.query)}
                disabled={isLoading}
                className="shrink-0 px-2.5 py-1 rounded-full bg-zinc-800/80 hover:bg-emerald-500/20 hover:border-emerald-500/40 border border-zinc-700/60 text-zinc-300 hover:text-emerald-300 text-[11px] font-medium transition-all"
              >
                {action.label}
              </button>
            ))}
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-amber-500/20 border border-amber-500/50 text-amber-400'
                      : 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-400'
                  }`}
                >
                  {msg.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>
                <div
                  className={`max-w-[84%] rounded-2xl p-3 text-xs sm:text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white rounded-tr-none shadow-md'
                      : 'bg-zinc-900/90 border border-zinc-800 text-zinc-200 rounded-tl-none shadow-sm'
                  }`}
                  style={{ whiteSpace: 'pre-wrap' }}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2.5 flex-row">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center shrink-0 text-emerald-400">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="bg-zinc-900/90 border border-zinc-800 text-zinc-400 rounded-2xl rounded-tl-none p-3 text-xs flex items-center gap-2">
                  <span className="text-[11px] font-mono text-emerald-400 animate-pulse">Menghitung konfluensi SOP...</span>
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleFormSubmit} className="p-3 bg-zinc-900/90 border-t border-zinc-800/80">
            <div className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Tanya Alza's Copilot (misal: review setup SOL, kalkulasi risk 2%)..."
                className="w-full bg-zinc-950/80 border border-zinc-700/60 rounded-xl pl-3.5 pr-11 py-2.5 text-xs sm:text-sm text-zinc-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 placeholder:text-zinc-500"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 font-bold rounded-lg transition-all shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[10px] text-zinc-500 px-1">
              <span>Binance Futures USDT-M Dedicated Engine</span>
              <span className="font-mono text-emerald-500/80">SOP v1.0 Inst.</span>
            </div>
          </form>
        </div>
      )}

      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative w-14 h-14 rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 text-zinc-950 shadow-[0_0_25px_rgba(16,185,129,0.4)] hover:shadow-[0_0_35px_rgba(16,185,129,0.6)] transition-all hover:scale-105 flex items-center justify-center animate-in zoom-in"
        >
          <Sparkles className="w-6 h-6 transition-transform group-hover:rotate-12" />
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500 border-2 border-zinc-950"></span>
          </span>
        </button>
      )}
    </div>
  );
};
