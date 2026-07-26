#!/usr/bin/env bun
import { existsSync } from "fs";
import { cp, mkdir, writeFile } from "fs/promises";
import { join, relative, resolve } from "path";
import { defineFibel, loadConfig } from "./config";
import { startDevServer } from "./dev";
import { buildStyles } from "./styles";

type Command = "dev" | "serve" | "build" | "init" | "help";

const args = process.argv.slice(2);
const command = (args[0] ?? "help") as Command;

if (command === "init") await initProject();
else if (command === "dev") await dev();
else if (command === "serve") await dev();
else if (command === "build") await build();
else help();

async function dev() {
  const configPath = flag("--config") ?? "fibel.config.ts";
  const port = Number(flag("--port") ?? process.env.PORT ?? 5173);
  await startDevServer({
    configPath,
    port,
    reload: !hasFlag("--no-reload"),
    watch: !hasFlag("--no-watch"),
  });
}

async function build() {
  const configPath = flag("--config") ?? "fibel.config.ts";
  const resolvedConfigPath = resolve(configPath);
  const config = await loadConfig(configPath);
  const root = resolve(config.root ?? process.cwd());
  await buildStyles(root, true);
  const dist = join(root, "dist");
  const configImport = relativeImport(dist, resolvedConfigPath);
  await mkdir(dist, { recursive: true });
  await writeFile(
    join(dist, "server.ts"),
    `import config from ${JSON.stringify(configImport)};\nimport { createFibelApp } from "fibel";\nconst app = await createFibelApp(config);\nexport default { fetch: app.fetch, port: Number(process.env.PORT ?? 3000) };\n`,
  );
  await cp(join(root, ".fibel"), join(dist, ".fibel"), { recursive: true, force: true });
  console.log("Built Fibel runtime into dist/.");
}

async function initProject() {
  if (existsSync("fibel.config.ts")) throw new Error("fibel.config.ts already exists.");
  await mkdir("docs/en", { recursive: true });
  await mkdir("assets", { recursive: true });
  await writeFile(
    "fibel.config.ts",
    `import { defineFibel } from "fibel";\n\nexport default defineFibel({\n  title: "My Fibel",\n  description: "Documentation built with Fibel.",\n  siteUrl: "https://example.com",\n  locales: [{ code: "en", label: "English" }],\n  defaultLocale: "en",\n});\n`,
  );
  await writeFile(
    "docs/en/index.md",
    `---\ntitle: Welcome\nnavTitle: Welcome\nsection: Start\norder: 1\ndescription: Your first Fibel page.\n---\n\n# Welcome\n\nEdit this Markdown file to start your documentation.\n`,
  );
  console.log("Created fibel.config.ts, docs/en/index.md, and assets/.");
}

function flag(name: string) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function hasFlag(name: string) {
  return args.includes(name);
}

function relativeImport(fromDir: string, file: string) {
  const path = relative(fromDir, file).replaceAll("\\", "/");
  return path.startsWith(".") ? path : `./${path}`;
}

function help() {
  console.log(`Fibel\n\nCommands:\n  fibel init\n  fibel dev [--port 5173] [--config fibel.config.ts] [--no-watch] [--no-reload]\n  fibel build [--config fibel.config.ts]\n`);
}

export { defineFibel };
