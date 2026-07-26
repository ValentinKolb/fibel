---
title: Eigene Seiten und Solid
navTitle: Eigene Seiten
section: Architektur
order: 15
description: Serverseitig gerenderte Anwendungsseiten in die Fibel-Shell einbinden und ihren Markdown-Kontext für Suche und Dokumentationsassistent erhalten.
tags: [custom-pages, solid, ssr, islands]
updated: 2026-07-27
---

# Eigene Seiten und Solid

Eigene Seiten platzieren Anwendungsausgaben im normalen Routing und Layout von Fibel. Header, Sidebar, Suche, Theme, SEO, Markdown-Routen und Dokumentationsassistent bleiben bei Fibel. Die Host-Anwendung rendert weiterhin ihre eigenen Komponenten.

## Eine framework-neutrale Seite ergänzen

Seitendefinitionen werden in die Fibel-Konfiguration aufgenommen:

```ts
import { defineFibel } from "@k2b/fibel";

export default defineFibel({
  title: "Cloud UI",
  locales: [
    { code: "en", label: "English" },
    { code: "de", label: "Deutsch" },
  ],
  pages: [
    {
      path: "/panel-header",
      title: "PanelHeader",
      description: "Ein einheitlicher Bereich für Titel und Aktionen.",
      section: "Komponenten",
      order: 10,
      context: {
        default: panelHeaderMarkdown,
        de: panelHeaderMarkdownDe,
      },
      render: ({ context }) =>
        `<section class="panel-showcase">${context.html}</section>`,
    },
  ],
});
```

Fibel erzeugt die Seite unter jedem konfigurierten Locale. Im Beispiel entstehen `/en/panel-header` und `/de/panel-header`.

`context.default` ist der sprachneutrale Fallback. Locale-Schlüssel überschreiben ihn nur dort, wo eine Übersetzung vorliegt. Ein einzelner String reicht aus, wenn alle Locales denselben Kontext erhalten sollen.

Der Render-Callback erhält beide Formen:

- `context.markdown` wird von der Suche indexiert und über rohe `.md`-Routen, `llms.txt` sowie das bestehende `read_doc`-Tool des Assistenten bereitgestellt.
- `context.html` wird einmal mit dem Markdown-Renderer von Fibel erzeugt und kann auf der Seite angezeigt werden.

Damit bleiben die durchsuchbare Erklärung und die sichtbare Komponentendokumentation in einer Quelle. Fibel leitet keine Dokumentation aus gerendertem HTML ab.

## Das Body-Layout wählen

`layout: "article"` ist der Standard. Dieses Layout ergänzt den eigenen Body um Seitentitel, Beschreibung, Chips, Markdown-Typografie und Vor-/Zurück-Navigation.

`layout: "full"` behält Header, Sidebar, Footer, Suche und Assistent, stellt der Komponente aber einen breiteren Body ohne Artikel-Chrome bereit:

```ts
{
  path: "/catalog",
  title: "Komponentenkatalog",
  description: "Gemeinsame UI-Komponenten durchsuchen.",
  layout: "full",
  context: catalogMarkdown,
  render: ({ context }) =>
    `<div class="catalog">${context.html}</div>`,
}
```

## Solid-Komponenten und Islands rendern

Der optionale Einstiegspunkt `@k2b/fibel/solid` verbindet eine eigene Seite mit einem bestehenden `@k2b/ssr`-Renderer. Er registriert weder ein Bun-Plugin noch baut er Assets oder mountet eine SSR-Route.

```ts
// src/ssr.ts
import { createConfig } from "@k2b/ssr";
import {
  fibelSsrTemplate,
  type FibelSsrTemplateOptions,
} from "@k2b/fibel/solid";

export const { config, plugin, html } =
  createConfig<FibelSsrTemplateOptions>({
    rootDir: import.meta.dir,
    template: fibelSsrTemplate,
  });
```

Dieser Renderer wird an `solidPage` übergeben:

```tsx
import { defineFibel } from "@k2b/fibel";
import { solidPage } from "@k2b/fibel/solid";
import { html } from "./ssr";
import PanelHeaderPage from "./PanelHeaderPage";

export default defineFibel({
  title: "Cloud UI",
  pages: [
    solidPage({
      html,
      path: "/panel-header",
      title: "PanelHeader",
      description: "Ein einheitlicher Bereich für Titel und Aktionen.",
      section: "Komponenten",
      context: panelHeaderMarkdown,
      component: ({ context }) => (
        <PanelHeaderPage documentation={context.html} />
      ),
    }),
  ],
});
```

Normale `.tsx`-Komponenten werden auf dem Server gerendert. Importe aus `.island.tsx` oder `.client.tsx` folgen den üblichen Regeln von `@k2b/ssr`. Island-Props müssen serialisierbar bleiben.

Der Host mountet `config` an seiner einzigen `/_ssr`-Route und nutzt `plugin()` für Development- und Produktions-Builds. Fibel ergänzt weder einen weiteren Service noch einen eigenen Build-Befehl.

Wenn der Host bereits eine `@k2b/ssr`-Konfiguration mit einem anderen HTML-Template besitzt, entsteht nur für den `html`-Renderer eine zweite Konfiguration. Routen und Builds verwenden weiterhin die ursprüngliche Konfiguration und ihr Plugin:

```ts
const siteSsr = createConfig<PageOptions>({
  rootDir: import.meta.dir,
  template: siteTemplate,
});

const fibelSsr = createConfig<FibelSsrTemplateOptions>({
  rootDir: import.meta.dir,
  template: fibelSsrTemplate,
});

export const ssrConfig = siteSsr.config;
export const plugin = siteSsr.plugin;
export const html = siteSsr.html;
export const fibelHtml = fibelSsr.html;
```

Beide Renderer verweisen auf denselben `/_ssr`-Pfad. Nur `siteSsr.plugin()` wird registriert; es findet alle Islands unter dem gemeinsamen `rootDir`.

## Dokumentationsbereiche getrennt halten

Getrennte Fibel-Instanzen eignen sich, wenn Leser getrennte Navigation, Suchergebnisse und Assistenten-Konversationen erwarten. Sie können trotzdem in einem Hono-Prozess und einem Deployment laufen:

```ts
import { Hono } from "hono";
import {
  createFibelApp,
  defineFibel,
  type FibelHeaderConfig,
} from "@k2b/fibel";

const cloudHeader = {
  title: "Cloud",
  homeHref: ({ locale }) => `/${locale}`,
  links: [
    {
      label: "Docs",
      href: ({ locale }) => `/docs/${locale}`,
      activeWhen: "/docs",
    },
    {
      label: "UI",
      href: ({ locale }) => `/ui/${locale}`,
      activeWhen: "/ui",
    },
  ],
} satisfies FibelHeaderConfig;

const docs = await createFibelApp(
  defineFibel({
    title: "Cloud Docs",
    routing: { basePath: "/docs" },
    header: cloudHeader,
  }),
);

const ui = await createFibelApp(
  defineFibel({
    title: "Cloud UI",
    routing: { basePath: "/ui" },
    header: {
      ...cloudHeader,
      searchLabel: "Cloud UI durchsuchen",
      searchPlaceholder: "Komponenten durchsuchen...",
    },
    pages: uiPages,
  }),
);

export default new Hono()
  .mount("/docs", docs.fetch)
  .mount("/ui", ui.fetch);
```

Jede Instanz besitzt ihre Sidebar, ihren Suchindex, ihren Assistenten-Kontext, ihre Discovery-Dateien und ihre pfadgebundene Chat-Session. Provider und Rate-Limiter können zwischen den Assistant-Plugins geteilt werden, damit ein gemeinsames Prozessbudget gilt.

## Den Header wiederverwenden oder entfernen

Standard-Layout und externe Seiten verwenden denselben framework-neutralen Renderer:

```ts
import { renderFibelHeader } from "@k2b/fibel/layout";

const header = renderFibelHeader({
  title: "Cloud",
  homeHref: "/de",
  links: [
    { label: "Docs", href: "/docs/de" },
    { label: "UI", href: "/ui/de", active: true },
  ],
  theme: "light",
  search: false,
});
```

Der Renderer liefert das kanonische Header-Markup von Fibel. Interaktive Controls setzen die regulären Fibel-Styles und Client-Assets voraus.

Eine äußere Anwendungsshell kann ausschließlich den integrierten Header entfernen:

```ts
import { defaultPlugins } from "@k2b/fibel";
import { layoutPlugin } from "@k2b/fibel/plugins";

const plugins = [
  ...defaultPlugins().filter((plugin) => plugin.name !== "layout"),
  layoutPlugin({ header: false }),
];
```

Sidebar, Body, Search-Shortcut, Footer und Assistent bleiben erhalten.
