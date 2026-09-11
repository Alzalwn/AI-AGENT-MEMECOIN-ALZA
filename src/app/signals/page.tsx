import CryptoSignalGenerator from '@/components/CryptoSignalGenerator';

export const metadata = {
  title: 'AI Futures Signals | Grok Trencher',
  description: 'Advanced Crypto Futures Signal Generator using Technical Indicators',
};

export default function SignalsPage() {
  return (
    <main className="min-h-screen bg-[#09090b] text-white selection:bg-blue-500/30">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-[#09090b] to-[#09090b] pointer-events-none" />
      
      <div className="relative z-10 py-12">
        <CryptoSignalGenerator />
      </div>
    </main>
  );
}
