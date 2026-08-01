import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  createFibelApp,
  type FibelConfig,
  type FibelPlugin,
} from "../src";
import { agentSkillsPlugin } from "../src/plugins";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("origin-scoped routes", () => {
  test("remain at the origin root when Fibel uses a base path", async () => {
    const root = temporaryRoot();
    const originPlugin: FibelPlugin = {
      name: "origin-probe",
      routes: () => [
        {
          path: "/.well-known/probe",
          scope: "origin",
          handler: () => new Response("origin"),
        },
        {
          path: "/public-probe",
          scope: "public",
          handler: () => new Response("public"),
        },
      ],
    };
    const app = await createFibelApp(
      testConfig(root, [originPlugin]),
    );

    expect(
      await (
        await app.fetch(
          new Request("https://example.com/.well-known/probe"),
        )
      ).text(),
    ).toBe("origin");
    expect(
      (
        await app.fetch(
          new Request("https://example.com/docs/.well-known/probe"),
        )
      ).status,
    ).toBe(404);
    expect(
      await (
        await app.fetch(
          new Request("https://example.com/docs/public-probe"),
        )
      ).text(),
    ).toBe("public");
    expect(
      (
        await app.fetch(
          new Request("https://example.com/public-probe"),
        )
      ).status,
    ).toBe(404);
  });
});

describe("agent skills plugin", () => {
  test("publishes a deterministic v0.2 discovery index and skill", async () => {
    const root = temporaryRoot();
    const content = writeSkill(
      root,
      "fibel",
      "Build and maintain Fibel documentation sites.",
    );
    const app = await createFibelApp(
      testConfig(root, [
        agentSkillsPlugin({ directory: "skills" }),
      ]),
    );

    const response = await app.fetch(
      new Request(
        "https://example.com/.well-known/agent-skills/index.json",
      ),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain(
      "application/json",
    );
    expect(await response.json()).toEqual({
      $schema:
        "https://schemas.agentskills.io/discovery/0.2.0/schema.json",
      skills: [
        {
          name: "fibel",
          type: "skill-md",
          description:
            "Build and maintain Fibel documentation sites.",
          url: "/.well-known/agent-skills/fibel/SKILL.md",
          digest: `sha256:${createHash("sha256").update(content).digest("hex")}`,
        },
      ],
    });

    const skill = await app.fetch(
      new Request(
        "https://example.com/.well-known/agent-skills/fibel/SKILL.md",
      ),
    );
    expect(skill.status).toBe(200);
    expect(skill.headers.get("content-type")).toContain(
      "text/markdown",
    );
    expect(await skill.text()).toBe(content);
  });

  test("publishes folded frontmatter descriptions", async () => {
    const root = temporaryRoot();
    const directory = join(root, "skills", "cloud-dev");
    mkdirSync(directory, { recursive: true });
    writeFileSync(
      join(directory, "SKILL.md"),
      `---
name: cloud-dev
description: >
  Build and maintain applications on Cloud.
  Use this skill for application development.
---

# cloud-dev
`,
    );
    const app = await createFibelApp(
      testConfig(root, [
        agentSkillsPlugin({ directory: "skills" }),
      ]),
    );

    const response = await app.fetch(
      new Request(
        "https://example.com/.well-known/agent-skills/index.json",
      ),
    );
    const discovery = await response.json();

    expect(response.status).toBe(200);
    expect(discovery.skills[0].description).toBe(
      "Build and maintain applications on Cloud. Use this skill for application development.",
    );
  });

  test("serves discovery at the origin root rather than below basePath", async () => {
    const root = temporaryRoot();
    writeSkill(
      root,
      "fibel",
      "Build and maintain Fibel documentation sites.",
    );
    const app = await createFibelApp(
      testConfig(root, [
        agentSkillsPlugin({ directory: "skills" }),
      ]),
    );

    expect(
      (
        await app.fetch(
          new Request(
            "https://example.com/.well-known/agent-skills/index.json",
          ),
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await app.fetch(
          new Request(
            "https://example.com/docs/.well-known/agent-skills/index.json",
          ),
        )
      ).status,
    ).toBe(404);
  });

  test("supports HEAD and rejects mutations", async () => {
    const root = temporaryRoot();
    writeSkill(
      root,
      "fibel",
      "Build and maintain Fibel documentation sites.",
    );
    const app = await createFibelApp(
      testConfig(root, [
        agentSkillsPlugin({ directory: "skills" }),
      ]),
    );
    const endpoint =
      "https://example.com/.well-known/agent-skills/index.json";

    const head = await app.fetch(
      new Request(endpoint, { method: "HEAD" }),
    );
    expect(head.status).toBe(200);
    expect(await head.text()).toBe("");

    const post = await app.fetch(
      new Request(endpoint, { method: "POST" }),
    );
    expect(post.status).toBe(405);
    expect(post.headers.get("allow")).toBe("GET, HEAD");
  });

  test("validates the skill directory and frontmatter", async () => {
    const missingRoot = temporaryRoot();
    await expect(
      createFibelApp(
        testConfig(missingRoot, [
          agentSkillsPlugin({ directory: "skills" }),
        ]),
      ),
    ).rejects.toThrow("Agent skills directory does not exist");

    const mismatchedRoot = temporaryRoot();
    const skillDirectory = join(
      mismatchedRoot,
      "skills",
      "fibel",
    );
    mkdirSync(skillDirectory, { recursive: true });
    writeFileSync(
      join(skillDirectory, "SKILL.md"),
      "---\nname: other\ndescription: Wrong name.\n---\n",
    );
    await expect(
      createFibelApp(
        testConfig(mismatchedRoot, [
          agentSkillsPlugin({ directory: "skills" }),
        ]),
      ),
    ).rejects.toThrow(
      'Agent skill directory "fibel" must match frontmatter name "other"',
    );
  });

  test("rejects resources that require archive distribution", async () => {
    const root = temporaryRoot();
    writeSkill(
      root,
      "fibel",
      "Build and maintain Fibel documentation sites.",
    );
    mkdirSync(join(root, "skills", "fibel", "references"));

    await expect(
      createFibelApp(
        testConfig(root, [
          agentSkillsPlugin({ directory: "skills" }),
        ]),
      ),
    ).rejects.toThrow(
      'Agent skill "fibel" must be self-contained in SKILL.md',
    );
  });
});

function temporaryRoot() {
  const directory = mkdtempSync(
    join(tmpdir(), "fibel-agent-skills-"),
  );
  temporaryDirectories.push(directory);
  return directory;
}

function testConfig(
  root: string,
  plugins: FibelPlugin[],
): FibelConfig {
  return {
    title: "Test",
    root,
    content: "docs",
    locales: [{ code: "en", label: "English" }],
    defaultLocale: "en",
    routing: { basePath: "/docs" },
    plugins,
  };
}

function writeSkill(
  root: string,
  name: string,
  description: string,
) {
  const directory = join(root, "skills", name);
  mkdirSync(directory, { recursive: true });
  const content = `---\nname: ${name}\ndescription: ${description}\n---\n\n# ${name}\n`;
  writeFileSync(join(directory, "SKILL.md"), content);
  return content;
}
