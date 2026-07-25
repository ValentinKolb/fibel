import { existsSync } from "fs";
import { join } from "path";
import { resolveConfig } from "./config";
import { loadPages, renderPages } from "./content";
import type { FibelApp, FibelConfig, FibelContext, FibelRoute } from "./types";
import { joinUrl, text, withoutBasePath } from "./utils";

export async function createFibelApp(input: FibelConfig): Promise<FibelApp> {
  const config = resolveConfig(input);
  const context: FibelContext = {
    config,
    pages: [],
    nav: new Map(),
    footerItems: [],
    headTags: [],
    searchIndex: [],
    routes: [],
    services: {
      renderMarkdown: (markdown) => markdown,
      renderPage: () => "",
      getTheme: () => config.theme.defaultMode,
      search: () => [],
    },
  };

  for (const plugin of config.plugins) await plugin.setup?.(context);
  context.pages = loadPages(config);
  renderPages(context);
  for (const plugin of config.plugins) await plugin.afterContent?.(context);
  context.routes = (await Promise.all(config.plugins.map((plugin) => plugin.routes?.(context) ?? []))).flat();

  return {
    context,
    fetch: (request) => handleRequest(request, context),
  };
}

async function handleRequest(request: Request, context: FibelContext) {
  const url = new URL(request.url);
  const localPath = withoutBasePath(url.pathname, context.config.routing.basePath);
  if (localPath === undefined) return new Response("Not found", { status: 404 });

  if (localPath === "/" || localPath === "") {
    return Response.redirect(new URL(joinUrl(context.config.routing.basePath, context.config.defaultLocale), url), 302);
  }

  const internal = context.config.routing.internalPath;
  if (localPath.startsWith(`${internal}/`) || localPath === internal) {
    return handleInternalRoute(request, localPath.slice(internal.length) || "/", context);
  }

  const seoRoute = matchRoute(localPath, context.routes);
  if (seoRoute) return seoRoute.handler(request, context);

  const markdownPage = findRawMarkdownPage(url.pathname, context);
  if (markdownPage) return text(markdownPage.body, "text/markdown; charset=utf-8");

  const requestPath = normalizePagePath(url.pathname);
  const page = context.pages.find((candidate) => normalizePagePath(candidate.href) === requestPath);
  if (page) return text(context.services.renderPage(page, request, context), "text/html; charset=utf-8");

  return new Response("Not found", { status: 404 });
}

function normalizePagePath(path: string) {
  const withoutTrailing = path.replace(/\/+$/g, "");
  return withoutTrailing || "/";
}

function findRawMarkdownPage(path: string, context: FibelContext) {
  const withoutSuffix = path.match(/^(.*)\.(md|markdown)$/i)?.[1];
  if (!withoutSuffix) return undefined;
  const requestPath = normalizePagePath(withoutSuffix);
  return context.pages.find((candidate) => normalizePagePath(candidate.href) === requestPath);
}

async function handleInternalRoute(request: Request, path: string, context: FibelContext) {
  if (path === "/styles.css") {
    const css = join(context.config.root, ".fibel", "public", "styles.css");
    if (existsSync(css)) return new Response(Bun.file(css), { headers: { "Content-Type": "text/css; charset=utf-8" } });
    return new Response("", { headers: { "Content-Type": "text/css; charset=utf-8" } });
  }

  const route = matchRoute(path, context.routes);
  if (route) return route.handler(request, context);
  return new Response("Not found", { status: 404 });
}

function matchRoute(path: string, routes: FibelRoute[]) {
  return routes.find((route) => route.path === path || (route.path.endsWith("/*") && path.startsWith(route.path.slice(0, -1))));
}
