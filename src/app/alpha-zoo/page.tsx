import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ServerOff } from 'lucide-react';

export default function Page() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-4">
      <ServerOff className="w-16 h-16 text-zinc-600 mb-6" />
      <h1 className="text-2xl font-bold mb-2">Backend Not Connected</h1>
      <p className="text-zinc-500 max-w-md text-center mb-8">
        Sistem menunggu koneksi ke backend Python (Vibe-Trading). Fitur ini membutuhkan data real-time dari engine quant untuk beroperasi.
      </p>
      <Link href="/" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" /> Kembali ke Dashboard
      </Link>
    </div>
  );
}
