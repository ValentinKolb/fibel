import { dirname, join, relative, sep } from "path";
import { mkdirSync } from "fs";

export const trimSlashes = (value: string) => value.replace(/^\/+|\/+$/g, "");

export const normalizeBasePath = (value = "/") => {
  const trimmed = trimSlashes(value);
  return trimmed ? `/${trimmed}` : "";
};

export const normalizeRoutePath = (value = "/") => {
  const trimmed = trimSlashes(value);
  return `/${trimmed}`;
};

export const joinUrl = (...parts: Array<string | undefined>) => {
  const filtered = parts.filter((part): part is string => Boolean(part));
  const joined = filtered.map((part, index) => (index === 0 ? part.replace(/\/+$/g, "") : trimSlashes(part))).join("/");
  if (!joined) return "/";
  return joined.startsWith("/") ? joined : `/${joined}`;
};

export const withoutBasePath = (pathname: string, basePath: string) => {
  if (!basePath) return pathname || "/";
  if (pathname === basePath) return "/";
  if (!pathname.startsWith(`${basePath}/`)) return undefined;
  return pathname.slice(basePath.length) || "/";
};

export const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const ensureDir = (path: string) => mkdirSync(path, { recursive: true });

export const toPosix = (path: string) => path.split(sep).join("/");

export const routeFromFile = (file: string, localeRoot: string) => {
  const rel = toPosix(relative(localeRoot, file)).replace(/\.md$/i, "");
  if (rel === "index") return "/";
  if (rel.endsWith("/index")) return `/${rel.slice(0, -"index".length).replace(/\/$/g, "")}`;
  return `/${rel}`;
};

export const resolveInside = (root: string, path: string) => join(root, path);

export const parentDir = (path: string) => dirname(path);

export const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });

export const text = (value: string, contentType = "text/plain; charset=utf-8", status = 200) =>
  new Response(value, {
    status,
    headers: { "Content-Type": contentType },
  });
