import { defaultPlugins, defineFibel } from "./src";
import { assistantPlugin, imprintPlugin, providerFromEnv } from "./src/plugins";

const assistant = process.env.FIBEL_AI_MODEL?.trim()
  ? [
      assistantPlugin({
        provider: providerFromEnv(),
        systemPrompt:
          "Help {{language}} readers understand and configure Fibel. They are currently reading {{currentPageTitle}} ({{currentPage}}). Prefer short, practical answers and point out relevant configuration names. Today is {{weekday}}, {{date}} in {{timezone}}.",
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
