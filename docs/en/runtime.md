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
bunx --bun @valentinkolb/fibel dev --port 5173
```

The command loads `fibel.config.ts`, builds the theme CSS, creates the documentation app, and starts a local server.

## Build for deployment

```sh
bunx --bun @valentinkolb/fibel build
```

The build creates a runtime entry and generated documentation files. Requests still pass through Fibel. This keeps the theme cookie, search, Markdown routes, and mounted paths consistent.

## Run the default docs image

The Fibel repository includes a Docker image for hosting the default documentation.

```sh
docker build -t fibel-docs .
docker run --rm -p 3000:3000 fibel-docs
```

The image uses a Bun multi-stage build. It installs development dependencies only in the build stage, runs typecheck, tests, and build, then runs the generated server as the non-root `bun` user with production dependencies.

Tagged releases publish the image to GitHub Container Registry:

```sh
docker run --rm -p 3000:3000 ghcr.io/valentinkolb/fibel:latest
docker run --rm -p 3000:3000 ghcr.io/valentinkolb/fibel:v0.0.6
```

## Mount in Hono

```ts
import { Hono } from "hono";
import config from "./fibel.config";
import { createFibelApp } from "@valentinkolb/fibel";

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
