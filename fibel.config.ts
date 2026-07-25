import { defaultPlugins, defineFibel } from "./src";
import { imprintPlugin } from "./src/plugins";

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
  footerLinks: [{ label: "GitHub", value: "https://github.com/ValentinKolb/fibel" }],
  plugins: [
    ...defaultPlugins(),
    imprintPlugin({ url: "https://impressum.valentin-kolb.com", label: "Impressum" }),
  ],
});
