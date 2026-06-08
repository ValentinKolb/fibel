import { defineFibel } from "./src";

export default defineFibel({
  title: "Fibel",
  description: "A small documentation runtime for Markdown, i18n, search, and no-flicker themes.",
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
  footerLinks: [
    { label: "GitHub", value: "https://github.com/ValentinKolb/fibel" },
    { label: "Impressum", value: "/en/imprint" },
  ],
});
