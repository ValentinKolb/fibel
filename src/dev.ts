import { existsSync, readdirSync, statSync } from "fs";
import { resolve } from "path";
import { createFibelApp } from "./app";
import { loadConfig } from "./config";
import { buildStyles } from "./styles";
import type { FibelApp, FibelConfig } from "./types";
import { joinUrl, withoutBasePath } from "./utils";

type DevServerOptions = {
  configPath: string;
  port: number;
  reload: boolean;
  watch: boolean;
};

type ReloadClient = ReadableStreamDefaultController<Uint8Array>;

const encoder = new TextEncoder();

export async function startDevServer(options: DevServerOptions) {
  let currentApp = await rebuild(options.configPath);
  let currentSignature = snapshot(currentApp.context.config, options.configPath);
  const clients = new Set<ReloadClient>();

  Bun.serve({
    port: options.port,
    idleTimeout: 255,
    fetch: (request) => handleDevRequest(request, currentApp, clients, options.reload),
  });

  console.log(`Fibel running at http://localhost:${options.port}`);

  if (options.watch) {
    console.log(`Watching ${watchLabel(currentApp.context.config, options.configPath)}`);
    startPolling(() => currentApp, options.configPath, async () => {
      try {
        const nextApp = await rebuild(options.configPath);
        currentApp = nextApp;
        currentSignature = snapshot(nextApp.context.config, options.configPath);
        notifyReload(clients);
        console.log("Rebuilt documentation.");
      } catch (error) {
        currentSignature = snapshot(currentApp.context.config, options.configPath);
        console.error("Fibel rebuild failed. Keeping the last working app.");
        console.error(error);
      }
    }, () => currentSignature);
  }
}

async function rebuild(configPath: string) {
  const config = await loadConfig(configPath);
  const root = resolve(config.root ?? process.cwd());
  await buildStyles(root, false);
  return createFibelApp(config);
}

async function handleDevRequest(request: Request, app: FibelApp, clients: Set<ReloadClient>, reload: boolean) {
  if (reload && isLiveReloadRequest(request, app.context.config)) return liveReloadResponse(clients);

  const response = await app.fetch(request);
  if (!reload || !isHtmlResponse(response)) return response;

  const html = await response.text();
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  return new Response(injectReloadScript(html, app.context.config), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function isLiveReloadRequest(request: Request, config: FibelConfig) {
  const url = new URL(request.url);
  const resolved = "routing" in config ? config.routing : undefined;
  const basePath = resolved?.basePath ?? "";
  const internalPath = resolved?.internalPath ?? "/_fibel";
  const localPath = withoutBasePath(url.pathname, basePath);
  return localPath === joinUrl(internalPath, "live");
}

function isHtmlResponse(response: Response) {
  return response.headers.get("content-type")?.toLowerCase().includes("text/html") ?? false;
}

function liveReloadResponse(clients: Set<ReloadClient>) {
  let client: ReloadClient | undefined;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      client = controller;
      clients.add(controller);
      controller.enqueue(encoder.encode("event: ready\ndata: connected\n\n"));
    },
    cancel() {
      if (client) clients.delete(client);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

function notifyReload(clients: Set<ReloadClient>) {
  const message = encoder.encode(`event: reload\ndata: ${Date.now()}\n\n`);
  for (const client of clients) {
    try {
      client.enqueue(message);
    } catch {
      clients.delete(client);
    }
  }
}

function injectReloadScript(html: string, config: FibelConfig) {
  const resolved = "routing" in config ? config.routing : undefined;
  const liveUrl = joinUrl(resolved?.basePath, resolved?.internalPath ?? "/_fibel", "live");
  const script = `<script type="module">new EventSource(${JSON.stringify(liveUrl)}).addEventListener("reload",()=>location.reload());</script>`;
  return html.includes("</body>") ? html.replace("</body>", `${script}</body>`) : `${html}${script}`;
}

function startPolling(getApp: () => FibelApp, configPath: string, onChange: () => Promise<void>, getSignature: () => string) {
  let running = false;
  let queued = false;

  setInterval(() => {
    const nextSignature = snapshot(getApp().context.config, configPath);
    if (nextSignature === getSignature()) return;
    if (running) {
      queued = true;
      return;
    }

    running = true;
    onChange()
      .catch((error) => console.error(error))
      .finally(() => {
        running = false;
        if (queued) {
          queued = false;
          running = true;
          onChange()
            .catch((error) => console.error(error))
            .finally(() => {
              running = false;
            });
        }
      });
  }, 300);
}

function snapshot(config: FibelConfig, configPath: string) {
  const root = resolve(config.root ?? process.cwd());
  const content = config.content ?? "docs";
  const assets = config.assets ?? "assets";
  return [configPath, resolve(root, content), resolve(root, assets)].flatMap((path) => snapshotPath(resolve(path))).sort().join("\n");
}

function snapshotPath(path: string): string[] {
  if (!existsSync(path)) return [`missing:${path}`];
  const stat = statSync(path);
  const entry = `${stat.isDirectory() ? "dir" : "file"}:${path}:${stat.mtimeMs}:${stat.size}`;
  if (!stat.isDirectory()) return [entry];
  return [
    entry,
    ...readdirSync(path)
      .filter((name) => !name.startsWith("."))
      .flatMap((name) => snapshotPath(resolve(path, name))),
  ];
}

function watchLabel(config: FibelConfig, configPath: string) {
  const root = resolve(config.root ?? process.cwd());
  return [configPath, config.content ?? "docs", config.assets ?? "assets"].map((path) => (path.startsWith("/") ? path : resolve(root, path))).join(", ");
}
