import { assetsPlugin } from "./assets";
import { agentSkillsPlugin } from "./agent-skills";
import { assistantPlugin } from "./assistant";
import { blogPlugin } from "./blog";
import { i18nPlugin } from "./i18n";
import { imprintPlugin } from "./imprint";
import { layoutPlugin } from "./layout";
import { llmsPlugin } from "./llms";
import { markdownPlugin } from "./markdown";
import { mcpPlugin } from "./mcp";
import { poweredByPlugin } from "./powered-by";
import { searchPlugin } from "./search";
import { seoPlugin } from "./seo";
import { themePlugin } from "./theme";
import type { FibelPlugin } from "../types";

export { providerFromEnv } from "./assistant-provider";
export { agentSkillsPlugin, assistantPlugin, assetsPlugin, blogPlugin, i18nPlugin, imprintPlugin, layoutPlugin, llmsPlugin, markdownPlugin, mcpPlugin, poweredByPlugin, searchPlugin, seoPlugin, themePlugin };
export type {
  AssistantLimits,
  AssistantOptions,
  AssistantRateLimiters,
  AssistantSystemPrompt,
  AssistantSystemPromptContext,
  AssistantUsageEvent,
} from "./assistant";
export type { AgentSkillsOptions } from "./agent-skills";
export type { BlogOptions } from "./blog";
export type { AssistantProviderEnv, AssistantProviderName } from "./assistant-provider";
export type { ImprintOptions } from "./imprint";
export type { LayoutOptions } from "./layout";
export type { McpOptions } from "./mcp";

export function defaultPlugins(): FibelPlugin[] {
  return [markdownPlugin(), themePlugin(), i18nPlugin(), seoPlugin(), llmsPlugin(), assetsPlugin(), searchPlugin(), poweredByPlugin(), layoutPlugin()];
}
