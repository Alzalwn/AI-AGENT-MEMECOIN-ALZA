import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '../components/ui/ToastProvider';

export const metadata: Metadata = {
  title: 'Grok Trencher | Solana Multi-Agent Memecoin Terminal',
  description: 'Automated Multi-Agent Decentralized Trading Terminal for Solana Memecoins with Sub-350ms Latency & Single-Veto Consensus',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-terminal-bg text-terminal-text">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
