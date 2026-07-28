import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { ratelimit, type RateLimiter } from "@k2b/sync/browser";
import { z } from "zod";
import type { FibelContext, FibelPage, FibelPlugin } from "../types";
import { escapeHtml, joinUrl } from "../utils";
import { mcpClientScript } from "./mcp-ui";

const maxRequestBytes = 64 * 1024;
const maxDocumentChars = 80_000;
const maxSearchResults = 8;
const maxConcurrentRequests = 16;
const requestsPerMinute = 240;
const mcpScriptVersion = Bun.hash(mcpClientScript).toString(36);

export type McpOptions = {
  rateLimiter?: RateLimiter;
};

export function mcpPlugin(options: McpOptions = {}): FibelPlugin {
  let activeRequests = 0;
  let rateLimiter = options.rateLimiter;

  return {
    name: "mcp",
    setup(context) {
      const endpoint = mcpEndpoint(context);
      const script = joinUrl(context.config.routing.basePath, context.config.routing.internalPath, "mcp.js");
      rateLimiter ??= ratelimit({
        id: `fibel-mcp:${context.config.routing.basePath || "root"}`,
        limit: requestsPerMinute,
        windowSecs: 60,
      });

      context.footerItems.push(
        '<button class="fibel-footer-link cursor-pointer appearance-none border-0 bg-transparent p-0 font-[inherit] text-[inherit] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:[outline-color:var(--fibel-focus-ring)]" type="button" data-fibel-mcp-open aria-haspopup="dialog">MCP</button>',
      );
      context.bodyItems.push(
        (page) =>
          `${renderMcpDialog(page, context, endpoint)}\n<script type="module" src="${escapeHtml(`${script}?v=${mcpScriptVersion}`)}"></script>`,
      );
    },
    routes(context) {
      return [
        {
          path: "/mcp.js",
          scope: "internal",
          handler: () => asset(mcpClientScript, "application/javascript; charset=utf-8"),
        },
        {
          path: "/mcp",
          scope: "internal",
          handler: async (request) => {
            if (request.method === "GET" || request.method === "DELETE") {
              return mcpError(405, -32000, "This server does not provide an event stream.", {
                Allow: "POST",
              });
            }
            if (request.method !== "POST") {
              return mcpError(405, -32000, "Use POST.", { Allow: "POST" });
            }

            const requestUrl = new URL(request.url);
            if (!isAllowedOrigin(request.headers.get("origin"), requestUrl, context.config.siteUrl)) {
              return mcpError(403, -32000, "Cross-origin requests are not allowed.");
            }

            let limited: Awaited<ReturnType<RateLimiter["check"]>>;
            try {
              limited = await rateLimiter!.check("public");
            } catch {
              return mcpError(503, -32000, "The MCP request limit could not be checked.");
            }
            if (limited.limited) {
              return mcpError(429, -32000, "The MCP request limit was reached.", {
                "Retry-After": String(Math.max(1, Math.ceil(limited.resetIn / 1_000))),
              });
            }
            if (activeRequests >= maxConcurrentRequests) {
              return mcpError(503, -32000, "The MCP server is busy.");
            }

            let parsed: Awaited<ReturnType<typeof readJsonBody>>;
            try {
              parsed = await readJsonBody(request);
            } catch {
              return mcpError(400, -32700, "The request body could not be read.");
            }
            if ("response" in parsed) return parsed.response;

            activeRequests += 1;
            try {
              return await handleMcpRequest(request, parsed.value, context);
            } catch {
              return mcpError(500, -32603, "The MCP request could not be completed.");
            } finally {
              activeRequests -= 1;
            }
          },
        },
      ];
    },
  };
}

async function handleMcpRequest(request: Request, parsedBody: unknown, context: FibelContext) {
  const transport = new WebStandardStreamableHTTPServerTransport({
    enableJsonResponse: true,
    sessionIdGenerator: undefined,
  });
  const server = createMcpServer(context);
  await server.connect(transport);
  try {
    const response = await transport.handleRequest(request, { parsedBody });
    return withPublicHeaders(response);
  } finally {
    await server.close();
  }
}

function createMcpServer(context: FibelContext) {
  const server = new McpServer(
    {
      name: `${serverName(context)}-documentation`,
      version: "1.0.0",
    },
    {
      instructions:
        `${context.config.title}: ${context.config.description} ` +
        `Search the current public documentation with search_docs, then read exact pages with read_doc. ` +
        (context.config.collections.length > 0
          ? "Use list_collections when the relevant collection is unclear. "
          : "") +
        "Base documentation claims on the returned Markdown. Hidden pages and the host file system are not available.",
    },
  );

  if (context.config.collections.length > 0) {
    server.registerTool(
      "list_collections",
      {
        title: `List ${context.config.title} documentation collections`,
        description:
          "List the public documentation collections that can be searched.",
        inputSchema: {},
        annotations: readOnlyAnnotations,
      },
      async () => ({
        content: [
          {
            type: "text" as const,
            text: [
              `${context.config.title}: ${context.config.description}`,
              "",
              ...context.config.collections.map(
                (collection) =>
                  `- ${collection.label} (${collection.id}): ${collection.description}`,
              ),
            ].join("\n"),
          },
        ],
      }),
    );
  }

  server.registerTool(
    "search_docs",
    {
      title: `Search ${context.config.title} documentation`,
      description:
        "Search visible documentation pages. Use the optional locale when the question targets a specific language; otherwise the site's default locale is used. Use the optional collection id to narrow results; omit it to search all collections.",
      inputSchema: {
        query: z.string().trim().min(1).max(200),
        locale: z.string().trim().min(1).max(32).optional(),
        collection: z.string().trim().min(1).max(64).optional(),
      },
      annotations: readOnlyAnnotations,
    },
    async ({ query, locale, collection }) => {
      const resolvedLocale = resolveLocale(locale, context);
      const resolvedCollection = resolveCollection(collection, context);
      const results = context.services
        .search(query, resolvedLocale, context, resolvedCollection)
        .slice(0, maxSearchResults);
      const text =
        results.length === 0
          ? `No visible ${context.config.title} documentation matched "${query}" in ${resolvedLocale}${resolvedCollection ? ` and collection ${resolvedCollection}` : ""}.`
          : [
              `Found ${results.length} visible documentation page${results.length === 1 ? "" : "s"} in ${resolvedLocale}:`,
              ...results.flatMap((entry) => [
                "",
                `- ${entry.title}`,
                `  ${entry.href}`,
                ...(entry.collectionLabel
                  ? [`  Collection: ${entry.collectionLabel} (${entry.collection})`]
                  : []),
                `  ${entry.description}`,
              ]),
            ].join("\n");
      return { content: [{ type: "text" as const, text }] };
    },
  );

  server.registerTool(
    "read_doc",
    {
      title: `Read a ${context.config.title} documentation page`,
      description:
        "Read one visible documentation page as Markdown. Pass an exact href returned by search_docs.",
      inputSchema: {
        href: z.string().trim().min(1).max(500),
      },
      annotations: readOnlyAnnotations,
    },
    async ({ href }) => {
      const page = context.pages.find((candidate) => !candidate.meta.hidden && candidate.href === href);
      if (!page) throw new Error("Visible documentation page not found.");
      const markdown = truncateDocument(page);
      return { content: [{ type: "text" as const, text: markdown }] };
    },
  );

  return server;
}

const readOnlyAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

function resolveLocale(input: string | undefined, context: FibelContext) {
  const locale = input || context.config.defaultLocale;
  if (!context.config.locales.some((candidate) => candidate.code === locale)) {
    throw new Error(`Unknown documentation locale "${locale}".`);
  }
  return locale;
}

function resolveCollection(
  input: string | undefined,
  context: FibelContext,
) {
  if (!input) return undefined;
  if (
    !context.config.collections.some(
      (collection) => collection.id === input,
    )
  ) {
    throw new Error(`Unknown documentation collection "${input}".`);
  }
  return input;
}

function truncateDocument(page: FibelPage) {
  if (page.body.length <= maxDocumentChars) return page.body;
  return `${page.body.slice(0, maxDocumentChars)}\n\n> Document truncated after ${maxDocumentChars} characters.`;
}

async function readJsonBody(request: Request): Promise<{ value: unknown } | { response: Response }> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxRequestBytes) {
    return { response: mcpError(413, -32000, `Request bodies are limited to ${maxRequestBytes} bytes.`) };
  }
  if (!request.body) return { response: mcpError(400, -32700, "A JSON request body is required.") };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > maxRequestBytes) {
      await reader.cancel();
      return { response: mcpError(413, -32000, `Request bodies are limited to ${maxRequestBytes} bytes.`) };
    }
    chunks.push(value);
  }

  const body = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return { value: JSON.parse(new TextDecoder().decode(body)) };
  } catch {
    return { response: mcpError(400, -32700, "The request body is not valid JSON.") };
  }
}

function renderMcpDialog(page: FibelPage, context: FibelContext, endpoint: string) {
  const name = serverName(context);
  const copy = mcpCopy(page.locale.code, context.config.title, name);
  const focus =
    "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:[outline-color:var(--fibel-focus-ring)]";
  const clients = [
    {
      id: "general",
      label: copy.general,
      valueLabel: copy.endpoint,
      command: "{endpoint}",
      hint: copy.generalHint,
    },
    {
      id: "codex",
      label: "Codex",
      valueLabel: copy.command,
      command: `codex mcp add ${name} --url {endpoint}`,
      hint: copy.codexHint,
    },
    {
      id: "claude",
      label: "Claude Code",
      valueLabel: copy.command,
      command: `claude mcp add --transport http ${name} {endpoint}`,
      hint: copy.claudeHint,
    },
    {
      id: "opencode",
      label: "OpenCode",
      valueLabel: copy.command,
      command: `opencode mcp add ${name} --url {endpoint}`,
      hint: copy.openCodeHint,
    },
  ];
  const tabs = clients
    .map(
      (client, index) =>
        `<button class="${focus} flex-1 cursor-pointer whitespace-nowrap rounded-[0.65rem] border-0 bg-transparent px-3 py-2 text-xs font-medium text-zinc-500 aria-selected:bg-white aria-selected:text-zinc-900 aria-selected:shadow-[0_1px_4px_rgb(24_24_27_/_0.08)] dark:text-zinc-400 dark:aria-selected:bg-white/10 dark:aria-selected:text-white dark:aria-selected:shadow-none" type="button" role="tab" id="fibel-mcp-tab-${client.id}" aria-controls="fibel-mcp-panel-${client.id}" aria-selected="${index === 0}" tabindex="${index === 0 ? "0" : "-1"}" data-fibel-mcp-tab="${client.id}">${escapeHtml(client.label)}</button>`,
    )
    .join("");
  const panels = clients
    .map((client, index) => {
      const fallbackValue = client.command.replace("{endpoint}", endpoint);
      const steps =
        client.id === "general"
          ? `<ol class="mt-4 grid list-none gap-4 p-0 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
      ${copy.steps.map((step, stepIndex) => `<li class="grid grid-cols-[1.75rem_minmax(0,1fr)] items-start gap-3"><span class="grid h-7 w-7 place-items-center rounded-full bg-[var(--fibel-accent-surface)] text-xs font-bold [color:var(--fibel-accent-foreground-strong)]">${stepIndex + 1}</span><span>${escapeHtml(step)}</span></li>`).join("")}
    </ol>`
          : "";
      return `<section role="tabpanel" id="fibel-mcp-panel-${client.id}" aria-labelledby="fibel-mcp-tab-${client.id}" data-fibel-mcp-panel="${client.id}"${index === 0 ? "" : " hidden"}>
    <span class="mb-2 block text-xs font-semibold uppercase tracking-[0.06em] text-zinc-500 dark:text-zinc-400">${escapeHtml(client.valueLabel)}</span>
    <div class="flex items-center gap-3 rounded-[0.9rem] bg-zinc-100 py-3 pl-4 pr-3 dark:bg-white/[0.07]">
      <code class="min-w-0 flex-1 overflow-x-auto whitespace-pre font-mono text-[0.78rem] leading-5 text-zinc-800 dark:text-zinc-200" data-fibel-mcp-value data-command="${escapeHtml(client.command)}">${escapeHtml(fallbackValue)}</code>
      <button class="${focus} inline-grid h-9 w-9 flex-none cursor-pointer place-items-center rounded-full border-0 bg-white text-zinc-600 shadow-[0_1px_4px_rgb(24_24_27_/_0.08)] hover:[color:var(--fibel-accent-strong)] dark:bg-white/10 dark:text-zinc-300 dark:shadow-none" type="button" data-fibel-mcp-copy data-copied-label="${escapeHtml(copy.copied)}" data-error-label="${escapeHtml(copy.copyError)}" aria-label="${escapeHtml(copy.copy)}">${copyIcon()}</button>
    </div>
    <p class="mb-0 mt-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">${escapeHtml(client.hint)}</p>
    ${steps}
  </section>`;
    })
    .join("");
  return `<dialog class="m-auto max-h-[min(42rem,calc(100dvh-2rem))] w-[min(36rem,calc(100vw-2rem))] overflow-auto rounded-[1.25rem] border border-zinc-200 bg-white p-0 text-zinc-900 shadow-[0_24px_80px_rgb(24_24_27_/_0.22)] backdrop:bg-zinc-950/40 backdrop:backdrop-blur-[3px] dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-50 dark:shadow-[0_24px_80px_rgb(0_0_0_/_0.55)]" data-fibel-mcp-dialog data-endpoint="${escapeHtml(endpoint)}" aria-labelledby="fibel-mcp-title">
  <div class="relative p-5 sm:p-7">
    <button class="${focus} absolute right-4 top-4 inline-grid h-9 w-9 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white" type="button" data-fibel-mcp-close aria-label="${escapeHtml(copy.close)}">${closeIcon()}</button>
    <h2 class="m-0 max-w-[calc(100%_-_3rem)] text-xl font-semibold tracking-[-0.015em]" id="fibel-mcp-title">${escapeHtml(copy.title)}</h2>
    <p class="mb-5 mt-2 max-w-[30rem] text-[0.925rem] leading-6 text-zinc-600 dark:text-zinc-400">${escapeHtml(copy.intro)}</p>
    <div class="-mx-1 mb-5 overflow-x-auto px-1 pb-1">
      <div class="flex w-full min-w-max gap-1 rounded-[0.8rem] bg-zinc-100 p-1 dark:bg-white/[0.06]" role="tablist" aria-label="${escapeHtml(copy.clientSelector)}">
        ${tabs}
      </div>
    </div>
    ${panels}
    <p class="mb-0 mt-2 min-h-5 text-xs [color:var(--fibel-accent-foreground-strong)]" data-fibel-mcp-status aria-live="polite"></p>
    <p class="mb-0 mt-6 border-t border-zinc-200 pt-4 text-[0.8rem] leading-5 text-zinc-500 dark:border-white/10 dark:text-zinc-400">${escapeHtml(copy.note)}</p>
  </div>
</dialog>`;
}

function mcpCopy(locale: string, title: string, name: string) {
  if (locale === "de") {
    return {
      title: "Coding-Agent verbinden",
      intro: `Diese öffentliche MCP-Schnittstelle stellt die sichtbare ${title}-Dokumentation ohne Zugangsdaten bereit.`,
      clientSelector: "Coding-Agent auswählen",
      general: "Allgemein",
      endpoint: "Streamable-HTTP-Endpunkt",
      command: "CLI-Befehl",
      close: "MCP-Einrichtung schließen",
      copy: "Einrichtung kopieren",
      copied: "Kopiert.",
      copyError: "Kopieren fehlgeschlagen.",
      generalHint: "Dieser Endpunkt funktioniert mit jedem Client, der Streamable HTTP unterstützt.",
      codexHint: "Der Befehl fügt die Dokumentation zur Codex-Konfiguration hinzu.",
      claudeHint: "Der Befehl fügt die Dokumentation für das aktuelle Claude-Code-Projekt hinzu.",
      openCodeHint: "Der Befehl fügt die entfernte Dokumentation zu OpenCode hinzu.",
      steps: [
        "Im Coding-Agent einen entfernten MCP-Server hinzufügen und keine Authentifizierung konfigurieren.",
        `Den Server „${name}“ nennen und den Endpunkt oben einfügen.`,
        "Den Agenten auffordern, die Dokumentation zu durchsuchen und die passende Markdown-Seite zu lesen.",
      ],
      note: "Mehrere Fibel-Instanzen werden als getrennte MCP-Server mit eindeutigen Namen hinzugefügt, zum Beispiel product-docs und product-ui.",
    };
  }
  return {
    title: "Connect a coding agent",
    intro: `This public MCP endpoint exposes the visible ${title} documentation without credentials.`,
    clientSelector: "Choose a coding agent",
    general: "General",
    endpoint: "Streamable HTTP endpoint",
    command: "CLI command",
    close: "Close MCP setup",
    copy: "Copy setup",
    copied: "Copied.",
    copyError: "Copy failed.",
    generalHint: "This endpoint works with any client that supports Streamable HTTP.",
    codexHint: "This command adds the documentation to the Codex configuration.",
    claudeHint: "This command adds the documentation for the current Claude Code project.",
    openCodeHint: "This command adds the remote documentation to OpenCode.",
    steps: [
      "Add a remote MCP server in the coding agent without configuring authentication.",
      `Name the server “${name}” and paste the endpoint above.`,
      "Ask the agent to search the documentation and read the matching Markdown page.",
    ],
    note: "Add several Fibel instances as separate MCP servers with distinct names, such as product-docs and product-ui.",
  };
}

function serverName(context: FibelContext) {
  const title = context.config.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const mount = context.config.routing.basePath.split("/").filter(Boolean).at(-1);
  return [title || "fibel", mount].filter((part, index, items) => part && items.indexOf(part) === index).join("-");
}

function mcpEndpoint(context: FibelContext) {
  return joinUrl(context.config.routing.basePath, context.config.routing.internalPath, "mcp");
}

function isAllowedOrigin(origin: string | null, requestUrl: URL, siteUrl?: string) {
  if (!origin || origin === requestUrl.origin) return true;
  if (!siteUrl) return false;
  try {
    return origin === new URL(siteUrl).origin;
  } catch {
    return false;
  }
}

function withPublicHeaders(response: Response) {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function mcpError(status: number, code: number, message: string, extraHeaders?: HeadersInit) {
  return new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      error: { code, message },
      id: null,
    }),
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        ...extraHeaders,
      },
    },
  );
}

function asset(body: string, contentType: string) {
  return new Response(body, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function closeIcon() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="m6 6 12 12M18 6 6 18"/></svg>';
}

function copyIcon() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>';
}
