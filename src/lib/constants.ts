// ═══════════════════════════════════════════════════════════
//  Centralized constants — single source of truth
//  Previously duplicated across 6+ page files
// ═══════════════════════════════════════════════════════════

export { TEAMS, TEAM_NAMES, MAX_TEAMS, MIN_TEAMS } from "@/data/team-config";
import { TEAMS } from "@/data/team-config";

// ── Derived team arrays ──
export const TEAM_COLORS = TEAMS.map((t) => t.color);
export const TEAM_SHORT = TEAMS.map((t) => t.shortName);

// ── Provider metadata (brand colors preserved) ──
export const PROVIDER_META: Record<string, { icon: string; color: string }> = {
  Anthropic: { icon: "🟣", color: "#A855F7" },
  OpenAI: { icon: "🟢", color: "#10B981" },
  Google: { icon: "🔵", color: "#4285F4" },
  DeepSeek: { icon: "⚫", color: "#94A3B8" },
  Meta: { icon: "🔷", color: "#0668E1" },
  Mistral: { icon: "🟠", color: "#F97316" },
};

// ── Available LLM models ──
export const AVAILABLE_MODELS = [
  { id: "anthropic/claude-opus-4.6", label: "Claude Opus 4.6", provider: "Anthropic" },
  { id: "anthropic/claude-sonnet-4.6", label: "Claude Sonnet 4.6", provider: "Anthropic" },
  { id: "openai/gpt-5.4", label: "GPT-5.4", provider: "OpenAI" },
  { id: "openai/gpt-5.4-pro", label: "GPT-5.4 Pro", provider: "OpenAI" },
  { id: "google/gemini-3.0-pro", label: "Gemini 3.0 Pro", provider: "Google" },
  { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro", provider: "Google" },
  { id: "deepseek/deepseek-chat-v3-0324", label: "DeepSeek V3", provider: "DeepSeek" },
  { id: "deepseek/deepseek-r1", label: "DeepSeek R1", provider: "DeepSeek" },
  { id: "meta-llama/llama-4-scout", label: "Llama 4 Scout", provider: "Meta" },
  { id: "meta-llama/llama-4-maverick", label: "Llama 4 Maverick", provider: "Meta" },
  { id: "mistralai/mistral-medium", label: "Mistral Medium", provider: "Mistral" },
  { id: "mistralai/mistral-small", label: "Mistral Small", provider: "Mistral" },
] as const;

export type ModelId = (typeof AVAILABLE_MODELS)[number]["id"];

// ── Model groups by provider ──
export const PROVIDER_GROUPS = (() => {
  const groups: { provider: string; models: typeof AVAILABLE_MODELS[number][] }[] = [];
  const seen = new Set<string>();
  for (const m of AVAILABLE_MODELS) {
    if (!seen.has(m.provider)) {
      seen.add(m.provider);
      groups.push({
        provider: m.provider,
        models: [...AVAILABLE_MODELS].filter((x) => x.provider === m.provider),
      });
    }
  }
  return groups;
})();

// ── Default model selections for new auctions ──
export const DEFAULT_SELECTIONS: string[] = [
  "anthropic/claude-sonnet-4.6",
  "openai/gpt-5.4",
  "google/gemini-2.5-pro",
  "deepseek/deepseek-chat-v3-0324",
];

// ── Agent colors for charts/trends (non-team) ──
export const AGENT_COLORS = [
  "#D4A853", "#4ADE80", "#CD7F32", "#F5C842",
  "#EF4444", "#8B7A4A", "#F97316", "#A09888",
  "#E8D5A3", "#F59E0B",
];

// ── Recharts theme colors ──
export const CHART_COLORS = [
  "#D4A853", "#CD7F32", "#4ADE80", "#F5C842",
  "#EF4444", "#8B7A4A", "#F97316", "#A09888",
];
