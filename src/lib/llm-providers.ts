// ─── Multi-Provider LLM Router ──────────────────────────────────
// Provides a unified interface for routing LLM calls to multiple backends.
// OpenRouter is the default and primary provider. Direct providers are
// fallbacks for when OpenRouter isn't configured.

export interface LLMProvider {
  name: string;
  baseUrl: string;
  apiKeyEnvVar: string;
  modelPrefix?: string;
  headers: (apiKey: string) => Record<string, string>;
  parseResponse: (data: any) => {
    content: string;
    usage: { promptTokens: number; completionTokens: number; totalTokens: number };
  };
  supportsJsonMode: boolean;
  /**
   * If true, the provider uses a non-OpenAI-compatible request/response format
   * and requires custom body building and response parsing in callLLM.
   */
  isCustomFormat?: boolean;
}

// ─── Provider Definitions ───────────────────────────────────────

const openRouterProvider: LLMProvider = {
  name: "OpenRouter",
  baseUrl: "https://openrouter.ai/api/v1/chat/completions",
  apiKeyEnvVar: "OPENROUTER_API_KEY",
  headers: (apiKey) => ({
    Authorization: `Bearer ${apiKey}`,
    "HTTP-Referer": "https://raeth.ai",
    "X-Title": "Raeth Arena",
  }),
  parseResponse: (data) => ({
    content: data.choices?.[0]?.message?.content || "",
    usage: {
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0,
      totalTokens: data.usage?.total_tokens || 0,
    },
  }),
  supportsJsonMode: true,
};

const anthropicProvider: LLMProvider = {
  name: "Anthropic",
  baseUrl: "https://api.anthropic.com/v1/messages",
  apiKeyEnvVar: "ANTHROPIC_API_KEY",
  modelPrefix: "anthropic/",
  headers: (apiKey) => ({
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
  }),
  parseResponse: (data) => {
    const textBlock = data.content?.find(
      (block: any) => block.type === "text"
    );
    return {
      content: textBlock?.text || "",
      usage: {
        promptTokens: data.usage?.input_tokens || 0,
        completionTokens: data.usage?.output_tokens || 0,
        totalTokens:
          (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      },
    };
  },
  supportsJsonMode: false,
  isCustomFormat: true,
};

const openAIProvider: LLMProvider = {
  name: "OpenAI",
  baseUrl: "https://api.openai.com/v1/chat/completions",
  apiKeyEnvVar: "OPENAI_API_KEY",
  modelPrefix: "openai/",
  headers: (apiKey) => ({
    Authorization: `Bearer ${apiKey}`,
  }),
  parseResponse: (data) => ({
    content: data.choices?.[0]?.message?.content || "",
    usage: {
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0,
      totalTokens: data.usage?.total_tokens || 0,
    },
  }),
  supportsJsonMode: true,
};

const googleProvider: LLMProvider = {
  name: "Google Gemini",
  baseUrl:
    "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
  apiKeyEnvVar: "GOOGLE_API_KEY",
  modelPrefix: "google/",
  headers: (apiKey) => ({
    Authorization: `Bearer ${apiKey}`,
  }),
  parseResponse: (data) => ({
    content: data.choices?.[0]?.message?.content || "",
    usage: {
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0,
      totalTokens: data.usage?.total_tokens || 0,
    },
  }),
  supportsJsonMode: true,
};

const deepSeekProvider: LLMProvider = {
  name: "DeepSeek",
  baseUrl: "https://api.deepseek.com/v1/chat/completions",
  apiKeyEnvVar: "DEEPSEEK_API_KEY",
  modelPrefix: "deepseek/",
  headers: (apiKey) => ({
    Authorization: `Bearer ${apiKey}`,
  }),
  parseResponse: (data) => ({
    content: data.choices?.[0]?.message?.content || "",
    usage: {
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0,
      totalTokens: data.usage?.total_tokens || 0,
    },
  }),
  supportsJsonMode: true,
};

// ─── Provider Resolution ────────────────────────────────────────

const directProviders: LLMProvider[] = [
  anthropicProvider,
  openAIProvider,
  googleProvider,
  deepSeekProvider,
];

/**
 * Resolve which provider and model ID to use for a given model string.
 *
 * Priority:
 *  1. If OPENROUTER_API_KEY is set, always use OpenRouter (it handles all models).
 *  2. Otherwise, match the model prefix to a direct provider whose API key is set.
 *  3. Throw if no provider can serve the request.
 */
export function resolveProvider(model: string): {
  provider: LLMProvider;
  resolvedModel: string;
} {
  // 1. OpenRouter takes priority — it can route any model
  if (process.env.OPENROUTER_API_KEY) {
    return { provider: openRouterProvider, resolvedModel: model };
  }

  // 2. Try to match a direct provider by model prefix
  for (const provider of directProviders) {
    if (provider.modelPrefix && model.startsWith(provider.modelPrefix)) {
      const apiKey = process.env[provider.apiKeyEnvVar];
      if (apiKey) {
        const resolvedModel = model.slice(provider.modelPrefix.length);
        return { provider, resolvedModel };
      }
    }
  }

  // 3. No provider found
  const configured = directProviders
    .filter((p) => p.modelPrefix && process.env[p.apiKeyEnvVar])
    .map((p) => `${p.name} (${p.modelPrefix}*)`)
    .join(", ");

  throw new Error(
    `No LLM provider available for model "${model}". ` +
      `Set OPENROUTER_API_KEY (recommended) or configure a direct provider. ` +
      (configured
        ? `Currently configured: ${configured}`
        : "No direct provider API keys are set.")
  );
}

// ─── Anthropic Request/Response Transformers ────────────────────

/**
 * Transform an OpenAI-compatible request body into Anthropic Messages API format.
 * Anthropic expects:
 *  - `system` as a top-level string (not in messages)
 *  - `messages` array with role "user" | "assistant" only
 *  - `max_tokens` (required)
 *  - No `response_format` (Anthropic doesn't support JSON mode directly)
 */
export function buildAnthropicBody(
  body: Record<string, unknown>
): Record<string, unknown> {
  const messages = (body.messages as any[]) || [];

  // Extract system message(s) — Anthropic wants them as a top-level field
  const systemMessages: string[] = [];
  const nonSystemMessages: { role: string; content: string }[] = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      systemMessages.push(
        typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content)
      );
    } else {
      nonSystemMessages.push({ role: msg.role, content: msg.content });
    }
  }

  const anthropicBody: Record<string, unknown> = {
    model: body.model,
    max_tokens: body.max_tokens || 400,
    messages: nonSystemMessages,
  };

  if (body.temperature !== undefined) {
    anthropicBody.temperature = body.temperature;
  }

  if (systemMessages.length > 0) {
    anthropicBody.system = systemMessages.join("\n\n");
  }

  return anthropicBody;
}
