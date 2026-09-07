import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { TradingStyle } from '../types/terminal';
import { TRADING_STYLE_PRESETS } from '../config/constants';
import { supabase } from '../lib/supabase';

export interface BotSettingsState {
  // 1. Trading Style & Exit Targets
  tradingStyle: TradingStyle;
  takeProfitPct: number;
  stopLossPct: number;
  trailingStopLossPct: number;
  maxHoldTimeSec: number;
  ttlUnlimited: boolean;
  autoSellEnabled: boolean;

  // 2. Capital & Safety Filters
  buyAmountSol: number;
  minLiquidityUsd: number;
  minGrokViralityScore: number;
  maxTop10HoldersPct: number;
  maxDailyTrades: number;
  jitoTipTier: 'ECONOMY' | 'STANDARD' | 'FAST' | 'TURBO' | 'ULTRA_DEGEN';
  slippagePct: number;
  priorityFeeMicrolamports: number;

  // 3. Bot Engine State
  isAutonomousEnabled: boolean;
  engineStatus: 'AUTONOMOUS' | 'IDLE' | 'PAUSED';

  // 4. API Keys
  grokApiKey: string;
  geminiApiKey: string;

  // 5. Cloud Sync & Hydration Tracking
  _hasHydrated: boolean;
  isSyncingCloud: boolean;
  lastCloudSyncAt: number | null;

  // Actions
  setHasHydrated: (state: boolean) => void;
  updateSettings: (partial: Partial<BotSettingsState>) => void;
  setTradingStyle: (style: TradingStyle) => void;
  resetToDefaults: () => void;

  // Supabase Cloud Sync Actions (UPSERT & FETCH)
  saveToSupabase: (userId?: string) => Promise<{ success: boolean; error?: string }>;
  fetchFromSupabase: (userId?: string) => Promise<{ success: boolean; error?: string }>;
}

const DEFAULT_SETTINGS = {
  tradingStyle: 'SCALPING' as TradingStyle,
  takeProfitPct: 100,
  stopLossPct: -25,
  trailingStopLossPct: 15,
  maxHoldTimeSec: 180,
  ttlUnlimited: false,
  autoSellEnabled: true,

  buyAmountSol: 0.02,
  minLiquidityUsd: 10000,
  minGrokViralityScore: 85,
  maxTop10HoldersPct: 20,
  maxDailyTrades: 10,
  jitoTipTier: 'STANDARD' as const,
  slippagePct: 1.5,
  priorityFeeMicrolamports: 150000,

  isAutonomousEnabled: true,
  engineStatus: 'AUTONOMOUS' as const,

  grokApiKey: process.env.NEXT_PUBLIC_GROK_API_KEY || '',
  geminiApiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || '',

  _hasHydrated: false,
  isSyncingCloud: false,
  lastCloudSyncAt: null,
};

export const useSettingsStore = create<BotSettingsState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_SETTINGS,

      setHasHydrated: (state: boolean) => {
        set({ _hasHydrated: state });
      },

      updateSettings: (partial) => {
        set((state) => ({ ...state, ...partial }));
      },

      setTradingStyle: (style: TradingStyle) => {
        const preset = TRADING_STYLE_PRESETS[style];
        if (!preset) return;

        set({
          tradingStyle: style,
          takeProfitPct: preset.targetTpPct,
          stopLossPct: preset.stopLossPct,
          trailingStopLossPct: preset.trailingStopLossPct,
          maxHoldTimeSec: preset.maxHoldTimeSec,
          ttlUnlimited: preset.ttlUnlimited,
          autoSellEnabled: preset.autoSellEnabled,
          minLiquidityUsd: preset.minLiquidityUsd,
          minGrokViralityScore: preset.minGrokViralityScore,
          jitoTipTier: preset.jitoTipTier,
        });
      },

      resetToDefaults: () => {
        set(DEFAULT_SETTINGS);
      },

      /**
       * Simpan (UPSERT) konfigurasi krusial bot ke Supabase
       */
      saveToSupabase: async (userId: string = 'master_admin') => {
        if (!supabase) {
          return { success: false, error: 'Supabase client belum dikonfigurasi di .env.local' };
        }

        set({ isSyncingCloud: true });
        try {
          const current = get();
          const payload = {
            tradingStyle: current.tradingStyle,
            takeProfitPct: current.takeProfitPct,
            stopLossPct: current.stopLossPct,
            trailingStopLossPct: current.trailingStopLossPct,
            maxHoldTimeSec: current.maxHoldTimeSec,
            ttlUnlimited: current.ttlUnlimited,
            autoSellEnabled: current.autoSellEnabled,
            buyAmountSol: current.buyAmountSol,
            minLiquidityUsd: current.minLiquidityUsd,
            minGrokViralityScore: current.minGrokViralityScore,
            maxTop10HoldersPct: current.maxTop10HoldersPct,
            maxDailyTrades: current.maxDailyTrades,
            jitoTipTier: current.jitoTipTier,
            isAutonomousEnabled: current.isAutonomousEnabled,
            engineStatus: current.engineStatus,
          };

          const { error } = await supabase
            .from('user_bot_settings')
            .upsert(
              {
                user_id: userId,
                settings: payload,
                updated_at: new Date().toISOString()
              },
              { onConflict: 'user_id' }
            );

          if (error) throw error;

          set({ isSyncingCloud: false, lastCloudSyncAt: Date.now() });
          return { success: true };
        } catch (err: any) {
          set({ isSyncingCloud: false });
          return { success: false, error: err.message || 'Gagal menyimpan ke Supabase' };
        }
      },

      /**
       * Muat (Fetch) konfigurasi dari Supabase setiap kali komponen dimuat ulang
       */
      fetchFromSupabase: async (userId: string = 'master_admin') => {
        if (!supabase) {
          return { success: false, error: 'Supabase client belum dikonfigurasi di .env.local' };
        }

        set({ isSyncingCloud: true });
        try {
          const { data, error } = await supabase
            .from('user_bot_settings')
            .select('settings')
            .eq('user_id', userId)
            .single();

          if (error) throw error;

          if (data && data.settings) {
            set({
              ...data.settings,
              isSyncingCloud: false,
              lastCloudSyncAt: Date.now()
            });
            return { success: true };
          }
          set({ isSyncingCloud: false });
          return { success: false, error: 'Data pengaturan tidak ditemukan' };
        } catch (err: any) {
          set({ isSyncingCloud: false });
          return { success: false, error: err.message || 'Gagal mengambil data dari Supabase' };
        }
      }
    }),
    {
      name: 'GT_SETTINGS_PERSIST', // Kunci penyimpanan di LocalStorage
      storage: createJSONStorage(() => localStorage),
      // Partialize: Pilih field yang ingin disimpan di LocalStorage
      partialize: (state) => ({
        tradingStyle: state.tradingStyle,
        takeProfitPct: state.takeProfitPct,
        stopLossPct: state.stopLossPct,
        trailingStopLossPct: state.trailingStopLossPct,
        maxHoldTimeSec: state.maxHoldTimeSec,
        ttlUnlimited: state.ttlUnlimited,
        autoSellEnabled: state.autoSellEnabled,
        buyAmountSol: state.buyAmountSol,
        minLiquidityUsd: state.minLiquidityUsd,
        minGrokViralityScore: state.minGrokViralityScore,
        maxTop10HoldersPct: state.maxTop10HoldersPct,
        maxDailyTrades: state.maxDailyTrades,
        jitoTipTier: state.jitoTipTier,
        slippagePct: state.slippagePct,
        priorityFeeMicrolamports: state.priorityFeeMicrolamports,
        isAutonomousEnabled: state.isAutonomousEnabled,
        engineStatus: state.engineStatus,
        grokApiKey: state.grokApiKey,
        geminiApiKey: state.geminiApiKey,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      }
    }
  )
);
