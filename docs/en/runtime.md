---
title: Hosting Fibel
navTitle: Hosting
section: Architecture
order: 10
description: Run Fibel as a documentation server or mount the documentation under a route in an existing app.
tags: [hosting, fetch, routing]
updated: 2026-06-09
---

# Hosting Fibel

Fibel exposes a `fetch` handler. The documentation can run as its own server or be mounted under a route in an existing web app.

## Develop locally

Use the development command while editing content and configuration.

```sh
bunx fibel dev --port 5173
```

The command loads `fibel.config.ts`, builds the theme CSS, creates the documentation app, and starts a local server.

## Build for deployment

```sh
bunx fibel build
```

The build creates a runtime entry and generated documentation files. Requests still pass through Fibel. This keeps the theme cookie, search, Markdown routes, and mounted paths consistent.

## Mount in Hono

```ts
import { Hono } from "hono";
import config from "./fibel.config";
import { createFibelApp } from "fibel";

const docs = await createFibelApp(config);
const app = new Hono();

app.mount("/docs", docs.fetch);
```

Set `routing.basePath` to the same path:

```ts
export default defineFibel({
  title: "My Docs",
  routing: {
    basePath: "/docs",
  },
});
```

Fibel then generates links, internal routes, and assets relative to `/docs`.

## Mount in other servers

Any environment that can pass a Web-standard `Request` to a `fetch` handler can serve Fibel.

```ts
const docs = await createFibelApp(config);

export default {
  fetch(request: Request) {
    return docs.fetch(request);
  },
};
```

The host remains responsible for outer routing, authentication, or middleware. Fibel handles only requests forwarded to the documentation app.

## Routes

A Fibel app handles:

- Page routes such as `/en/configuration`.
- Markdown source routes such as `/en/configuration.md`.
- Internal files under `routing.internalPath`.
- Assets under `routing.assetsPath`.
- Plugin routes.

When a project runs under a base path, external links and reverse proxies should preserve that path.
