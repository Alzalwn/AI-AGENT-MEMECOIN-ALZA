import { TokenSignal } from '../types/terminal';
import { PRD_THRESHOLDS } from '../config/constants';

export interface GeminiNarrativeEvaluation {
  cosineSimilarity: number;
  dominantTheme: 'AI / AGENTIC' | 'POLITIFI' | 'CULT' | 'ANIMALS' | 'NOISE / OFF-NARRATIVE';
  analysis: string;
  isAiApproved: boolean;
  modelUsed: string;
}

const ACTIVE_SOLANA_METAS = [
  {
    theme: 'AI / AGENTIC' as const,
    keywords: ['ai', 'agent', 'bot', 'eliza', 'grok', 'singularity', 'autonomous', 'terminal', 'neural', 'compute', 'llm', 'deepseek', 'claw', 'swarm'],
    description: 'Autonomous trading bot, AI agent Swarms, and LLM infrastructure tokens.'
  },
  {
    theme: 'POLITIFI' as const,
    keywords: ['trump', 'kamala', 'biden', 'usa', 'election', 'fed', 'powell', 'war', 'tariff', 'macro', 'president'],
    description: 'Macro-economic & political memetics.'
  },
  {
    theme: 'CULT' as const,
    keywords: ['cult', 'sacred', 'temple', 'sigil', 'occult', 'schizo', 'order', 'prophecy', 'monk', 'faith'],
    description: 'High conviction esoteric & decentralized community cults.'
  },
  {
    theme: 'ANIMALS' as const,
    keywords: ['dog', 'cat', 'pepe', 'shib', 'inu', 'bonk', 'wif', 'frog', 'zoo', 'hamster', 'monkey', 'goat'],
    description: 'Classic pet, meme mascot, and animal meta.'
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

  try {
    const prompt = `You are the Chief Narrative Agent for an ultra-high-speed Solana algorithmic trading terminal.
Analyze this newly launched Solana memecoin:
- Symbol: ${token.symbol}
- Name: ${token.name}
- Platform: ${token.platform}
- Description: ${token.description || 'No description provided'}

Active Solana Metas:
1. AI / AGENTIC: Autonomous bots, AI agents, Eliza, Grok, LLMs.
2. POLITIFI: US politics, elections, Trump, macro-economy.
3. CULT: Esoteric memes, crypto cults, schizo-theology, sacred memes.
4. ANIMALS: Pepe, doge, cats, dogs, animal memetics.

Respond strictly in valid JSON format:
{
  "cosineSimilarity": <number between 0.10 and 0.99, where >= 0.85 indicates high alignment with an active meta>,
  "dominantTheme": "<AI / AGENTIC | POLITIFI | CULT | ANIMALS | NOISE / OFF-NARRATIVE>",
  "analysis": "<short 1-2 sentence rationalization of why it fits or why it is off-narrative noise>"
}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2
          }
        })
      }
    );

    if (!res.ok) {
      console.warn(`Gemini API returned status ${res.status}, falling back to heuristic.`);
      return evaluateWithSemanticHeuristic(token);
    }

    const data = await res.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      return evaluateWithSemanticHeuristic(token);
    }

    const parsed = JSON.parse(rawText);
    const cosSim = Math.max(0.1, Math.min(0.99, Number(parsed.cosineSimilarity) || 0.5));

    return {
      cosineSimilarity: cosSim,
      dominantTheme: parsed.dominantTheme || 'AI / AGENTIC',
      analysis: parsed.analysis || 'Evaluasi semantik narasi Gemini AI selesai.',
      isAiApproved: cosSim >= PRD_THRESHOLDS.MIN_COSINE_SIMILARITY,
      modelUsed: 'gemini-1.5-flash'
    };
  } catch (err) {
    console.error('Gemini Narrative evaluation error:', err);
    return evaluateWithSemanticHeuristic(token);
  }
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

  return {
    cosineSimilarity: cosSim,
    dominantTheme: bestTheme,
    analysis,
    isAiApproved,
    modelUsed: 'heuristic-vector-engine'
  };
}
