import { describe, expect, test } from "bun:test";
import { createFibelApp, defaultPlugins } from "../src";
import config from "../fibel.config";

describe("fibel app", () => {
  test("renders a localized page", async () => {
    const app = await createFibelApp(config);
    const response = await app.fetch(new Request("http://localhost/en"));
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("Fibel publishes Markdown documentation");
  });

  test("searches server-side", async () => {
    const app = await createFibelApp(config);
    const response = await app.fetch(new Request("http://localhost/_fibel/search?locale=en&q=theme"));
    const data = await response.json();
    expect(data.results.length).toBeGreaterThan(0);
  });

  test("serves raw markdown page routes", async () => {
    const app = await createFibelApp(config);
    const response = await app.fetch(new Request("http://localhost/en/plugins.md"));
    const longResponse = await app.fetch(new Request("http://localhost/en/plugins.markdown"));
    expect(response.status).toBe(200);
    expect(longResponse.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/markdown");
    expect(await response.text()).toContain("# Plugin API");
    expect(await longResponse.text()).toContain("# Plugin API");
  });

  test("renders powered-by attribution as a removable default plugin", async () => {
    const app = await createFibelApp(config);
    const response = await app.fetch(new Request("http://localhost/en"));
    expect(await response.text()).toContain("Powered by <a href=\"https://fibel.dev\"");

    const plugins = defaultPlugins().filter((plugin) => plugin.name !== "powered-by");
    const withoutPoweredBy = await createFibelApp({ ...config, plugins });
    const withoutResponse = await withoutPoweredBy.fetch(new Request("http://localhost/en"));
    expect(await withoutResponse.text()).not.toContain("Powered by <a href=\"https://fibel.dev\"");
  });
});
