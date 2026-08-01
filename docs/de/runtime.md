---
title: Fibel hosten
navTitle: Hosting
section: Architektur
order: 10
description: Betreibe Fibel als eigenen Dokumentationsserver oder mounte die Dokumentation unter einer Route in einer bestehenden App.
tags: [hosting, fetch, routing]
updated: 2026-06-09
---

# Fibel hosten

Fibel stellt einen `fetch`-Handler bereit. Dadurch kann die Dokumentation direkt als Server laufen oder unter einer Route in eine bestehende Web-App eingebunden werden.

## Lokal entwickeln

Der Development-Befehl dient der Arbeit an Inhalten und Konfiguration.

```sh
bunx --bun @k2b/fibel dev --port 5173
```

Der Befehl lädt `fibel.config.ts`, baut das Theme-CSS, erstellt die Dokumentations-App und startet einen lokalen Server.

Der Entwicklungsserver beobachtet die Config-Datei, den Docs-Ordner und den Assets-Ordner. Wenn sich eine Datei ändert, baut Fibel die App im Speicher neu und lädt verbundene Browser-Tabs nach erfolgreichem Rebuild neu.

```sh
bunx --bun @k2b/fibel dev --no-watch
bunx --bun @k2b/fibel dev --no-reload
```

Wenn ein Rebuild fehlschlägt, liefert der Server weiter die letzte funktionierende App aus und schreibt den Fehler ins Terminal.

Der Watcher erfasst nur Content, Assets und die Config-Datei. Änderungen an einem Projekt-Plugin oder einer anderen TypeScript-Datei lösen keinen Rebuild aus. Nach Änderungen am Plugin-Code ist ein Neustart des Servers erforderlich.

## Für Deployment bauen

```sh
bunx --bun @k2b/fibel build
```

Der Build erzeugt einen Runtime-Einstieg und die generierten Dateien für die Dokumentation. Requests laufen weiterhin durch Fibel. Dadurch funktionieren Theme-Cookie, Suche, Markdown-Routen und gemountete Pfade konsistent.

Wenn der Host sein Server-Bundle und Ausgabeverzeichnis selbst verwaltet, kann
er nur das Fibel-Stylesheet erzeugen:

```ts
import { buildFibelStyles } from "@k2b/fibel/build";

await buildFibelStyles(process.cwd(), true);
```

Das Stylesheet landet in `.fibel/public/styles.css`. Das zweite Argument
aktiviert Minifizierung. Für weitere Assets und den Austausch des
Build-Verzeichnisses bleibt der Host verantwortlich.

## Hinter Traefik deployen

Der empfohlene Weg ist das Container-Image hinter Traefik.

```yaml
services:
  docs:
    image: ghcr.io/k2b-dev/fibel:latest
    labels:
      - traefik.enable=true
      - traefik.http.routers.docs.rule=Host(`docs.example.com`)
      - traefik.http.routers.docs.tls.certresolver=letsencrypt
      - traefik.http.services.docs.loadbalancer.server.port=3000
```

Der Server lauscht auf `PORT`, standardmäßig `3000`. `siteUrl` in `fibel.config.ts` verweist auf denselben Host, damit Canonical-URLs und Sitemap zum Deployment passen.

Für eigene Dokumentation entsteht das Image aus dem jeweiligen Projekt statt aus dem Fibel-Image; die Labels bleiben identisch.

## Default-Docs-Image ausführen

Das Fibel-Repository enthält ein Docker-Image, mit dem die offizielle Default-Dokumentation gehostet werden kann.

```sh
docker build -t fibel-docs .
docker run --rm -p 3000:3000 fibel-docs
```

Das Image nutzt einen Bun-Multi-Stage-Build. Development-Dependencies werden nur in der Build-Stage installiert. Dort laufen Typecheck, Tests und Build. Die Runtime-Stage startet den generierten Server mit Produktionsabhängigkeiten als nicht privilegierter `bun`-User.

Tagged Releases veröffentlichen das Image in der GitHub Container Registry:

```sh
docker run --rm -p 3000:3000 ghcr.io/k2b-dev/fibel:latest
docker run --rm -p 3000:3000 ghcr.io/k2b-dev/fibel:v0.6.6
```

## In Hono mounten

```ts
import { Hono } from "hono";
import config from "./fibel.config";
import { createFibelApp } from "@k2b/fibel";

const docs = await createFibelApp(config);
const app = new Hono();

app.mount("/docs", docs.fetch);
```

`routing.basePath` verweist auf denselben Pfad:

```ts
export default defineFibel({
  title: "Meine Docs",
  routing: {
    basePath: "/docs",
  },
});
```

So erzeugt Fibel Links, interne Routen und Assets relativ zu `/docs`.

Aktiviert diese Instanz `agentSkillsPlugin()`, wird zusätzlich ihre
origin-weite Well-known-Route weitergeleitet:

```ts
app.all("/.well-known/agent-skills/*", (c) =>
  docs.fetch(c.req.raw),
);
```

Der Host muss dies explizit tun, weil ein `/docs`-Subrouter keine Requests an
den Origin-Root erhält. Siehe [Agent-Skills-Discovery](/de/docs/agent-skills).

## Mehrere Instanzen mounten

Mehrere Fibel-Instanzen können in einem Server und einem Deployment laufen. Getrennte Base Paths halten Navigation, Suchindizes, Assistenten-Kontext, Chat-Sessions, MCP-Endpunkte und pfadbezogene Discovery-Routen unabhängig:

```ts
const docs = await createFibelApp(docsConfig); // basePath: "/docs"
const ui = await createFibelApp(uiConfig);     // basePath: "/ui"

export default new Hono()
  .mount("/docs", docs.fetch)
  .mount("/ui", ui.fetch);
```

Die Instanzen können dieselbe Header-Konfiguration, denselben Theme-Cookie, Assistant-Provider und prozessweiten Rate-Limiter verwenden. Nur eine Instanz kann die origin-weite Agent-Skills-Discovery besitzen; `/.well-known/agent-skills/*` wird explizit an diese Instanz geroutet. Der [Guide für eigene Seiten](/de/docs/custom-pages) zeigt die vollständige Header- und Solid-SSR-Konfiguration.

## In andere Server einbinden

Jede Umgebung, die einen Web-Standard-`Request` an einen `fetch`-Handler weitergeben kann, kann Fibel bedienen.

```ts
const docs = await createFibelApp(config);

export default {
  fetch(request: Request) {
    return docs.fetch(request);
  },
};
```

Der Host bleibt für übergeordnetes Routing, Authentifizierung oder eigene Middleware verantwortlich. Fibel verarbeitet nur Requests, die an die Dokumentation weitergereicht werden.

## Routen

Eine Fibel-App verarbeitet:

- Seitenrouten wie `/de/configuration`.
- Markdown-Quellen wie `/de/configuration.md`.
- interne Dateien unter `routing.internalPath`.
- Assets unter `routing.assetsPath`.
- Plugin-Routen, einschließlich der SEO- und `llms.txt`-Dateien.
- Origin-weite Plugin-Routen, wenn der äußere Server sie weiterleitet.
- Eine Weiterleitung vom Mount-Root auf das Standard-Locale, `/` landet also auf `/de`.

Wenn ein Projekt unter einem Base Path läuft, sollten externe Links und Reverse-Proxies diesen Pfad unverändert weitergeben.
