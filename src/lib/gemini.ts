import { TokenSignal } from '../types/terminal';
import { PRD_THRESHOLDS } from '../config/constants';

export interface GeminiNarrativeEvaluation {
  cosineSimilarity: number;
  dominantTheme: 'AI / AGENTIC' | 'POLITIFI' | 'CULT' | 'ANIMALS' | 'DEPIN / INFRA' | 'VIRAL CULTURE' | 'NOISE / OFF-NARRATIVE';
  analysis: string;
  viralityScore: number;
  sentiment: 'ULTRA_BULLISH' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'RUG_RISK';
  twitterHypePct: number;
  rugpullProbabilityPct: number;
  isAiApproved: boolean;
  modelUsed: string;
}

const ACTIVE_SOLANA_METAS = [
  {
    theme: 'AI / AGENTIC' as const,
    keywords: ['ai', 'agent', 'bot', 'eliza', 'grok', 'singularity', 'autonomous', 'terminal', 'neural', 'compute', 'llm', 'deepseek', 'claw', 'swarm', 'agentic'],
    description: 'Autonomous trading bot, AI agent Swarms, and LLM infrastructure tokens.'
  },
  {
    theme: 'POLITIFI' as const,
    keywords: ['trump', 'kamala', 'biden', 'usa', 'election', 'fed', 'powell', 'war', 'tariff', 'macro', 'president', 'maga'],
    description: 'Macro-economic, tariff & political memetics.'
  },
  {
    theme: 'CULT' as const,
    keywords: ['cult', 'sacred', 'temple', 'sigil', 'occult', 'schizo', 'order', 'prophecy', 'monk', 'faith', 'truth', 'terminal'],
    description: 'High conviction esoteric & decentralized community cults.'
  },
  {
    theme: 'ANIMALS' as const,
    keywords: ['dog', 'cat', 'pepe', 'shib', 'inu', 'bonk', 'wif', 'frog', 'zoo', 'hamster', 'monkey', 'goat', 'penguin'],
    description: 'Classic pet, meme mascot, and animal meta.'
  },
  {
    theme: 'DEPIN / INFRA' as const,
    keywords: ['depin', 'gpu', 'node', 'render', 'cloud', 'wifi', 'hardware', 'validator', 'layer2'],
    description: 'Decentralized physical infrastructure & compute.'
  },
  {
    theme: 'VIRAL CULTURE' as const,
    keywords: ['chill', 'guy', 'moodeng', 'skibidi', 'sigma', 'brainrot', 'tiktok', 'viral', 'meme'],
    description: 'Mainstream social media & TikTok viral memetics.'
  }
];

export async function evaluateTokenWithGemini(
  token: TokenSignal,
  customApiKey?: string
): Promise<GeminiNarrativeEvaluation> {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY;

  // Fallback to algorithmic semantic heuristic if no Gemini API Key is configured
  if (!apiKey) {
    return evaluateWithSemanticHeuristic(token);
  }

  const prompt = `You are the Chief AI Narrative Intelligence Officer for an ultra-high-speed Solana memecoin sniper terminal.
Analyze this newly launched Solana memecoin:
- Symbol: ${token.symbol}
- Name: ${token.name}
- Platform: ${token.platform}
- Contract Mint: ${token.mint}
- Description: ${token.description || 'No description provided'}
- Initial Liquidity: $${token.initialLpUsd || 0} USD
- Top 10 Holders %: ${token.top10HolderPct || 0}%

Active Solana Metas:
1. AI / AGENTIC: Autonomous agents, Swarms, LLMs, Eliza, Grok, DeepSeek.
2. POLITIFI: US politics, Trump, Tariff, Fed, Macro elections.
3. CULT: Esoteric crypto cults, schizo-theology, sacred memes.
4. ANIMALS: Pepe, Doge, cats, frogs, animal mascots.
5. DEPIN / INFRA: Compute, GPUs, nodes, decentralized hardware.
6. VIRAL CULTURE: TikTok trends, viral memes, internet culture.

Respond strictly in valid JSON format:
{
  "cosineSimilarity": <number between 0.10 and 0.99, where >= 0.85 indicates high alignment with an active meta>,
  "dominantTheme": "<AI / AGENTIC | POLITIFI | CULT | ANIMALS | DEPIN / INFRA | VIRAL CULTURE | NOISE / OFF-NARRATIVE>",
  "viralityScore": <integer 1-100 representing viral potential on Crypto Twitter / X>,
  "sentiment": "<ULTRA_BULLISH | BULLISH | NEUTRAL | BEARISH | RUG_RISK>",
  "twitterHypePct": <integer 1-100 estimated organic engagement potential>,
  "rugpullProbabilityPct": <integer 0-100 risk of developer abandonment or dump>,
  "analysis": "<short 1-2 sentence razor-sharp rationalization in Indonesian or English>"
}`;

  // Attempt Primary: Gemini 2.0 Flash, Fallback: Gemini 1.5 Flash
  const models = ['gemini-2.0-flash', 'gemini-1.5-flash'];

  for (const model of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.2
            }
          }),
          signal: AbortSignal.timeout(4500)
        }
      );

      if (res.ok) {
        const data = await res.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const parsed = JSON.parse(rawText);
          const cosSim = Math.max(0.1, Math.min(0.99, Number(parsed.cosineSimilarity) || 0.5));
          const virality = Math.max(1, Math.min(100, Number(parsed.viralityScore) || Math.round(cosSim * 100)));

          return {
            cosineSimilarity: +cosSim.toFixed(2),
            dominantTheme: parsed.dominantTheme || 'AI / AGENTIC',
            analysis: parsed.analysis || 'Evaluasi semantik narasi Gemini AI selesai.',
            viralityScore: virality,
            sentiment: parsed.sentiment || (cosSim >= 0.85 ? 'BULLISH' : 'NEUTRAL'),
            twitterHypePct: Math.max(1, Math.min(100, Number(parsed.twitterHypePct) || 75)),
            rugpullProbabilityPct: Math.max(0, Math.min(100, Number(parsed.rugpullProbabilityPct) || 20)),
            isAiApproved: cosSim >= PRD_THRESHOLDS.MIN_COSINE_SIMILARITY,
            modelUsed: model
          };
        }
      }
    } catch {
      // Try next model or fallback
    }
  }

  // Graceful fallback to local heuristic engine if API fails
  return evaluateWithSemanticHeuristic(token);
}

/**
 * Smart Heuristic Semantic Vector Evaluator
 * Runs in 0ms with zero latency impact when offline or API key is not present.
 */
export function evaluateWithSemanticHeuristic(token: TokenSignal): GeminiNarrativeEvaluation {
  const text = `${token.symbol} ${token.name} ${token.description || ''}`.toLowerCase();

  let bestTheme: GeminiNarrativeEvaluation['dominantTheme'] = 'NOISE / OFF-NARRATIVE';
  let maxMatches = 0;

  for (const meta of ACTIVE_SOLANA_METAS) {
    let matches = 0;
    for (const kw of meta.keywords) {
      if (text.includes(kw)) matches += 1;
    }
    if (matches > maxMatches) {
      maxMatches = matches;
      bestTheme = meta.theme;
    }
  }

  // Base score from token's existing seed sim or match count
  let cosSim = 0.50;
  if (maxMatches >= 2) {
    cosSim = 0.88 + Math.min(0.08, maxMatches * 0.03);
  } else if (maxMatches === 1) {
    cosSim = 0.78 + (token.narrativeCosineSim ? (token.narrativeCosineSim - 0.5) * 0.2 : 0.05);
  } else {
    // Check if symbol matches common meme patterns
    if (token.symbol.length <= 4 && /^[A-Z]+$/.test(token.symbol)) {
      cosSim = 0.65;
    } else {
      cosSim = Math.max(0.35, token.narrativeCosineSim || 0.45);
    }
  }

  cosSim = +(Math.max(0.15, Math.min(0.96, cosSim))).toFixed(2);
  const isAiApproved = cosSim >= PRD_THRESHOLDS.MIN_COSINE_SIMILARITY;

  let analysis = '';
  if (isAiApproved) {
    analysis = `Vektor narasi '${bestTheme}' sangat selaras dengan sentimen pasar aktif Solana (${cosSim} >= 0.85).`;
  } else {
    analysis = `Skor kesamaan narasi (${cosSim}) di bawah ambang batas 0.85. Kurang memiliki korelasi dengan meta aktif.`;
  }

  const virality = Math.round(cosSim * 100);
  const rugProb = token.rugcheckNumericScore ? Math.max(5, 100 - token.rugcheckNumericScore) : 25;

  return {
    cosineSimilarity: cosSim,
    dominantTheme: bestTheme,
    analysis,
    viralityScore: virality,
    sentiment: isAiApproved ? 'BULLISH' : 'NEUTRAL',
    twitterHypePct: Math.round(virality * 0.9),
    rugpullProbabilityPct: rugProb,
    isAiApproved,
    modelUsed: 'heuristic-vector-engine'
  };
}

