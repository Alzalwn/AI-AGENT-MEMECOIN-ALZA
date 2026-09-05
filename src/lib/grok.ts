import { TokenSignal } from '../types/terminal';
import { PRD_THRESHOLDS } from '../config/constants';

export interface GrokNarrativeEvaluation {
  cosineSimilarity: number;
  dominantTheme: 'AI / AGENTIC' | 'POLITIFI' | 'CULT' | 'ANIMALS' | 'NOISE / OFF-NARRATIVE';
  memeViralityScore: number; // 0 to 100
  twitterSentiment: 'EXTREME_BULLISH' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'BOT_FARM_SUSPECT';
  analysis: string;
  isAiApproved: boolean;
  modelUsed: string;
}

const ACTIVE_SOLANA_METAS = [
  {
    theme: 'AI / AGENTIC' as const,
    keywords: ['ai', 'agent', 'bot', 'eliza', 'grok', 'singularity', 'autonomous', 'terminal', 'neural', 'compute', 'llm', 'deepseek', 'claw', 'swarm', 'xai'],
    description: 'Autonomous trading bot, AI agent swarms, and LLM infrastructure tokens.'
  },
  {
    theme: 'POLITIFI' as const,
    keywords: ['trump', 'kamala', 'biden', 'usa', 'election', 'fed', 'powell', 'war', 'tariff', 'macro', 'president', 'elon', 'doge'],
    description: 'Macro-economic, cultural politics & political memetics.'
  },
  {
    theme: 'CULT' as const,
    keywords: ['cult', 'sacred', 'temple', 'sigil', 'occult', 'schizo', 'order', 'prophecy', 'monk', 'faith', 'truth'],
    description: 'High conviction esoteric & decentralized community cults.'
  },
  {
    theme: 'ANIMALS' as const,
    keywords: ['dog', 'cat', 'pepe', 'shib', 'inu', 'bonk', 'wif', 'frog', 'zoo', 'hamster', 'monkey', 'goat', 'neiro'],
    description: 'Classic animal mascots and memetic animal meta.'
  }
];

export async function evaluateTokenWithGrok(
  token: TokenSignal,
  customApiKey?: string
): Promise<GrokNarrativeEvaluation> {
  const apiKey = customApiKey || process.env.XAI_API_KEY || process.env.GROK_API_KEY || process.env.NEXT_PUBLIC_GROK_API_KEY;

  // Fallback to high-speed heuristic if no API key is present
  if (!apiKey) {
    return evaluateWithGrokHeuristic(token);
  }

  try {
    const prompt = `You are the Lead Intelligence Officer for Grok Trencher, an ultra-low latency algorithmic Solana sniper terminal.
Analyze this newly launched Solana memecoin for virality and narrative resonance on X (Twitter):
- Token Symbol: ${token.symbol}
- Token Name: ${token.name}
- Launch Platform: ${token.platform}
- Token Description: ${token.description || 'No description provided'}
- Initial Liquidity: $${token.initialLpUsd.toLocaleString()}

Active Solana Metas:
1. AI / AGENTIC: Autonomous AI agents, bot swarms, LLM infrastructure, Grok / Eliza variants.
2. POLITIFI: US politics, presidential announcements, macro tariffs, Elon Musk / DOGE government efficiency memes.
3. CULT: Esoteric crypto cults, schizo-theological communities, sacred internet lore.
4. ANIMALS: Pepe, doge, wif, cats, classic internet animal mascots.

Evaluate the token and respond strictly in valid JSON format with this exact structure:
{
  "cosineSimilarity": <number between 0.10 and 0.99, where >= 0.85 means approved>,
  "dominantTheme": "<AI / AGENTIC | POLITIFI | CULT | ANIMALS | NOISE / OFF-NARRATIVE>",
  "memeViralityScore": <integer between 0 and 100 representing probability of viral X/Twitter propagation>,
  "twitterSentiment": "<EXTREME_BULLISH | BULLISH | NEUTRAL | BEARISH | BOT_FARM_SUSPECT>",
  "analysis": "<short 1-2 sentence sharp, insightful assessment regarding culture fit and memetic momentum>"
}`;

    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'grok-2-latest',
        messages: [
          {
            role: 'system',
            content: 'You are Grok, an insightful, culturally attuned, and witty AI specializing in crypto memetics, on-chain psychology, and real-time Twitter/X trend analysis. Output only valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 350
      })
    });

    if (!res.ok) {
      console.warn(`xAI Grok API error status ${res.status}, falling back to heuristic.`);
      return evaluateWithGrokHeuristic(token);
    }

    const data = await res.json();
    const rawContent = data.choices?.[0]?.message?.content;
    if (!rawContent) {
      return evaluateWithGrokHeuristic(token);
    }

    // Clean JSON markdown if model wrapped it in ```json
    const cleaned = rawContent.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    const cosSim = Math.max(0.1, Math.min(0.99, Number(parsed.cosineSimilarity) || 0.5));
    const virality = Math.max(0, Math.min(100, Math.round(Number(parsed.memeViralityScore) || 50)));

    return {
      cosineSimilarity: cosSim,
      dominantTheme: parsed.dominantTheme || 'AI / AGENTIC',
      memeViralityScore: virality,
      twitterSentiment: parsed.twitterSentiment || 'BULLISH',
      analysis: parsed.analysis || 'xAI Grok memetic evaluation completed.',
      isAiApproved: cosSim >= PRD_THRESHOLDS.MIN_COSINE_SIMILARITY,
      modelUsed: 'grok-2-latest'
    };
  } catch (err) {
    console.error('xAI Grok API evaluation error:', err);
    return evaluateWithGrokHeuristic(token);
  }
}

/**
 * High-Speed Offline Heuristic for xAI Grok
 * Simulates cultural sentiment and Twitter velocity in 0ms without external latency.
 */
export function evaluateWithGrokHeuristic(token: TokenSignal): GrokNarrativeEvaluation {
  const text = `${token.symbol} ${token.name} ${token.description || ''}`.toLowerCase();

  let bestTheme: GrokNarrativeEvaluation['dominantTheme'] = 'NOISE / OFF-NARRATIVE';
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
  let virality = 45;
  let sentiment: GrokNarrativeEvaluation['twitterSentiment'] = 'NEUTRAL';

  if (maxMatches >= 2) {
    cosSim = 0.89 + Math.min(0.08, maxMatches * 0.03);
    virality = Math.min(98, 80 + maxMatches * 6);
    sentiment = virality > 88 ? 'EXTREME_BULLISH' : 'BULLISH';
  } else if (maxMatches === 1) {
    cosSim = 0.79 + (token.narrativeCosineSim ? (token.narrativeCosineSim - 0.5) * 0.2 : 0.05);
    virality = 68 + Math.floor(Math.random() * 12);
    sentiment = 'BULLISH';
  } else {
    // Check ticker characteristics
    if (token.symbol.length <= 4 && /^[A-Z]+$/.test(token.symbol)) {
      cosSim = 0.68;
      virality = 55;
      sentiment = 'NEUTRAL';
    } else {
      cosSim = Math.max(0.32, token.narrativeCosineSim || 0.44);
      virality = Math.max(15, Math.floor(cosSim * 60));
      sentiment = virality < 35 ? 'BOT_FARM_SUSPECT' : 'NEUTRAL';
    }
  }

  cosSim = +(Math.max(0.15, Math.min(0.96, cosSim))).toFixed(2);
  const isAiApproved = cosSim >= PRD_THRESHOLDS.MIN_COSINE_SIMILARITY;

  let analysis = '';
  if (isAiApproved) {
    analysis = `[xAI Grok Alpha] Ticker $${token.symbol} selaras kuat dengan klaster '${bestTheme}' di platform X. Momentum naratif tinggi (${virality}/100 virality score).`;
  } else {
    analysis = `[xAI Grok Veto] $${token.symbol} kekurangan resonansi kultural organik (${cosSim} < 0.85). Terdeteksi potensi distorsi volume / kebisingan bot.`;
  }

  return {
    cosineSimilarity: cosSim,
    dominantTheme: bestTheme,
    memeViralityScore: virality,
    twitterSentiment: sentiment,
    analysis,
    isAiApproved,
    modelUsed: 'grok-heuristic-engine'
  };
}
