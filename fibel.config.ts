import { defaultPlugins, defineFibel } from "./src";
import { assistantPlugin, imprintPlugin, providerFromEnv } from "./src/plugins";

const assistant = process.env.FIBEL_AI_MODEL?.trim()
  ? [
      assistantPlugin({
        provider: providerFromEnv(),
        systemPrompt:
          "Fibel is a Bun-based documentation runtime that turns Markdown into a server-rendered website. It provides localized routing, server-side search, themes, SEO, raw Markdown routes, and LLM-friendly output. Its built-in capabilities are plugins that projects can extend or replace.\nHelp {{language}} readers understand and configure Fibel.\nCurrent page: {{currentPageTitle}} ({{currentPage}})\nCurrent page summary: {{currentPageDescription}}\nPrefer short, practical answers and point out relevant configuration names. Today is {{weekday}}, {{date}} in {{timezone}}.",
      }),
    ]
  : [];

export default defineFibel({
  title: "Fibel",
  description: "Publish Markdown documentation as a server-rendered website with search, multilingual routing, and Markdown source pages for tools.",
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
  footerLinks: [{ label: "GitHub", value: "https://github.com/ValentinKolb/fibel" }],
  plugins: [
    ...defaultPlugins(),
    imprintPlugin({ url: "https://impressum.valentin-kolb.com", label: "Impressum" }),
    ...assistant,
  ],
});
