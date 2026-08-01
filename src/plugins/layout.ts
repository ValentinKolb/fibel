import { renderFibelHeader } from "../layout";
import { navKey, pageRoute, sameDocument } from "../collections";
import type {
  FibelContext,
  FibelHeaderHref,
  FibelHeaderLinkContext,
  FibelPage,
  FibelPageDocument,
  FibelPlugin,
  NavSection,
  ThemeMode,
} from "../types";
import { escapeHtml, joinUrl } from "../utils";
import { clientScript } from "../client/script";
import { readingTime } from "../reading-time";

export type LayoutOptions = {
  header?: boolean;
};

export function layoutPlugin(options: LayoutOptions = {}): FibelPlugin {
  return {
    name: "layout",
    setup(context) {
      context.services.renderPage = async (page, request) => {
        const renderDocumentForPage = (document: FibelPageDocument) =>
          renderDocument(page, request, context, document, options);
        if (!page.render) return renderDocumentForPage({ body: page.html });

        const rendered = await page.render({
          request,
          page,
          context: {
            markdown: page.body,
            html: page.html,
          },
          fibel: context,
          renderDocument: renderDocumentForPage,
        });
        if (rendered instanceof Response) return rendered;
        return renderDocumentForPage(typeof rendered === "string" ? { body: rendered } : rendered);
      };
    },
    routes() {
      return [
        {
          path: "/client.js",
          handler: () => new Response(clientScript, { headers: { "Content-Type": "application/javascript; charset=utf-8" } }),
        },
      ];
    },
  };
}

function renderDocument(
  page: FibelPage,
  request: Request,
  context: FibelContext,
  document: FibelPageDocument,
  options: LayoutOptions,
) {
  const theme = context.services.getTheme(request, context);
  const config = context.config;
  const stylesheet = joinUrl(config.routing.basePath, config.routing.internalPath, "styles.css");
  const client = joinUrl(config.routing.basePath, config.routing.internalPath, "client.js");
  const favicon =
    config.seo.favicon ??
    joinUrl(config.routing.basePath, config.routing.internalPath, "favicon.svg");
  const searchUrl = joinUrl(config.routing.basePath, config.routing.internalPath, "search");
  const canonical = config.siteUrl ? `${config.siteUrl}${page.href}` : page.href;
  const title = page.meta.title === config.title ? page.meta.title : `${page.meta.title} - ${config.title}`;

  return `<!doctype html>
<html lang="${page.locale.code}" dir="${page.locale.dir ?? "ltr"}" class="${theme}" data-theme="${theme}" style="color-scheme:${theme}${options.header === false ? ";--fibel-nav-h:0rem" : ""}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="view-transition" content="same-origin">
    <meta name="theme-color" content="${theme === "dark" ? "#0b1020" : "#f8fafc"}">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(page.meta.description)}">
    <link rel="canonical" href="${escapeHtml(canonical)}">
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="${escapeHtml(config.title)}">
    <meta property="og:title" content="${escapeHtml(page.meta.title)}">
    <meta property="og:description" content="${escapeHtml(page.meta.description)}">
    <meta property="og:url" content="${escapeHtml(canonical)}">
    <link rel="icon" href="${escapeHtml(favicon)}">
    <link rel="stylesheet" href="${stylesheet}">${renderHeadTags(page, context)}
  </head>
  <body class="min-h-screen bg-white text-zinc-950 antialiased dark:bg-zinc-950 dark:text-zinc-100">
    ${renderShell(page, context.nav.get(navKey(page.locale.code, page.collection?.id)) ?? [], theme, searchUrl, context, document.body, options)}
    ${renderBodyItems(page, context)}
    <script>window.__FIBEL__=${JSON.stringify({
      cookieName: config.theme.cookieName,
      defaultTheme: config.theme.defaultMode,
      searchUrl,
      locale: page.locale.code,
      ...(config.collections.length > 0
        ? {
            collection: page.collection?.id,
            collections: config.collections.map(({ id, label }) => ({
              id,
              label,
            })),
          }
        : {}),
    })}</script>
    <script type="module" src="${client}"></script>
    ${document.scripts ?? ""}
  </body>
</html>`;
}

function renderHeadTags(page: FibelPage, context: FibelContext) {
  const tags = context.headTags.map((tag) => tag(page, context)).filter(Boolean);
  return tags.length ? `\n    ${tags.join("\n    ")}` : "";
}

function renderBodyItems(page: FibelPage, context: FibelContext) {
  return context.bodyItems.map((item) => item(page, context)).filter(Boolean).join("\n    ");
}

function renderShell(
  page: FibelPage,
  nav: NavSection[],
  theme: ThemeMode,
  searchUrl: string,
  context: FibelContext,
  body: string,
  options: LayoutOptions,
) {
  const headerVisible = options.header !== false;
  const header = context.config.header;
  const searchEnabled = header.search !== false;
  const themeToggle = header.themeToggle !== false;
  const sidebarPosition = headerVisible
    ? "top-16 lg:top-16 lg:h-[calc(100vh-4rem)]"
    : "top-0 lg:top-0 lg:h-screen";
  const backdropTop = headerVisible ? "top-16" : "top-0";
  const sidebarScrollKey = [
    "fibel-sidebar",
    context.config.routing.basePath || "/",
    page.locale.code,
    page.collection?.id ?? "",
  ].join(":");
  return `<div class="fibel-app min-h-screen">
    ${headerVisible ? renderConfiguredHeader(page, context, theme) : ""}

    <div class="mx-auto grid max-w-[120rem] grid-cols-1 lg:grid-cols-[19rem_minmax(0,1fr)]">
      <div class="fixed inset-x-0 bottom-0 ${backdropTop} z-40 hidden bg-zinc-950/20 backdrop-blur-[1px] lg:hidden" data-sidebar-backdrop></div>
      <aside class="fibel-sidebar fixed bottom-0 left-0 ${sidebarPosition} z-50 w-80 -translate-x-full overflow-y-auto border-r border-zinc-200 bg-white p-5 pt-6 transition-transform dark:border-white/10 dark:bg-zinc-950 lg:sticky lg:z-20 lg:w-auto lg:translate-x-0 lg:pt-9" data-sidebar data-sidebar-scroll-key="${escapeHtml(sidebarScrollKey)}">
        ${renderCollectionNav(page, context)}
        ${renderNav(nav, page)}
      </aside>
      ${renderSidebarScrollRestore()}
      ${renderMain(page, context, body)}
    </div>
    ${renderFooter(page, context, theme, themeToggle)}
    ${searchEnabled ? renderSearchDialog(searchUrl, header.searchPlaceholder ?? "Search documentation...", page, context) : ""}
  </div>`;
}

function renderSidebarScrollRestore() {
  return `<script>
try {
  const sidebar = document.currentScript.previousElementSibling;
  const value = sessionStorage.getItem(sidebar.dataset.sidebarScrollKey);
  const scrollTop = Number(value);
  if (value !== null && Number.isFinite(scrollTop) && scrollTop >= 0) sidebar.scrollTop = scrollTop;
} catch {}
</script>`;
}

function renderMain(page: FibelPage, context: FibelContext, body: string) {
  if (page.layout === "full") {
    return `<main class="min-w-0 px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
        <div class="mx-auto w-full max-w-[100rem]">${body}</div>
      </main>`;
  }

  return `<main class="min-w-0 px-5 py-10 sm:px-10 lg:px-20 lg:py-14">
        <article class="mx-auto max-w-4xl">
          <div class="mb-9">
            <h1 class="text-[2.6rem] font-semibold leading-tight tracking-[-0.01em] text-zinc-900 dark:text-white md:text-5xl">${escapeHtml(page.meta.title)}</h1>
            <p class="mt-5 max-w-3xl text-[1.15rem] leading-8 text-zinc-600 dark:text-zinc-300">${escapeHtml(page.meta.description)}</p>
            ${renderPageActions(page)}
          </div>
          <div class="fibel-prose">${body}</div>
          ${renderPager(page, context.pages.filter((candidate) => candidate.locale.code === page.locale.code && candidate.collection?.id === page.collection?.id && !candidate.meta.hidden))}
        </article>
      </main>`;
}

function themeIcon(theme: ThemeMode) {
  return theme === "dark"
    ? '<svg viewBox="0 0 24 24" aria-hidden="true" class="h-4 w-4"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.2m0 13.6V21m6.36-15.36-1.55 1.55M7.19 16.81l-1.55 1.55M21 12h-2.2M5.2 12H3m15.36 6.36-1.55-1.55M7.19 7.19 5.64 5.64M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"/></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true" class="h-4 w-4"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M21 13.2A7.5 7.5 0 0 1 10.8 3 8.5 8.5 0 1 0 21 13.2Z"/></svg>';
}

function searchIcon(className: string) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true" class="${className}"><path fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" d="m21 21-4.35-4.35M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4Z"/></svg>`;
}

function renderConfiguredHeader(page: FibelPage, context: FibelContext, theme: ThemeMode) {
  const config = context.config;
  const header = config.header;
  const linkContext: FibelHeaderLinkContext = {
    locale: page.locale.code,
    pathname: page.href,
    basePath: config.routing.basePath,
    collection: page.collection?.id,
  };
  const links = header.links
    ? header.links.map((link) => {
        const href = resolveHeaderHref(link.href, linkContext);
        return {
          label: link.label,
          href,
          active: link.activeWhen
            ? pathMatchesPrefix(page.href, link.activeWhen)
            : isLocalPath(href) && normalizeSlug(href) === normalizeSlug(page.href),
        };
      })
    : config.headerLinks.map((link) => ({
        label: link.label,
        href: resolveNavHref(link.value, page, context),
        active: isLocalPath(link.value) && normalizeSlug(link.value) === page.slug,
      }));
  const locales = context.pages
    .filter((candidate) => sameDocument(candidate, page))
    .map((candidate) => ({
      label: candidate.locale.label,
      href: candidate.href,
      current: candidate.locale.code === page.locale.code,
    }));

  return renderFibelHeader({
    title: header.title ?? config.title,
    homeHref: resolveHeaderHref(
      header.homeHref ??
        (() =>
          pageRoute(
            config.routing.basePath,
            page.locale.code,
            "/",
            page.collection,
          )),
      linkContext,
    ),
    links,
    locales,
    theme,
    search: header.search !== false,
    searchLabel: header.searchLabel ?? "Search docs",
    searchAriaLabel: header.searchLabel ?? "Search documentation",
    themeToggle: header.themeToggle !== false,
    mobileNavigation: header.mobileNavigation !== false,
  });
}

function resolveHeaderHref(value: FibelHeaderHref, context: FibelHeaderLinkContext) {
  return typeof value === "function" ? value(context) : value;
}

function pathMatchesPrefix(pathname: string, prefix: string) {
  const path = normalizeSlug(pathname);
  const normalizedPrefix = normalizeSlug(prefix);
  return path === normalizedPrefix || path.startsWith(`${normalizedPrefix}/`);
}

function renderNav(nav: NavSection[], page: FibelPage) {
  return `<nav class="space-y-5 text-sm">
    ${nav
      .map(
        (section) => `<details class="group" open>
          <summary class="flex cursor-pointer list-none items-center justify-between rounded-md px-1 py-1.5 text-[1.05rem] font-bold text-zinc-800 hover:text-zinc-950 dark:text-zinc-200 dark:hover:text-white">
            ${escapeHtml(section.label)}
            <span class="grid h-6 w-6 place-items-center text-zinc-400 transition group-open:rotate-90">${sectionChevronIcon()}</span>
          </summary>
          <div class="mt-2 space-y-1">
            ${section.pages
              .map((item) => {
                const active = item.id === page.id;
                return `<a class="fibel-sidebar-link ${active ? "is-active font-semibold text-zinc-950 dark:text-white" : "border-transparent text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"} block border-l-2 py-1.5 pl-4 text-[0.98rem] leading-6" href="${item.href}">${escapeHtml(item.meta.navTitle)}</a>`;
              })
              .join("")}
          </div>
        </details>`,
      )
      .join("")}
  </nav>`;
}

function renderCollectionNav(page: FibelPage, context: FibelContext) {
  if (context.config.collections.length < 2) return "";
  return `<nav class="mb-6 space-y-1 border-b border-zinc-200 pb-5 dark:border-white/10" aria-label="Documentation collections">
    ${context.config.collections
      .map((collection) => {
        const active = collection.id === page.collection?.id;
        return `<a class="fibel-collection-link${active ? " is-active" : ""}" href="${pageRoute(context.config.routing.basePath, page.locale.code, "/", collection)}" aria-current="${active ? "page" : "false"}">${escapeHtml(collection.label)}</a>`;
      })
      .join("")}
  </nav>`;
}

function renderLocaleMenu(page: FibelPage, context: FibelContext, placement: "header" | "footer") {
  const sameSlug = context.pages.filter((candidate) => sameDocument(candidate, page));
  if (sameSlug.length < 2) return "";
  const current = sameSlug.find((candidate) => candidate.locale.code === page.locale.code) ?? page;
  const menuClass = placement === "header" ? "right-0 top-11" : "bottom-11 left-0 sm:left-auto sm:right-0";
  return `<div class="relative" data-locale-menu>
    <button class="inline-flex h-9 items-center gap-2 rounded-full border border-zinc-300 bg-white px-3 text-sm text-zinc-700 shadow-[0_1px_8px_rgb(0_0_0_/_0.04)] hover:border-zinc-400 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200 dark:hover:bg-white/10" type="button" data-locale-trigger aria-haspopup="listbox" aria-expanded="false">
      <span>${escapeHtml(current.locale.label)}</span>
      <span class="grid place-items-center text-zinc-400">${chevronIcon()}</span>
    </button>
    <div class="absolute ${menuClass} z-50 min-w-48 space-y-1 rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl shadow-zinc-950/10 dark:border-white/10 dark:bg-zinc-900 dark:shadow-black/30" data-locale-list role="listbox" aria-label="Language" hidden>
      ${sameSlug
        .map((candidate) => {
          const active = candidate.locale.code === page.locale.code;
          return `<a class="fibel-locale-option ${active ? "is-current" : "text-zinc-700 hover:bg-zinc-100 focus:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-white/10 dark:focus:bg-white/10"} flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm outline-none transition" href="${candidate.href}" role="option" aria-selected="${active}" tabindex="-1"><span>${escapeHtml(candidate.locale.label)}</span>${active ? `<span class="fibel-locale-check">${checkIcon("h-4 w-4")}</span>` : ""}</a>`;
        })
        .join("")}
    </div>
  </div>`;
}

function sectionChevronIcon() {
  return '<svg viewBox="0 0 20 20" aria-hidden="true" class="h-5 w-5"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="m7 5 5 5-5 5"/></svg>';
}

function renderFooter(
  page: FibelPage,
  context: FibelContext,
  theme: ThemeMode,
  themeToggle: boolean,
) {
  const links = context.config.footerLinks;
  const footerItems = context.footerItems;
  if (links.length === 0 && context.config.locales.length < 2 && footerItems.length === 0) return "";
  return `<footer class="border-t border-zinc-200 bg-white dark:border-white/10 dark:bg-zinc-950" data-fibel-footer>
    <div class="mx-auto flex max-w-[120rem] flex-col gap-4 px-5 py-7 text-sm text-zinc-500 dark:text-zinc-400 md:flex-row md:items-center md:justify-between lg:px-8">
      <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span>© ${new Date().getFullYear()} ${escapeHtml(context.config.title)}</span>
        ${links.map((link) => `<a class="fibel-footer-link" href="${escapeHtml(resolveNavHref(link.value, page, context))}">${escapeHtml(link.label)}</a>`).join("")}
      </div>
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center md:ml-auto">
        ${footerItems.length > 0 ? `<div class="flex items-center gap-4">${footerItems.join("")}</div>` : ""}
        <div class="flex items-center gap-2">
          ${themeToggle ? `<button class="fibel-icon-button md:hidden" type="button" data-theme-toggle aria-label="Toggle theme"><span data-theme-icon>${themeIcon(theme)}</span></button>` : ""}
          ${renderLocaleMenu(page, context, "footer")}
        </div>
      </div>
    </div>
  </footer>`;
}

function renderPageActions(page: FibelPage) {
  const markdownHref = rawMarkdownHref(page);
  const tags = page.meta.tags.slice(0, 4);
  const date = page.meta.date ? `<span class="page-chip">${calendarIcon()}${escapeHtml(page.meta.date)}</span>` : "";
  const authors = page.meta.authors.length > 0 ? `<span class="page-chip">By ${escapeHtml(page.meta.authors.join(", "))}</span>` : "";
  const updated = page.meta.updated ? `<span class="page-chip">${calendarIcon()}Updated ${escapeHtml(page.meta.updated)}</span>` : "";
  return `<div class="mt-5 flex flex-wrap items-center gap-2">
    <span class="page-chip">${clockIcon()}${readingTime(page.body)} min read</span>
    ${date}
    ${authors}
    ${updated}
    ${tags.map((tag) => `<span class="page-chip page-chip-accent">#${escapeHtml(tag)}</span>`).join("")}
    <button class="page-chip-action" type="button" data-copy-page aria-label="Copy page link" title="Copy page link"><span class="copy-feedback-icon">${linkIcon("h-3.5 w-3.5")}</span></button>
    <button class="page-chip-action" type="button" data-copy-markdown="${escapeHtml(markdownHref)}" aria-label="Copy Markdown link" title="Copy Markdown link"><span class="copy-feedback-icon">${markdownIcon()}</span></button>
  </div>`;
}

function rawMarkdownHref(page: FibelPage) {
  const normalized = page.href.replace(/\/+$/g, "");
  return `${normalized || "/index"}.md`;
}

function chevronIcon() {
  return '<svg viewBox="0 0 20 20" aria-hidden="true" class="h-3.5 w-3.5"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="m6 8 4 4 4-4"/></svg>';
}

function checkIcon(className: string) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true" class="${className}"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="m20 6-11 11-5-5"/></svg>`;
}

function clockIcon() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true" class="h-3.5 w-3.5"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>';
}

function calendarIcon() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true" class="h-3.5 w-3.5"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/></svg>';
}

function linkIcon(className: string) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true" class="${className}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.07 0l2.12-2.12a5 5 0 0 0-7.07-7.07L11 4.93"/><path d="M14 11a5 5 0 0 0-7.07 0L4.81 13.12a5 5 0 0 0 7.07 7.07L13 19.07"/></svg>`;
}

function markdownIcon() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true" class="h-3.5 w-3.5"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M4 6h16v12H4zM7 15V9l2.5 3L12 9v6m4-6v6m0 0-2-2m2 2 2-2"/></svg>';
}

const isLocalPath = (value: string) => value.startsWith("/") && !/^\/\//.test(value);

const normalizeSlug = (value: string) => value.replace(/\/+$/g, "") || "/";

function resolveNavHref(value: string, page: FibelPage, context: FibelContext) {
  if (!isLocalPath(value)) return value;
  const slug = normalizeSlug(value);
  return pageRoute(
    context.config.routing.basePath,
    page.locale.code,
    slug,
    page.collection,
  );
}

function renderPager(page: FibelPage, pages: FibelPage[]) {
  const ordered = [...pages].sort((a, b) => a.meta.order - b.meta.order || a.href.localeCompare(b.href));
  const index = ordered.findIndex((candidate) => candidate.id === page.id);
  const prev = index > 0 ? ordered[index - 1] : undefined;
  const next = index >= 0 && index < ordered.length - 1 ? ordered[index + 1] : undefined;
  return `<div class="mt-16 grid gap-4 border-t border-zinc-200 pt-7 dark:border-white/10 sm:grid-cols-2">
    ${prev ? `<a class="fibel-pager-link group rounded-lg border border-zinc-200 bg-white p-5 transition hover:shadow-[0_8px_28px_rgb(0_0_0_/_0.08)] dark:border-white/10 dark:bg-white/[0.03]" href="${prev.href}"><span class="text-xs text-zinc-500 dark:text-zinc-400">Previous</span><strong class="fibel-pager-title mt-1 block text-zinc-900 dark:text-white">${escapeHtml(prev.meta.navTitle)}</strong></a>` : "<div></div>"}
    ${next ? `<a class="fibel-pager-link group rounded-lg border border-zinc-200 bg-white p-5 text-right transition hover:shadow-[0_8px_28px_rgb(0_0_0_/_0.08)] dark:border-white/10 dark:bg-white/[0.03]" href="${next.href}"><span class="text-xs text-zinc-500 dark:text-zinc-400">Next</span><strong class="fibel-pager-title mt-1 block text-zinc-900 dark:text-white">${escapeHtml(next.meta.navTitle)}</strong></a>` : "<div></div>"}
  </div>`;
}

function renderSearchDialog(
  searchUrl: string,
  placeholder: string,
  page: FibelPage,
  context: FibelContext,
) {
  const initialMessage =
    context.config.collections.length > 0
      ? "Type to search this collection. Open anytime with Mod+K."
      : "Type to search the current language. Open anytime with Mod+K.";
  const scopes =
    context.config.collections.length > 1
      ? `<div class="flex flex-wrap gap-1 px-3 pb-2" data-search-scopes role="group" aria-label="Search scope">
          ${[
            { id: "", label: "Everything" },
            ...context.config.collections.map((collection) => ({
              id: collection.id,
              label: collection.label,
            })),
          ]
            .map(
              (scope) =>
                `<button class="fibel-search-scope${scope.id === page.collection?.id ? " is-active" : ""}" type="button" data-search-scope="${escapeHtml(scope.id)}" aria-pressed="${scope.id === page.collection?.id}">${escapeHtml(scope.label)}</button>`,
            )
            .join("")}
        </div>`
      : "";
  return `<div class="fixed inset-0 z-[70] hidden bg-slate-950/40 p-4 backdrop-blur-sm" data-search-dialog>
    <div class="mx-auto mt-20 max-w-2xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl shadow-zinc-950/20 ring-1 ring-black/5 dark:border-white/10 dark:bg-zinc-900 dark:shadow-black/40 dark:ring-white/10">
      <div class="p-3">
        <div class="flex items-center gap-3 rounded-[1.45rem] bg-zinc-100 px-4 py-2.5 transition-colors focus-within:bg-zinc-200/70 dark:bg-white/[0.07] dark:focus-within:bg-white/10">
          <span class="text-zinc-400">${searchIcon("h-5 w-5")}</span>
          <input class="min-w-0 flex-1 border-0 bg-transparent py-1 text-base outline-none placeholder:text-slate-400" data-search-input placeholder="${escapeHtml(placeholder)}" autocomplete="off">
          <kbd class="rounded-full border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[11px] text-zinc-500 dark:border-white/10 dark:bg-white/10 dark:text-zinc-400">Esc</kbd>
        </div>
      </div>
      ${scopes}
      <div class="max-h-[28rem] overflow-y-auto p-2" data-search-results data-search-url="${searchUrl}">
        <p class="px-3 py-8 text-center text-sm text-slate-500 dark:text-slate-400">${initialMessage}</p>
      </div>
    </div>
  </div>`;
}
