export type NewsCatalystType =
  | 'REGULATORY'
  | 'MACRO'
  | 'ADOPTION'
  | 'HACK_EXPLOIT'
  | 'WHALE_MOVEMENT'
  | 'LISTING_DELISTING'
  | 'UPGRADE_HARDFORK'
  | 'DERIVATIVES_OPTIONS'
  | 'OTHER';

export type NewsSignalModifier =
  | 'STRONG_BOOST_LONG'
  | 'BOOST_LONG'
  | 'NEUTRAL'
  | 'BOOST_SHORT'
  | 'STRONG_BOOST_SHORT'
  | 'VETO_LONG'
  | 'VETO_SHORT';

export interface CryptoNewsItem {
  id: string;
  title: string;
  url: string;
  publishedAt: string;
  source: string;
  currencies?: string[]; // e.g. ['BTC', 'AVAX']
  body?: string;
  domain?: string;
}

export interface NewsImpactScore {
  symbol: string; // e.g. 'AVAXUSDT' or 'BTCUSDT'
  sentimentScore: number; // -100 to +100
  catalystType: NewsCatalystType;
  signalModifier: NewsSignalModifier;
  keyHeadline: string;
  summary: string;
  confidence: number; // 0.0 - 1.0
  impactLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  analyzedAt: number; // Unix ms
  sources: string[];
  isManual?: boolean;
}

export interface NewsSentimentAnalysisResult {
  symbolScores: Record<string, NewsImpactScore>;
  recentHeadlines: CryptoNewsItem[];
  lastUpdated: number;
}
