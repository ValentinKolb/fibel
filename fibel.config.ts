import { defaultPlugins, defineFibel } from "./src";
import {
  agentSkillsPlugin,
  assistantPlugin,
  imprintPlugin,
  mcpPlugin,
  providerFromEnv,
} from "./src/plugins";

const assistant = process.env.FIBEL_AI_MODEL?.trim()
  ? [
      assistantPlugin({
        provider: providerFromEnv(),
        systemPrompt:
          "Fibel is a Bun-based documentation runtime for Markdown, optional content collections, and host-rendered custom pages. It provides localized routing, collection-aware search, themes, SEO, raw Markdown routes, LLM-friendly output, and an optional bridge for Solid SSR and islands. Its built-in capabilities are plugins that projects can extend or replace.\nHelp {{language}} readers understand and configure Fibel.\nCurrent page: {{currentPageTitle}} ({{currentPage}})\nCurrent page summary: {{currentPageDescription}}\nPrefer short, practical answers and point out relevant configuration names. Today is {{weekday}}, {{date}} in {{timezone}}.",
      }),
    ]
  : [];

export default defineFibel({
  title: "Fibel",
  description: "Publish Markdown collections and host-rendered application pages in one documentation shell with search, multilingual routing, and Markdown sources for tools.",
  siteUrl: "https://fibel.dev",
  content: "docs",
  assets: "assets",
  routing: {
    basePath: "",
    internalPath: "/_fibel",
    assetsPath: "/assets",
  },
  locales: [
    { code: "en", label: "English" },
    { code: "de", label: "Deutsch" },
  ],
  defaultLocale: "en",
  theme: {
    defaultMode: "light",
    cookieName: "fibel_theme",
  },
  seo: {
    ogImage: "/assets/social.png",
  },
  footerLinks: [{ label: "GitHub", value: "https://github.com/k2b-dev/fibel" }],
  plugins: [
    ...defaultPlugins(),
    imprintPlugin({ url: "https://impressum.valentin-kolb.com", label: "Impressum" }),
    mcpPlugin(),
    agentSkillsPlugin({ directory: "skills" }),
    ...assistant,
  ],
});
