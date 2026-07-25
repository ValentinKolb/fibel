import { assetsPlugin } from "./assets";
import { i18nPlugin } from "./i18n";
import { layoutPlugin } from "./layout";
import { llmsPlugin } from "./llms";
import { markdownPlugin } from "./markdown";
import { poweredByPlugin } from "./powered-by";
import { searchPlugin } from "./search";
import { seoPlugin } from "./seo";
import { themePlugin } from "./theme";
import type { FibelPlugin } from "../types";

export { assetsPlugin, i18nPlugin, layoutPlugin, llmsPlugin, markdownPlugin, poweredByPlugin, searchPlugin, seoPlugin, themePlugin };

export function defaultPlugins(): FibelPlugin[] {
  return [markdownPlugin(), themePlugin(), i18nPlugin(), seoPlugin(), llmsPlugin(), assetsPlugin(), searchPlugin(), poweredByPlugin(), layoutPlugin()];
}
