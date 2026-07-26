import { anthropic, gemini, mistral, ollama, openai, openrouter, type Provider } from "@k2b/nessi/ai";

export type AssistantProviderName = "anthropic" | "gemini" | "mistral" | "ollama" | "openai" | "openrouter";
export type AssistantProviderEnv = Record<string, string | undefined>;

const providerTimeouts = { firstByteMs: 15_000, idleMs: 30_000 };

export function providerFromEnv(env: AssistantProviderEnv = process.env): Provider {
  const name = (env.FIBEL_AI_PROVIDER?.trim().toLowerCase() || "openrouter") as AssistantProviderName;
  const model = required(env, "FIBEL_AI_MODEL");
  const baseURL = env.FIBEL_AI_BASE_URL?.trim() || undefined;
  const common = { baseURL, timeouts: providerTimeouts };

  switch (name) {
    case "anthropic":
      return anthropic(model, { ...common, apiKey: required(env, "ANTHROPIC_API_KEY") });
    case "gemini":
      return gemini(model, { ...common, apiKey: requiredAny(env, ["GEMINI_API_KEY", "GOOGLE_API_KEY"]) });
    case "mistral":
      return mistral(model, { ...common, apiKey: required(env, "MISTRAL_API_KEY") });
    case "ollama":
      return ollama(model, common);
    case "openai":
      return openai(model, { ...common, apiKey: required(env, "OPENAI_API_KEY") });
    case "openrouter":
      return openrouter(model, { ...common, apiKey: required(env, "OPENROUTER_API_KEY") });
    default:
      throw new Error(
        `Unsupported FIBEL_AI_PROVIDER "${name}". Use anthropic, gemini, mistral, ollama, openai, or openrouter.`,
      );
  }
}

function required(env: AssistantProviderEnv, name: string) {
  const value = env[name]?.trim();
  if (!value) throw new Error(`${name} is required for the configured Fibel assistant provider.`);
  return value;
}

function requiredAny(env: AssistantProviderEnv, names: string[]) {
  for (const name of names) {
    const value = env[name]?.trim();
    if (value) return value;
  }
  throw new Error(`${names.join(" or ")} is required for the configured Fibel assistant provider.`);
}
