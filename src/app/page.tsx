'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Activity, 
  BarChart2, 
  Library, 
  History, 
  Wallet, 
  Bot, 
  ArrowRight,
  TrendingUp,
  LineChart
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const features = [
  {
    title: 'Alpha Zoo',
    description: '462 Algoritma Kuantitatif siap pakai untuk mencari anomali pasar.',
    icon: <Bot className="w-6 h-6 text-emerald-400" />,
    href: '/alpha-zoo',
    status: 'BETA'
  },
  {
    title: 'Shadow Account',
    description: 'Analisis psikologi trading dari jurnal (Overtrading, Win-Rate).',
    icon: <History className="w-6 h-6 text-purple-400" />,
    href: '/shadow-account',
    status: 'WIP'
  },
  {
    title: 'Quant Library',
    description: '306 Fungsi matematika finansial (Value at Risk, Greeks, ATR).',
    icon: <Library className="w-6 h-6 text-blue-400" />,
    href: '/quant-library',
    status: 'WIP'
  },
  {
    title: 'Futures Backtester',
    description: 'Simulasi strategi Multi-Market di Binance USD-M Futures.',
    icon: <LineChart className="w-6 h-6 text-orange-400" />,
    href: '/backtest',
    status: 'WIP'
  },
  {
    title: 'Local Portfolio',
    description: 'Agregator saldo & manajemen risiko Binance Futures.',
    icon: <Wallet className="w-6 h-6 text-pink-400" />,
    href: '/portfolio',
    status: 'WIP'
  },
  {
    title: 'Signal Generator',
    description: 'Live Technical Indicator Generator (RSI, MACD, BB, ADX).',
    icon: <Activity className="w-6 h-6 text-cyan-400" />,
    href: '/signals',
    status: 'LIVE'
  }
];

export default function BinanceFuturesDashboard() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white selection:bg-emerald-500/30 font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-yellow-900/10 via-zinc-950 to-zinc-950 pointer-events-none" />
      
      {/* Top Navigation */}
      <header className="relative z-10 border-b border-zinc-800/80 bg-zinc-900/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-yellow-500/20 border border-yellow-500/50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-yellow-400" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Binance Futures Pro</h1>
          </div>
          
          <Link href="/solana" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-all text-sm font-medium">
            Switch to Solana Memecoins <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12">
          <h2 className="text-4xl font-black tracking-tighter mb-4">Enterprise Quant Terminal</h2>
          <p className="text-zinc-400 max-w-2xl text-lg">
            Sistem eksekusi & analitik tingkat institusi. Pilih modul di bawah ini untuk memulai pemindaian pasar Binance Futures.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, idx) => (
            <Link 
              key={idx} 
              href={feature.href}
              className="group relative flex flex-col p-6 bg-zinc-900/40 hover:bg-zinc-800/60 border border-zinc-800/80 hover:border-zinc-700 rounded-2xl transition-all duration-300 overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4">
                <span className={cn(
                  "px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase",
                  feature.status === 'LIVE' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                  feature.status === 'BETA' ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                  "bg-zinc-800 text-zinc-500 border border-zinc-700"
                )}>
                  {feature.status}
                </span>
              </div>
              
              <div className="w-12 h-12 rounded-xl bg-zinc-800/50 border border-zinc-700/50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                {feature.icon}
              </div>
              
              <h3 className="text-xl font-bold text-zinc-100 mb-2">{feature.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed flex-1">
                {feature.description}
              </p>
              
              <div className="mt-6 flex items-center gap-2 text-sm font-medium text-zinc-500 group-hover:text-yellow-400 transition-colors">
                Buka Modul <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
