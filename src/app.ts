import { existsSync } from "fs";
import { join } from "path";
import { resolveConfig } from "./config";
import { collectionForNeutralPath, pageRoute } from "./collections";
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
    bodyItems: [],
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
  const originRoute = matchRoute(url.pathname, context.routes, "origin");
  if (originRoute) return originRoute.handler(request, context);

  const localPath = withoutBasePath(url.pathname, context.config.routing.basePath);
  if (localPath === undefined) return new Response("Not found", { status: 404 });

  if (localPath === "/" || localPath === "") {
    if (context.config.collections.length === 0) {
      return Response.redirect(
        new URL(
          joinUrl(
            context.config.routing.basePath,
            context.config.defaultLocale,
          ),
          url,
        ),
        302,
      );
    }
    const locale = preferredLocale(request, context);
    const collection = context.config.collections.find(
      (candidate) => candidate.id === context.config.defaultCollection,
    );
    return redirectTo(
      url,
      collection
        ? pageRoute(context.config.routing.basePath, locale, "/", collection)
        : joinUrl(context.config.routing.basePath, locale),
      locale,
    );
  }

  const internal = context.config.routing.internalPath;
  if (localPath.startsWith(`${internal}/`) || localPath === internal) {
    return handleInternalRoute(request, localPath.slice(internal.length) || "/", context);
  }

  if (context.config.collections.length > 0) {
    const segments = localPath.split("/").filter(Boolean);
    const locale = context.config.locales.find(
      (candidate) => candidate.code === segments[0],
    );
    if (locale && segments.length === 1) {
      const collection = context.config.collections.find(
        (candidate) => candidate.id === context.config.defaultCollection,
      );
      if (collection) {
        return redirectTo(
          url,
          pageRoute(
            context.config.routing.basePath,
            locale.code,
            "/",
            collection,
          ),
          locale.code,
        );
      }
    }
    if (!locale) {
      const collection = collectionForNeutralPath(
        localPath,
        context.config.collections,
      );
      if (collection) {
        const preferred = preferredLocale(request, context);
        return redirectTo(
          url,
          joinUrl(context.config.routing.basePath, preferred, localPath),
          preferred,
        );
      }
    }
  }

  const seoRoute = matchRoute(localPath, context.routes, "public");
  if (seoRoute) return seoRoute.handler(request, context);

  const markdownPage = findRawMarkdownPage(url.pathname, context);
  if (markdownPage) return text(markdownPage.body, "text/markdown; charset=utf-8");

  const requestPath = normalizePagePath(url.pathname);
  const page = context.pages.find((candidate) => normalizePagePath(candidate.href) === requestPath);
  if (page) {
    const rendered = await context.services.renderPage(page, request, context);
    const response =
      rendered instanceof Response
        ? rendered
        : text(rendered, "text/html; charset=utf-8");
    return context.config.collections.length > 0
      ? withLocaleCookie(response, page.locale.code)
      : response;
  }

  return new Response("Not found", { status: 404 });
}

function redirectTo(url: URL, pathname: string, locale: string) {
  const target = new URL(url);
  target.pathname = pathname;
  return new Response(null, {
    status: 302,
    headers: {
      Location: target.toString(),
      "Set-Cookie": localeCookie(locale),
      "Cache-Control": "private, no-store",
      Vary: "Cookie, Accept-Language",
    },
  });
}

function preferredLocale(request: Request, context: FibelContext) {
  const available = context.config.locales.map((locale) => locale.code);
  const stored = cookieValue(request.headers.get("cookie"), "fibel_locale");
  if (stored && available.includes(stored)) return stored;

  const accepted = parseAcceptLanguage(
    request.headers.get("accept-language") ?? "",
  );
  for (const requested of accepted) {
    const exact = available.find(
      (locale) => locale.toLowerCase() === requested.toLowerCase(),
    );
    if (exact) return exact;
    const base = requested.split("-")[0]?.toLowerCase();
    const compatible = available.find(
      (locale) => locale.split("-")[0]?.toLowerCase() === base,
    );
    if (compatible) return compatible;
  }
  return context.config.defaultLocale;
}

function parseAcceptLanguage(header: string) {
  return header
    .split(",")
    .map((part, index) => {
      const [language = "", ...parameters] = part.trim().split(";");
      const quality = parameters
        .map((parameter) => parameter.trim().match(/^q=([0-9.]+)$/i)?.[1])
        .find(Boolean);
      return {
        language,
        quality: quality === undefined ? 1 : Number(quality),
        index,
      };
    })
    .filter(
      (entry) =>
        entry.language &&
        entry.language !== "*" &&
        Number.isFinite(entry.quality) &&
        entry.quality > 0,
    )
    .sort(
      (left, right) =>
        right.quality - left.quality || left.index - right.index,
    )
    .map((entry) => entry.language);
}

function cookieValue(header: string | null, name: string) {
  const value = (header ?? "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
  if (!value) return undefined;
  try {
    return decodeURIComponent(value);
  } catch {
    return undefined;
  }
}

function localeCookie(locale: string) {
  return `fibel_locale=${encodeURIComponent(locale)}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

function withLocaleCookie(response: Response, locale: string) {
  const headers = new Headers(response.headers);
  headers.append("Set-Cookie", localeCookie(locale));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
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

  const route = matchRoute(path, context.routes, "internal");
  if (route) return route.handler(request, context);
  return new Response("Not found", { status: 404 });
}

function matchRoute(
  path: string,
  routes: FibelRoute[],
  scope: "public" | "internal" | "origin",
) {
  return routes.find((route) => {
    const routeScope = route.scope ?? "both";
    const matchesScope =
      scope === "origin"
        ? routeScope === "origin"
        : routeScope === "both" || routeScope === scope;
    const matchesPath = route.path === path || (route.path.endsWith("/*") && path.startsWith(route.path.slice(0, -1)));
    return matchesScope && matchesPath;
  });
}
