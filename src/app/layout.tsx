import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '../components/ui/ToastProvider';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

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
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-mono antialiased min-h-screen bg-terminal-bg text-terminal-text">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
