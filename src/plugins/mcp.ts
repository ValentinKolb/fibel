import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { ratelimit, type RateLimiter } from "@k2b/sync/browser";
import { z } from "zod";
import type { FibelContext, FibelPage, FibelPlugin } from "../types";
import { joinUrl } from "../utils";
import {
  addAgentSetupUi,
  agentSetupScriptResponse,
  hasPlugin,
} from "./agent-setup";

const maxRequestBytes = 64 * 1024;
const maxDocumentChars = 80_000;
const maxSearchResults = 8;
const maxConcurrentRequests = 16;
const requestsPerMinute = 240;

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

      addAgentSetupUi(context, {
        mcp: {
          endpoint,
          name: serverName(context),
        },
        skills: hasPlugin(context, "agent-skills"),
        script,
      });
    },
    routes(context) {
      return [
        {
          path: "/mcp.js",
          scope: "internal",
          handler: agentSetupScriptResponse,
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
