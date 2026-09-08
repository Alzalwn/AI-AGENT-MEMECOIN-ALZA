/**
 * Helius Stream Singleton
 * Instance tunggal HeliusBlockchainStream yang dibagi lintas modul server-side.
 * Digunakan oleh /api/health/rpc-stream dan daemon worker.
 */
import { HeliusBlockchainStream } from './heliusStream';

export const heliusStreamInstance = new HeliusBlockchainStream();
