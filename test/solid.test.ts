import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readdir, rm, writeFile } from "fs/promises";
import { join, resolve } from "path";
import { pathToFileURL } from "url";
import { createConfig } from "@k2b/ssr";
import { fibelSsrTemplate, type FibelSsrTemplateOptions } from "../src/solid";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })),
  );
});

describe("Solid page adapter", () => {
  test("keeps the host SSR build while rendering Fibel chrome and island assets", async () => {
    const fibelRoot = resolve(import.meta.dir, "..");
    const root = await mkdtemp(join(fibelRoot, ".test-fibel-solid-"));
    temporaryDirectories.push(root);
    const outdir = join(root, "dist");
    const indexImport = join(fibelRoot, "src", "index.ts");
    const solidImport = join(fibelRoot, "src", "solid.ts");

    await writeFile(
      join(root, "Counter.island.tsx"),
      `export default function Counter(props: { initial: number }) {
  return <button type="button" data-counter>{props.initial}</button>;
}
`,
    );
    await writeFile(
      join(root, "entry.tsx"),
      `import { createConfig } from "@k2b/ssr";
import { createFibelApp } from ${JSON.stringify(indexImport)};
import { fibelSsrTemplate, solidPage, type FibelSsrTemplateOptions } from ${JSON.stringify(solidImport)};
import Counter from "./Counter.island";

const { html } = createConfig<FibelSsrTemplateOptions>({
  rootDir: ${JSON.stringify(root)},
  template: fibelSsrTemplate,
});

export const app = await createFibelApp({
  title: "Cloud UI",
  description: "Cloud component documentation.",
  siteUrl: "https://example.com",
  root: ${JSON.stringify(root)},
  locales: [{ code: "en", label: "English" }],
  pages: [
    solidPage({
      html,
      path: "/counter",
      title: "Counter",
      description: "An interactive counter.",
      content: "# Counter\\n\\nThe counter-probe documents an interactive component.",
      component: ({ content }) => (
        <section data-showcase>
          <div innerHTML={content.html} />
          <Counter initial={2} />
        </section>
      ),
    }),
  ],
});
`,
    );

    const { plugin } = createConfig<FibelSsrTemplateOptions>({
      rootDir: root,
      template: fibelSsrTemplate,
    });
    const build = await Bun.build({
      entrypoints: [join(root, "entry.tsx")],
      outdir,
      target: "bun",
      plugins: [plugin()],
    });
    expect(build.success).toBe(true);

    const module = await import(`${pathToFileURL(join(outdir, "entry.js")).href}?t=${Date.now()}`);
    const response = await module.app.fetch(new Request("http://localhost/en/counter"));
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain("<header");
    expect(html).toContain("data-showcase");
    expect(html).toContain("counter-probe");
    expect(html).toContain("<solid-island");
    expect(html).toContain('data-props="({initial:2})"');
    expect(html).toContain("document.querySelectorAll('solid-island,solid-client')");

    const assets = await readdir(join(outdir, "_ssr"));
    expect(assets.some((file) => file.endsWith(".js"))).toBe(true);
  });
});
