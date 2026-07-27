---
title: MCP für Coding-Agenten
navTitle: MCP
section: Integrierte Plugins
order: 29
description: Stellt sichtbare Fibel-Dokumentation über einen öffentlichen, schreibgeschützten MCP-Endpunkt für Coding-Agenten bereit.
tags: [mcp, coding-agenten, plugin]
updated: 2026-07-27
---

# MCP für Coding-Agenten

Das optionale MCP-Plugin ermöglicht Coding-Agenten, die Dokumentation einer Fibel-Instanz zu durchsuchen und zu lesen. Es läuft innerhalb der vorhandenen Fibel-Fetch-App und benötigt keinen zusätzlichen Prozess, Provider, Datenbankdienst oder Zugangsdaten.

## Endpunkt aktivieren

`mcpPlugin()` wird nach den Standard-Plugins ergänzt:

```ts
import { defaultPlugins, defineFibel } from "@k2b/fibel";
import { mcpPlugin } from "@k2b/fibel/plugins";

export default defineFibel({
  title: "Product Docs",
  plugins: [
    ...defaultPlugins(),
    mcpPlugin(),
  ],
});
```

Mit dem Standard-Routing liegt der Streamable-HTTP-Endpunkt unter `/_fibel/mcp`. Eine unter `/docs` eingebundene Website stellt ihn unter `/docs/_fibel/mcp` bereit.

Bei vorhandenem Standard-Layout ergänzt das Plugin außerdem den Eintrag **MCP** im Footer. Er öffnet Einrichtungsinformationen und eine absolute Endpunkt-URL, die aus dem aktuellen Browser-Origin und dem Fibel-Routing entsteht. Ein zusätzlicher Wert für die Anwendungs-URL ist nicht erforderlich. `siteUrl` bleibt die kanonische öffentliche URL für SEO- und Discovery-Ausgaben.

## Verfügbare Tools

Der Server stellt zwei schreibgeschützte Tools bereit:

- `search_docs({ query, locale? })` durchsucht sichtbare Seiten. Ohne Locale gilt `defaultLocale`.
- `read_doc({ href })` liefert den Markdown-Inhalt einer exakten sichtbaren Seite aus dem Suchergebnis.

Die Tools verwenden die vorhandene Fibel-Suche und den Seitenkontext. Markdown-Dateien und das explizite `context`-Markdown von [Custom Pages](/de/custom-pages) stehen damit zur Verfügung, ohne gerendertes HTML zu indexieren.

Seiten mit `hidden: true` sind ausgeschlossen. Der Endpunkt kann keine beliebigen Dateien oder Pfade lesen.

## Coding-Agent verbinden

Die angezeigte URL wird im Coding-Agent als entfernter Streamable-HTTP-MCP-Server eingetragen. Ein Name wie `product-docs` beschreibt den Dokumentationsbereich. Authentifizierungs-Header sind nicht erforderlich.

Nach der Verbindung kann der Agent `search_docs` und `read_doc` erkennen und bei Fragen mit Dokumentationsbezug aufrufen. Da sich die Konfigurationsformate der Clients unterscheiden, zeigt der Footer-Dialog den Endpunkt statt einer clientspezifischen Konfigurationsdatei.

## Mehrere Fibel-Instanzen

Unabhängig eingebundene Fibel-Websites bleiben getrennte MCP-Server:

```txt
product-docs  https://product.example/docs/_fibel/mcp
product-ui    https://product.example/ui/_fibel/mcp
```

Jeder Endpunkt verwendet ausschließlich den Kontext seiner Fibel-Instanz. Navigation, Locales, sichtbare Seiten, Custom-Page-Kontext und Suchergebnisse bleiben getrennt. Das passt zu Websites, bei denen `/docs` und `/ui` unabhängig durchsucht werden sollen, und vermeidet eine gemeinsame Registry oder einen Scope-Parameter.

## Grenzen des öffentlichen Endpunkts

Das Plugin implementiert keine Authentifizierung und sollte nur Dokumentation bereitstellen, die für öffentlichen Zugriff bestimmt ist. Feste Grenzen gelten für Request-Größe, Dokumentgröße, parallele Requests und die Request-Rate pro Prozess. Der standardmäßige Rate-Limiter liegt im Speicher und benötigt keine zusätzliche Infrastruktur.

Deployments mit mehreren Replikas können einen bereits vorhandenen gemeinsamen `@k2b/sync`-Rate-Limiter übergeben:

```ts
import type { RateLimiter } from "@k2b/sync";
import { mcpPlugin } from "@k2b/fibel/plugins";

declare const sharedMcpRateLimiter: RateLimiter;

mcpPlugin({
  rateLimiter: sharedMcpRateLimiter,
});
```

Der MCP-Endpunkt führt keine Modellaufrufe aus. Die Grenzen schützen daher Serverarbeit und Antwortbandbreite und nicht das Budget eines KI-Providers.
