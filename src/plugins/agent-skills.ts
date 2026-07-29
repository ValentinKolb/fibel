import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { parseFrontmatter } from "../content";
import type { FibelContext, FibelPlugin } from "../types";
import { joinUrl } from "../utils";
import {
  addAgentSetupUi,
  agentSetupScriptResponse,
  hasPlugin,
} from "./agent-setup";

const discoveryPath = "/.well-known/agent-skills";
const discoverySchema =
  "https://schemas.agentskills.io/discovery/0.2.0/schema.json";
const skillNamePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type AgentSkillsOptions = {
  directory: string;
};

type PublishedSkill = {
  name: string;
  description: string;
  content: string;
  digest: string;
};

export function agentSkillsPlugin(
  options: AgentSkillsOptions,
): FibelPlugin {
  return {
    name: "agent-skills",
    setup(context) {
      if (hasPlugin(context, "mcp")) return;
      addAgentSetupUi(context, {
        skills: true,
        script: joinUrl(
          context.config.routing.basePath,
          context.config.routing.internalPath,
          "agents.js",
        ),
      });
    },
    routes(context) {
      const skills = loadSkills(context, options);
      const index = `${JSON.stringify(
        {
          $schema: discoverySchema,
          skills: skills.map((skill) => ({
            name: skill.name,
            type: "skill-md",
            description: skill.description,
            url: `${discoveryPath}/${skill.name}/SKILL.md`,
            digest: skill.digest,
          })),
        },
        null,
        2,
      )}\n`;

      return [
        ...(!hasPlugin(context, "mcp")
          ? [
              {
                path: "/agents.js",
                scope: "internal" as const,
                handler: agentSetupScriptResponse,
              },
            ]
          : []),
        {
          path: `${discoveryPath}/index.json`,
          scope: "origin",
          handler: (request) =>
            readOnlyResponse(
              request,
              index,
              "application/json; charset=utf-8",
            ),
        },
        ...skills.map((skill) => ({
          path: `${discoveryPath}/${skill.name}/SKILL.md`,
          scope: "origin" as const,
          handler: (request: Request) =>
            readOnlyResponse(
              request,
              skill.content,
              "text/markdown; charset=utf-8",
            ),
        })),
      ];
    },
  };
}

function loadSkills(
  context: FibelContext,
  options: AgentSkillsOptions,
): PublishedSkill[] {
  if (!options.directory.trim()) {
    throw new Error("agentSkillsPlugin requires a non-empty directory.");
  }

  const directory = resolve(context.config.root, options.directory);
  if (!existsSync(directory) || !statSync(directory).isDirectory()) {
    throw new Error(
      `Agent skills directory does not exist: ${directory}`,
    );
  }

  const skills = readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap((entry) => {
      const skillDirectory = resolve(directory, entry.name);
      const skillFile = resolve(skillDirectory, "SKILL.md");
      if (!existsSync(skillFile)) return [];

      const unsupported = readdirSync(skillDirectory, {
        withFileTypes: true,
      })
        .filter(
          (child) =>
            child.name !== "SKILL.md" && !child.name.startsWith("."),
        )
        .map((child) => child.name);
      if (unsupported.length > 0) {
        throw new Error(
          `Agent skill "${entry.name}" must be self-contained in SKILL.md; unsupported entries: ${unsupported.join(", ")}.`,
        );
      }

      const content = readFileSync(skillFile, "utf8");
      const { data } = parseFrontmatter(content);
      const name = stringValue(data.name);
      const description = stringValue(data.description);
      validateSkill(entry.name, name, description);

      return [
        {
          name: name!,
          description: description!,
          content,
          digest: `sha256:${createHash("sha256").update(content).digest("hex")}`,
        },
      ];
    });

  if (skills.length === 0) {
    throw new Error(
      `Agent skills directory contains no SKILL.md files: ${directory}`,
    );
  }

  return skills;
}

function validateSkill(
  directoryName: string,
  name: string | undefined,
  description: string | undefined,
) {
  if (
    !name ||
    name.length > 64 ||
    !skillNamePattern.test(name)
  ) {
    throw new Error(
      `Agent skill "${directoryName}" requires a valid lowercase name of at most 64 characters in SKILL.md frontmatter.`,
    );
  }
  if (name !== directoryName) {
    throw new Error(
      `Agent skill directory "${directoryName}" must match frontmatter name "${name}".`,
    );
  }
  if (!description || description.length > 1024) {
    throw new Error(
      `Agent skill "${name}" requires a non-empty description of at most 1024 characters in SKILL.md frontmatter.`,
    );
  }
}

function readOnlyResponse(
  request: Request,
  body: string,
  contentType: string,
) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "GET, HEAD" },
    });
  }
  return new Response(request.method === "HEAD" ? null : body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=300",
    },
  });
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : undefined;
}
