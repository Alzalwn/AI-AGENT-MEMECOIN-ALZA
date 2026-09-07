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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@300;400;500;600;700;800&display=swap"
        />
      </head>
      <body className="font-mono antialiased min-h-screen bg-terminal-bg text-terminal-text">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
