'use client';

import React from 'react';
import { 
  Activity, 
  Library, 
  History, 
  Wallet, 
  Bot, 
  LineChart
} from 'lucide-react';
import Link from 'next/link';

const modules = [
  {
    title: 'Alpha Zoo',
    icon: <Bot className="w-4 h-4 text-emerald-400" />,
    href: '/alpha-zoo',
    status: 'BETA'
  },
  {
    title: 'Shadow Account',
    icon: <History className="w-4 h-4 text-purple-400" />,
    href: '/shadow-account',
    status: 'WIP'
  },
  {
    title: 'Quant Library',
    icon: <Library className="w-4 h-4 text-blue-400" />,
    href: '/quant-library',
    status: 'WIP'
  },
  {
    title: 'Cross-Market Backtester',
    icon: <LineChart className="w-4 h-4 text-orange-400" />,
    href: '/backtest',
    status: 'WIP'
  },
  {
    title: 'Local Portfolio',
    icon: <Wallet className="w-4 h-4 text-pink-400" />,
    href: '/portfolio',
    status: 'LIVE'
  },
  {
    title: 'Signal Generator',
    icon: <Activity className="w-4 h-4 text-cyan-400" />,
    href: '/signals',
    status: 'LIVE'
  }
];

export const FuturesEcosystemNav: React.FC = () => {
  return (
    <div className="bg-[#0e0e0e] border border-white/5 rounded-2xl p-3 flex flex-col sm:flex-row items-center gap-3 shadow-xl overflow-x-auto custom-scrollbar">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg shrink-0">
        <span className="text-xs font-bold text-yellow-500 uppercase tracking-wider">Pro Ecosystem</span>
      </div>
      
      <div className="flex items-center gap-2 min-w-max">
        {modules.map((mod, idx) => (
          <Link 
            key={idx} 
            href={mod.href}
            className="group flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-xl transition-all cursor-pointer"
            onClick={(e) => {
               if (mod.status === 'WIP') {
                 e.preventDefault();
                 alert(`Modul ${mod.title} sedang menunggu integrasi tahap selanjutnya.`);
               }
            }}
          >
            {mod.icon}
            <span className="text-sm font-medium text-zinc-300 group-hover:text-white">{mod.title}</span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded-sm font-bold uppercase ${
              mod.status === 'LIVE' ? 'bg-emerald-500/20 text-emerald-400' :
              mod.status === 'BETA' ? 'bg-blue-500/20 text-blue-400' :
              'bg-zinc-800 text-zinc-500'
            }`}>
              {mod.status}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
};
