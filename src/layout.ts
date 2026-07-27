import type { ThemeMode } from "./types";
import { escapeHtml } from "./utils";

export type FibelHeaderLink = {
  label: string;
  href: string;
  active?: boolean;
};

export type FibelHeaderLocale = {
  label: string;
  href: string;
  current?: boolean;
};

export type RenderFibelHeaderOptions = {
  title: string;
  homeHref: string;
  links?: FibelHeaderLink[];
  locales?: FibelHeaderLocale[];
  theme?: ThemeMode;
  search?: boolean;
  searchLabel?: string;
  searchAriaLabel?: string;
  themeToggle?: boolean;
  mobileNavigation?: boolean;
};

export function renderFibelHeader(options: RenderFibelHeaderOptions) {
  const {
    title,
    homeHref,
    links = [],
    locales = [],
    theme = "light",
    search = true,
    searchLabel = "Search docs",
    searchAriaLabel = "Search documentation",
    themeToggle = true,
    mobileNavigation = true,
  } = options;

  return `<header class="fibel-topbar sticky top-0 z-40 border-b border-zinc-200 bg-white/92 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/90">
      <div class="relative mx-auto grid h-16 max-w-[120rem] grid-cols-[auto_1fr_auto] items-center gap-3 px-4 md:flex md:gap-5 md:px-5 lg:px-8">
        ${
          mobileNavigation
            ? `<button class="fibel-icon-button md:hidden" type="button" data-nav-toggle aria-label="Open navigation" aria-expanded="false">
          <span class="sr-only">Open navigation</span>
          ${menuIcon()}
        </button>`
            : ""
        }
        <a class="fibel-brand absolute left-1/2 flex min-w-0 -translate-x-1/2 items-center text-2xl font-medium leading-[1.3] tracking-tight md:static md:translate-x-0 md:text-[2rem]" href="${escapeHtml(homeHref)}">
          <span class="max-w-[calc(100vw-9.5rem)] truncate lowercase md:max-w-none">${escapeHtml(title)}</span><span class="ml-0.5 opacity-80">|</span>
        </a>
        ${renderLinks(links)}
        <div class="ml-auto hidden items-center gap-3 md:flex">
          ${
            search
              ? `<button class="fibel-search-button" type="button" data-search-open>
            <span class="text-zinc-400">${searchIcon("h-4 w-4")}</span>
            <span class="text-zinc-400">${escapeHtml(searchLabel)}</span>
            <span class="ml-auto flex items-center gap-1">
              <kbd class="rounded-full border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[11px] text-zinc-500 dark:border-white/10 dark:bg-white/10 dark:text-zinc-400">⌘K</kbd>
              <kbd class="rounded-full border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[11px] text-zinc-500 dark:border-white/10 dark:bg-white/10 dark:text-zinc-400">/</kbd>
            </span>
          </button>`
              : ""
          }
          ${renderLocaleMenu(locales)}
          ${
            themeToggle
              ? `<button class="fibel-control-icon-button" type="button" data-theme-toggle aria-label="Toggle theme">
            <span data-theme-icon>${themeIcon(theme)}</span>
          </button>`
              : ""
          }
        </div>
        ${
          search
            ? `<button class="fibel-icon-button ml-auto md:hidden" type="button" data-search-open aria-label="${escapeHtml(searchAriaLabel)}">
          ${searchIcon("h-5 w-5")}
        </button>`
            : ""
        }
      </div>
    </header>`;
}

function renderLinks(links: FibelHeaderLink[]) {
  if (links.length === 0) return "";
  return `<nav class="hidden items-center gap-7 text-[15px] text-zinc-700 dark:text-zinc-300 md:flex">
    ${links
      .map(
        (link) =>
          `<a class="fibel-header-link ${link.active ? "is-active" : ""}" href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>`,
      )
      .join("")}
  </nav>`;
}

function renderLocaleMenu(locales: FibelHeaderLocale[]) {
  if (locales.length < 2) return "";
  const current = locales.find((locale) => locale.current) ?? locales[0];
  return `<div class="relative" data-locale-menu>
    <button class="inline-flex h-9 items-center gap-2 rounded-full border border-zinc-300 bg-white px-3 text-sm text-zinc-700 shadow-[0_1px_8px_rgb(0_0_0_/_0.04)] hover:border-zinc-400 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200 dark:hover:bg-white/10" type="button" data-locale-trigger aria-haspopup="listbox" aria-expanded="false">
      <span>${escapeHtml(current.label)}</span>
      <span class="grid place-items-center text-zinc-400">${chevronIcon()}</span>
    </button>
    <div class="absolute right-0 top-11 z-50 min-w-48 space-y-1 rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl shadow-zinc-950/10 dark:border-white/10 dark:bg-zinc-900 dark:shadow-black/30" data-locale-list role="listbox" aria-label="Language" hidden>
      ${locales
        .map(
          (locale) =>
            `<a class="fibel-locale-option ${locale.current ? "is-current" : ""} flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm outline-none transition ${
              locale.current
                ? ""
                : "text-zinc-700 hover:bg-zinc-100 focus:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-white/10 dark:focus:bg-white/10"
            }" href="${escapeHtml(locale.href)}" role="option" aria-selected="${Boolean(locale.current)}" tabindex="-1"><span>${escapeHtml(locale.label)}</span>${
              locale.current
                ? `<span class="fibel-locale-check">${checkIcon("h-4 w-4")}</span>`
                : ""
            }</a>`,
        )
        .join("")}
    </div>
  </div>`;
}

function menuIcon() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true" class="h-5 w-5"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M5 7h14M5 12h14M5 17h14"/></svg>';
}

function searchIcon(className: string) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true" class="${className}"><path fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" d="m21 21-4.35-4.35M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4Z"/></svg>`;
}

function themeIcon(theme: ThemeMode) {
  return theme === "dark"
    ? '<svg viewBox="0 0 24 24" aria-hidden="true" class="h-4 w-4"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.2m0 13.6V21m6.36-15.36-1.55 1.55M7.19 16.81l-1.55 1.55M21 12h-2.2M5.2 12H3m15.36 6.36-1.55-1.55M7.19 7.19 5.64 5.64M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"/></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true" class="h-4 w-4"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M21 13.2A7.5 7.5 0 0 1 10.8 3 8.5 8.5 0 1 0 21 13.2Z"/></svg>';
}

function chevronIcon() {
  return '<svg viewBox="0 0 20 20" aria-hidden="true" class="h-3.5 w-3.5"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="m6 8 4 4 4-4"/></svg>';
}

function checkIcon(className: string) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true" class="${className}"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="m20 6-11 11-5-5"/></svg>`;
}
