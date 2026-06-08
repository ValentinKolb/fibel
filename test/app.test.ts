import { describe, expect, test } from "bun:test";
import { createFibelApp } from "../src";
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
});
