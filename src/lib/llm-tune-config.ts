/** Resolve LLM credentials for natural-language signature tuning. */

export interface LlmTuneConfig {
  apiKey: string;
  /** e.g. https://api.deepseek.com */
  baseUrl: string;
  model: string;
  provider: "deepseek" | "openai";
}

export function getLlmTuneConfig(): LlmTuneConfig | null {
  const deepseekKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (deepseekKey) {
    return {
      apiKey: deepseekKey,
      baseUrl: normalizeBaseUrl(
        process.env.DEEPSEEK_API_BASE,
        "https://api.deepseek.com",
      ),
      model: process.env.DEEPSEEK_MODEL?.trim() || "deepseek-chat",
      provider: "deepseek",
    };
  }

  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (openaiKey) {
    return {
      apiKey: openaiKey,
      baseUrl: normalizeBaseUrl(
        process.env.OPENAI_BASE_URL,
        "https://api.openai.com",
      ),
      model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
      provider: "openai",
    };
  }

  return null;
}

function normalizeBaseUrl(value: string | undefined, fallback: string): string {
  const base = (value?.trim() || fallback).replace(/\/$/, "");
  return base;
}

export function chatCompletionsUrl(config: LlmTuneConfig): string {
  return `${config.baseUrl}/v1/chat/completions`;
}
