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

Nutze den Development-Befehl, während du Inhalte und Konfiguration bearbeitest.

```sh
bunx fibel dev --port 5173
```

Der Befehl lädt `fibel.config.ts`, baut das Theme-CSS, erstellt die Dokumentations-App und startet einen lokalen Server.

## Für Deployment bauen

```sh
bunx fibel build
```

Der Build erzeugt einen Runtime-Einstieg und die generierten Dateien für die Dokumentation. Requests laufen weiterhin durch Fibel. Dadurch funktionieren Theme-Cookie, Suche, Markdown-Routen und gemountete Pfade konsistent.

## In Hono mounten

```ts
import { Hono } from "hono";
import config from "./fibel.config";
import { createFibelApp } from "fibel";

const docs = await createFibelApp(config);
const app = new Hono();

app.mount("/docs", docs.fetch);
```

Setze `routing.basePath` auf denselben Pfad:

```ts
export default defineFibel({
  title: "Meine Docs",
  routing: {
    basePath: "/docs",
  },
});
```

So erzeugt Fibel Links, interne Routen und Assets relativ zu `/docs`.

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
- Plugin-Routen.

Wenn ein Projekt unter einem Base Path läuft, sollten externe Links und Reverse-Proxies diesen Pfad unverändert weitergeben.
