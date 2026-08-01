import siteConfig from "../fibel.config";
import { defaultPlugins, type FibelConfig } from "../src";
import { agentSkillsPlugin } from "../src/plugins";

const config = {
  ...siteConfig,
  content: "docs",
  collections: undefined,
  defaultCollection: undefined,
  pages: undefined,
  plugins: [...defaultPlugins(), agentSkillsPlugin({ directory: "skills" })],
} satisfies FibelConfig;

export default config;
