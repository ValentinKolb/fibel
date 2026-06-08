import { assetsPlugin } from "./assets";
import { i18nPlugin } from "./i18n";
import { layoutPlugin } from "./layout";
import { markdownPlugin } from "./markdown";
import { searchPlugin } from "./search";
import { seoPlugin } from "./seo";
import { themePlugin } from "./theme";
import type { FibelPlugin } from "../types";

export { assetsPlugin, i18nPlugin, layoutPlugin, markdownPlugin, searchPlugin, seoPlugin, themePlugin };

export function defaultPlugins(): FibelPlugin[] {
  return [markdownPlugin(), themePlugin(), i18nPlugin(), seoPlugin(), assetsPlugin(), searchPlugin(), layoutPlugin()];
}
