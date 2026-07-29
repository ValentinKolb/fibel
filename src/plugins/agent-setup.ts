import type { FibelContext, FibelPage } from "../types";
import { escapeHtml } from "../utils";

type McpSetup = {
  endpoint: string;
  name: string;
};

type AgentSetupOptions = {
  mcp?: McpSetup;
  skills: boolean;
  script: string;
};

type SetupClient = {
  id: "skills" | "general" | "codex" | "claude" | "opencode";
  label: string;
  valueLabel: string;
  command: string;
  fallbackValue: string;
  hint: string;
};

const focus =
  "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:[outline-color:var(--fibel-focus-ring)]";

export const agentSetupClientScript = String.raw`
const dialog = document.querySelector("[data-fibel-agent-setup-dialog]");
const opener = document.querySelector("[data-fibel-agent-setup-open]");
const closeButton = dialog?.querySelector("[data-fibel-agent-setup-close]");
const endpoint = dialog?.getAttribute("data-endpoint");
const endpointUrl = endpoint ? new URL(endpoint, window.location.origin).toString() : "";
const tabs = Array.from(dialog?.querySelectorAll("[data-fibel-agent-setup-tab]") || []);
const panels = Array.from(dialog?.querySelectorAll("[data-fibel-agent-setup-panel]") || []);
const values = Array.from(dialog?.querySelectorAll("[data-fibel-agent-setup-value]") || []);
const copyButtons = Array.from(dialog?.querySelectorAll("[data-fibel-agent-setup-copy]") || []);
const status = dialog?.querySelector("[data-fibel-agent-setup-status]");
let previousOverflow = "";

for (const value of values) {
  const command = value.getAttribute("data-command");
  if (!command) continue;
  value.textContent = command
    .replace("{origin}", window.location.origin)
    .replace("{endpoint}", endpointUrl);
}

const activateTab = (nextTab, focus = false) => {
  const client = nextTab?.getAttribute("data-fibel-agent-setup-tab");
  if (!client) return;
  for (const tab of tabs) {
    const selected = tab === nextTab;
    tab.setAttribute("aria-selected", String(selected));
    tab.setAttribute("tabindex", selected ? "0" : "-1");
  }
  for (const panel of panels) {
    panel.hidden = panel.getAttribute("data-fibel-agent-setup-panel") !== client;
  }
  if (status) status.textContent = "";
  if (focus) nextTab.focus();
};

tabs.forEach((tab, index) => {
  tab.addEventListener("click", () => activateTab(tab));
  tab.addEventListener("keydown", (event) => {
    let nextIndex;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
    if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = tabs.length - 1;
    if (nextIndex === undefined) return;
    event.preventDefault();
    activateTab(tabs[nextIndex], true);
  });
});

const openDialog = () => {
  if (!(dialog instanceof HTMLDialogElement)) return;
  previousOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  dialog.showModal();
};

const closeDialog = () => {
  if (dialog instanceof HTMLDialogElement && dialog.open) dialog.close();
};

opener?.addEventListener("click", openDialog);
closeButton?.addEventListener("click", closeDialog);

dialog?.addEventListener("click", (event) => {
  if (!(dialog instanceof HTMLDialogElement) || event.target !== dialog) return;
  const bounds = dialog.getBoundingClientRect();
  const inside =
    event.clientX >= bounds.left &&
    event.clientX <= bounds.right &&
    event.clientY >= bounds.top &&
    event.clientY <= bounds.bottom;
  if (!inside) closeDialog();
});

dialog?.addEventListener("close", () => {
  document.body.style.overflow = previousOverflow;
  if (status) status.textContent = "";
  opener?.focus();
});

copyButtons.forEach((copyButton) => {
  copyButton.addEventListener("click", async () => {
    const value = copyButton.parentElement?.querySelector("[data-fibel-agent-setup-value]")?.textContent;
    if (!value) return;
    try {
      await copyText(value);
      if (status) status.textContent = copyButton.getAttribute("data-copied-label") || "Copied.";
    } catch {
      if (status) status.textContent = copyButton.getAttribute("data-error-label") || "Copy failed.";
    }
  });
});

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall through to the selection-based copy path.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("Copy failed.");
}
`;

const scriptVersion = Bun.hash(agentSetupClientScript).toString(36);

export function hasPlugin(
  context: FibelContext,
  name: string,
) {
  return context.config.plugins.some((plugin) => plugin.name === name);
}

export function addAgentSetupUi(
  context: FibelContext,
  options: AgentSetupOptions,
) {
  const legacyButton = options.mcp ? " data-fibel-mcp-open" : "";
  const label = options.skills ? "Agents" : "MCP";
  context.footerItems.push(
    `<button class="fibel-footer-link cursor-pointer appearance-none border-0 bg-transparent p-0 font-[inherit] text-[inherit] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:[outline-color:var(--fibel-focus-ring)]" type="button" data-fibel-agent-setup-open${legacyButton} aria-haspopup="dialog">${label}</button>`,
  );
  context.bodyItems.push(
    (page) =>
      `${renderAgentSetupDialog(page, context, options)}\n<script type="module" src="${escapeHtml(`${options.script}?v=${scriptVersion}`)}"></script>`,
  );
}

export function agentSetupScriptResponse() {
  return new Response(agentSetupClientScript, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Type": "application/javascript; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function renderAgentSetupDialog(
  page: FibelPage,
  context: FibelContext,
  options: AgentSetupOptions,
) {
  const copy = agentSetupCopy(
    page.locale.code,
    context.config.title,
    options.mcp?.name,
    options.skills,
  );
  const clients = setupClients(copy, options);
  const hasTabs = clients.length > 1;
  const tabs = hasTabs
    ? `<div class="-mx-1 mb-5 overflow-x-auto px-1 pb-1">
      <div class="flex w-full min-w-max gap-1 rounded-[0.8rem] bg-zinc-100 p-1 dark:bg-white/[0.06]" role="tablist" aria-label="${escapeHtml(copy.clientSelector)}">
        ${clients.map((client, index) => renderTab(client, index)).join("")}
      </div>
    </div>`
    : "";
  const panels = clients
    .map((client, index) =>
      renderPanel(client, index, hasTabs, copy, Boolean(options.mcp)),
    )
    .join("");
  const endpoint = options.mcp
    ? ` data-endpoint="${escapeHtml(options.mcp.endpoint)}"`
    : "";
  const legacyDialog = options.mcp ? " data-fibel-mcp-dialog" : "";

  return `<dialog class="m-auto max-h-[min(42rem,calc(100dvh-2rem))] w-[min(36rem,calc(100vw-2rem))] overflow-auto rounded-[1.25rem] border border-zinc-200 bg-white p-0 text-zinc-900 shadow-[0_24px_80px_rgb(24_24_27_/_0.22)] backdrop:bg-zinc-950/40 backdrop:backdrop-blur-[3px] dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-50 dark:shadow-[0_24px_80px_rgb(0_0_0_/_0.55)]" data-fibel-agent-setup-dialog${legacyDialog}${endpoint} aria-labelledby="fibel-agent-setup-title">
  <div class="relative p-5 sm:p-7">
    <button class="${focus} absolute right-4 top-4 inline-grid h-9 w-9 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white" type="button" data-fibel-agent-setup-close aria-label="${escapeHtml(copy.close)}">${closeIcon()}</button>
    <h2 class="m-0 max-w-[calc(100%_-_3rem)] text-xl font-semibold tracking-[-0.015em]" id="fibel-agent-setup-title">${escapeHtml(copy.title)}</h2>
    <p class="mb-5 mt-2 max-w-[30rem] text-[0.925rem] leading-6 text-zinc-600 dark:text-zinc-400">${escapeHtml(copy.intro)}</p>
    ${tabs}
    ${panels}
    <p class="mb-0 mt-2 min-h-5 text-xs [color:var(--fibel-accent-foreground-strong)]" data-fibel-agent-setup-status aria-live="polite"></p>
    <p class="mb-0 mt-6 border-t border-zinc-200 pt-4 text-[0.8rem] leading-5 text-zinc-500 dark:border-white/10 dark:text-zinc-400">${escapeHtml(copy.note)}</p>
  </div>
</dialog>`;
}

function setupClients(
  copy: ReturnType<typeof agentSetupCopy>,
  options: AgentSetupOptions,
): SetupClient[] {
  const clients: SetupClient[] = [];
  if (options.skills) {
    clients.push({
      id: "skills",
      label: copy.skills,
      valueLabel: copy.command,
      command: "bunx skills add {origin}",
      fallbackValue: "bunx skills add https://docs.example.com",
      hint: copy.skillsHint,
    });
  }
  if (options.mcp) {
    clients.push(
      {
        id: "codex",
        label: "Codex",
        valueLabel: copy.command,
        command: `codex mcp add ${options.mcp.name} --url {endpoint}`,
        fallbackValue: `codex mcp add ${options.mcp.name} --url ${options.mcp.endpoint}`,
        hint: copy.codexHint,
      },
      {
        id: "claude",
        label: "Claude Code",
        valueLabel: copy.command,
        command: `claude mcp add --transport http ${options.mcp.name} {endpoint}`,
        fallbackValue: `claude mcp add --transport http ${options.mcp.name} ${options.mcp.endpoint}`,
        hint: copy.claudeHint,
      },
      {
        id: "opencode",
        label: "OpenCode",
        valueLabel: copy.command,
        command: `opencode mcp add ${options.mcp.name} --url {endpoint}`,
        fallbackValue: `opencode mcp add ${options.mcp.name} --url ${options.mcp.endpoint}`,
        hint: copy.openCodeHint,
      },
      {
        id: "general",
        label: copy.other,
        valueLabel: copy.endpoint,
        command: "{endpoint}",
        fallbackValue: options.mcp.endpoint,
        hint: copy.generalHint,
      },
    );
  }
  return clients;
}

function renderTab(
  client: SetupClient,
  index: number,
) {
  return `<button class="${focus} flex-1 cursor-pointer whitespace-nowrap rounded-[0.65rem] border-0 bg-transparent px-3 py-2 text-xs font-medium text-zinc-500 aria-selected:bg-white aria-selected:text-zinc-900 aria-selected:shadow-[0_1px_4px_rgb(24_24_27_/_0.08)] dark:text-zinc-400 dark:aria-selected:bg-white/10 dark:aria-selected:text-white dark:aria-selected:shadow-none" type="button" role="tab" id="fibel-agent-setup-tab-${client.id}" aria-controls="fibel-agent-setup-panel-${client.id}" aria-selected="${index === 0}" tabindex="${index === 0 ? "0" : "-1"}" data-fibel-agent-setup-tab="${client.id}">${escapeHtml(client.label)}</button>`;
}

function renderPanel(
  client: SetupClient,
  index: number,
  hasTabs: boolean,
  copy: ReturnType<typeof agentSetupCopy>,
  hasMcp: boolean,
) {
  const tabPanel = hasTabs
    ? ` role="tabpanel" aria-labelledby="fibel-agent-setup-tab-${client.id}"${index === 0 ? "" : " hidden"}`
    : "";
  const generalSteps =
    client.id === "general"
      ? `<ol class="mt-4 grid list-none gap-4 p-0 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
      ${copy.steps.map((step, stepIndex) => `<li class="grid grid-cols-[1.75rem_minmax(0,1fr)] items-start gap-3"><span class="grid h-7 w-7 place-items-center rounded-full bg-[var(--fibel-accent-surface)] text-xs font-bold [color:var(--fibel-accent-foreground-strong)]">${stepIndex + 1}</span><span>${escapeHtml(step)}</span></li>`).join("")}
    </ol>`
      : "";
  const skillsDetails =
    client.id === "skills"
      ? `<p class="mb-0 mt-4 rounded-[0.9rem] bg-[var(--fibel-accent-surface)] px-4 py-3 text-xs leading-5 [color:var(--fibel-accent-foreground-strong)]">${escapeHtml(hasMcp ? copy.skillsMcpHint : copy.skillsOnlyHint)}</p>
    <p class="mb-0 mt-3 text-xs leading-5 text-zinc-500 dark:text-zinc-400">${escapeHtml(copy.skillsCliBefore)} <a class="font-medium underline decoration-[color:var(--fibel-accent-border)] underline-offset-4 hover:[color:var(--fibel-accent-strong)]" href="https://github.com/vercel-labs/skills" target="_blank" rel="noreferrer">${escapeHtml(copy.skillsCli)}</a>.</p>`
      : "";

  return `<section id="fibel-agent-setup-panel-${client.id}" data-fibel-agent-setup-panel="${client.id}"${tabPanel}>
    <span class="mb-2 block text-xs font-semibold uppercase tracking-[0.06em] text-zinc-500 dark:text-zinc-400">${escapeHtml(client.valueLabel)}</span>
    <div class="flex items-center gap-3 rounded-[0.9rem] bg-zinc-100 py-3 pl-4 pr-3 dark:bg-white/[0.07]">
      <code class="min-w-0 flex-1 overflow-x-auto whitespace-pre font-mono text-[0.78rem] leading-5 text-zinc-800 dark:text-zinc-200" data-fibel-agent-setup-value data-command="${escapeHtml(client.command)}">${escapeHtml(client.fallbackValue)}</code>
      <button class="${focus} inline-grid h-9 w-9 flex-none cursor-pointer place-items-center rounded-full border-0 bg-white text-zinc-600 shadow-[0_1px_4px_rgb(24_24_27_/_0.08)] hover:[color:var(--fibel-accent-strong)] dark:bg-white/10 dark:text-zinc-300 dark:shadow-none" type="button" data-fibel-agent-setup-copy data-copied-label="${escapeHtml(copy.copied)}" data-error-label="${escapeHtml(copy.copyError)}" aria-label="${escapeHtml(copy.copy)}">${copyIcon()}</button>
    </div>
    <p class="mb-0 mt-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">${escapeHtml(client.hint)}</p>
    ${generalSteps}
    ${skillsDetails}
  </section>`;
}

function agentSetupCopy(
  locale: string,
  title: string,
  name: string | undefined,
  hasSkills: boolean,
) {
  const serverName = name ?? "documentation";
  if (locale === "de") {
    return {
      title: "Coding-Agent verbinden",
      intro: hasSkills
        ? `Der ${title}-Skill liefert kompakte Arbeitsanweisungen. MCP stellt bei Detailfragen die exakte aktuelle Dokumentation bereit.`
        : `Diese öffentliche MCP-Schnittstelle stellt die sichtbare ${title}-Dokumentation ohne Zugangsdaten bereit.`,
      clientSelector: hasSkills
        ? "Skill installieren oder MCP-Client auswählen"
        : "Coding-Agent auswählen",
      skills: "Skills",
      other: "Andere",
      endpoint: "Streamable-HTTP-Endpunkt",
      command: "CLI-Befehl",
      close: hasSkills
        ? "Agent-Einrichtung schließen"
        : "MCP-Einrichtung schließen",
      copy: "Einrichtung kopieren",
      copied: "Kopiert.",
      copyError: "Kopieren fehlgeschlagen.",
      skillsHint:
        "Der Befehl installiert die von dieser Website veröffentlichten Arbeitsanweisungen im ausgewählten Coding-Agenten.",
      skillsMcpHint:
        "Für exakte und aktuelle Details wird zusätzlich der MCP-Server über einen der Agent-Tabs verbunden.",
      skillsOnlyHint:
        "Der Skill liefert kompakte Orientierung. Ein zusätzlich aktivierter MCP-Server kann exakte aktuelle Dokumentation bereitstellen.",
      skillsCliBefore: "Die Installation verwendet die",
      skillsCli: "Open-Source-Skills-CLI von Vercel",
      generalHint:
        "Dieser Endpunkt funktioniert mit jedem Client, der Streamable HTTP unterstützt.",
      codexHint:
        "Der Befehl fügt die Dokumentation zur Codex-Konfiguration hinzu.",
      claudeHint:
        "Der Befehl fügt die Dokumentation für das aktuelle Claude-Code-Projekt hinzu.",
      openCodeHint:
        "Der Befehl fügt die entfernte Dokumentation zu OpenCode hinzu.",
      steps: [
        "Im Coding-Agent einen entfernten MCP-Server hinzufügen und keine Authentifizierung konfigurieren.",
        `Den Server „${serverName}“ nennen und den Endpunkt oben einfügen.`,
        "Den Agenten auffordern, die Dokumentation zu durchsuchen und die passende Markdown-Seite zu lesen.",
      ],
      note: hasSkills
        ? "Skill und MCP ergänzen sich: Der Skill beschreibt Arbeitsabläufe, MCP liefert die aktuelle Dokumentation."
        : "Mehrere Fibel-Instanzen werden als getrennte MCP-Server mit eindeutigen Namen hinzugefügt, zum Beispiel product-docs und product-ui.",
    };
  }
  return {
    title: "Connect a coding agent",
    intro: hasSkills
      ? `The ${title} skill provides compact working instructions. MCP supplies exact current documentation when details matter.`
      : `This public MCP endpoint exposes the visible ${title} documentation without credentials.`,
    clientSelector: hasSkills
      ? "Install the skill or choose an MCP client"
      : "Choose a coding agent",
    skills: "Skills",
    other: "Other",
    endpoint: "Streamable HTTP endpoint",
    command: "CLI command",
    close: hasSkills ? "Close agent setup" : "Close MCP setup",
    copy: "Copy setup",
    copied: "Copied.",
    copyError: "Copy failed.",
    skillsHint:
      "This command installs the working instructions published by this website in the selected coding agent.",
    skillsMcpHint:
      "For exact, current details, also connect the MCP server through one of the agent tabs.",
    skillsOnlyHint:
      "The skill provides compact orientation. An enabled MCP server can additionally supply exact current documentation.",
    skillsCliBefore: "Installation uses the",
    skillsCli: "open-source Vercel Skills CLI",
    generalHint:
      "This endpoint works with any client that supports Streamable HTTP.",
    codexHint:
      "This command adds the documentation to the Codex configuration.",
    claudeHint:
      "This command adds the documentation for the current Claude Code project.",
    openCodeHint:
      "This command adds the remote documentation to OpenCode.",
    steps: [
      "Add a remote MCP server in the coding agent without configuring authentication.",
      `Name the server “${serverName}” and paste the endpoint above.`,
      "Ask the agent to search the documentation and read the matching Markdown page.",
    ],
    note: hasSkills
      ? "The skill and MCP complement each other: the skill describes workflows, while MCP supplies current documentation."
      : "Add several Fibel instances as separate MCP servers with distinct names, such as product-docs and product-ui.",
  };
}

function closeIcon() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="m6 6 12 12M18 6 6 18"/></svg>';
}

function copyIcon() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>';
}
