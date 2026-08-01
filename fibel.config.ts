import { defaultPlugins, defineFibel } from "./src";
import type { FibelCustomPageRenderContext } from "./src";
import {
  agentSkillsPlugin,
  assistantPlugin,
  blogPlugin,
  imprintPlugin,
  mcpPlugin,
  providerFromEnv,
} from "./src/plugins";

const assistant = process.env.FIBEL_AI_MODEL?.trim()
  ? [
      assistantPlugin({
        provider: providerFromEnv(),
        systemPrompt:
          "Fibel is a Bun-based documentation runtime for Markdown, optional content collections, and host-rendered custom pages. It provides localized routing, collection-aware search, themes, SEO, raw Markdown routes, LLM-friendly output, and an optional bridge for Solid SSR and islands. Its built-in capabilities are plugins that projects can extend or replace.\nHelp {{language}} readers understand and configure Fibel.\nCurrent page: {{currentPageTitle}} ({{currentPage}})\nCurrent page summary: {{currentPageDescription}}\nPrefer short, practical answers and point out relevant configuration names. Today is {{weekday}}, {{date}} in {{timezone}}.",
      }),
    ]
  : [];

const counterContent = {
  default: `# Hello world counter

This interactive custom page demonstrates how a host application can render its own UI inside the Fibel shell while Fibel keeps navigation, search, raw Markdown, MCP, and assistant context.

## Interaction

Use the controls to increase, decrease, or reset the local count. The value starts at zero and is not persisted.

Search marker: custom-page-counter-demo.`,
  de: `# Hallo-Welt-Zähler

Diese interaktive Custom Page zeigt, wie eine Host-Anwendung ihre eigene Oberfläche innerhalb der Fibel-Shell rendert, während Fibel Navigation, Suche, rohes Markdown, MCP und Assistentenkontext bereitstellt.

## Interaktion

Mit den Steuerelementen lässt sich der lokale Zähler erhöhen, verringern oder zurücksetzen. Der Wert startet bei null und wird nicht gespeichert.

Suchmarker: custom-page-counter-demo.`,
};

function renderCounterDemo({ page }: FibelCustomPageRenderContext) {
  const german = page.locale.code === "de";
  const labels = german
    ? {
        description: "Ein kleines interaktives Element, direkt als Fibel Custom Page gerendert.",
        decrease: "Zähler verringern",
        increase: "Zähler erhöhen",
        reset: "Zurücksetzen",
        value: "Aktueller Zählerstand",
      }
    : {
        description: "A small interactive element rendered directly as a Fibel custom page.",
        decrease: "Decrease counter",
        increase: "Increase counter",
        reset: "Reset",
        value: "Current counter value",
      };

  return {
    body: `<style>
      .counter-demo {
        display: grid;
        gap: 1.5rem;
        max-width: 44rem;
      }
      .counter-demo-card {
        display: grid;
        justify-items: center;
        gap: 1.5rem;
        padding: clamp(1.5rem, 5vw, 3rem);
        border: 1px solid color-mix(in srgb, currentColor 14%, transparent);
        border-radius: 1.5rem;
        background: color-mix(in srgb, currentColor 3%, transparent);
        text-align: center;
      }
      .counter-demo-value {
        min-width: 3ch;
        color: var(--fibel-accent-foreground-strong);
        font-size: clamp(3.5rem, 12vw, 6rem);
        font-weight: 700;
        font-variant-numeric: tabular-nums;
        letter-spacing: -0.06em;
        line-height: 1;
      }
      .counter-demo-controls {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 0.75rem;
      }
      .counter-demo-button {
        min-height: 2.75rem;
        padding: 0.65rem 1rem;
        border: 1px solid color-mix(in srgb, currentColor 18%, transparent);
        border-radius: 999px;
        background: transparent;
        color: inherit;
        font: inherit;
        font-weight: 600;
        cursor: pointer;
        transition: background-color 150ms ease, border-color 150ms ease, color 150ms ease;
      }
      .counter-demo-button:hover {
        border-color: var(--fibel-accent);
        background: var(--fibel-accent-surface);
        color: var(--fibel-accent-foreground-strong);
      }
      .counter-demo-button:focus-visible {
        outline: 2px solid var(--fibel-focus-ring);
        outline-offset: 3px;
      }
      .counter-demo-button[data-counter-action="decrement"],
      .counter-demo-button[data-counter-action="increment"] {
        width: 2.75rem;
        padding-inline: 0;
        font-size: 1.35rem;
      }
      @media (prefers-reduced-motion: reduce) {
        .counter-demo-button { transition: none; }
      }
    </style>
    <section class="counter-demo" data-counter-demo>
      <p id="counter-demo-description">${labels.description}</p>
      <div class="counter-demo-card" aria-describedby="counter-demo-description">
        <output class="counter-demo-value" data-counter-value aria-label="${labels.value}" aria-live="polite" aria-atomic="true">0</output>
        <div class="counter-demo-controls">
          <button class="counter-demo-button" type="button" data-counter-action="decrement" aria-label="${labels.decrease}">&minus;</button>
          <button class="counter-demo-button" type="button" data-counter-action="reset">${labels.reset}</button>
          <button class="counter-demo-button" type="button" data-counter-action="increment" aria-label="${labels.increase}">+</button>
        </div>
      </div>
    </section>`,
    scripts: `<script>
      (() => {
        for (const root of document.querySelectorAll("[data-counter-demo]:not([data-counter-ready])")) {
          root.setAttribute("data-counter-ready", "true");
          const output = root.querySelector("[data-counter-value]");
          let count = 0;
          root.addEventListener("click", (event) => {
            const target = event.target instanceof Element
              ? event.target.closest("[data-counter-action]")
              : null;
            const action = target?.getAttribute("data-counter-action");
            if (!action || !output) return;
            count = action === "increment" ? count + 1 : action === "decrement" ? count - 1 : 0;
            output.textContent = String(count);
          });
        }
      })();
    </script>`,
  };
}

export default defineFibel({
  title: "Fibel",
  description: "Publish Markdown collections and host-rendered application pages in one documentation shell with search, multilingual routing, and Markdown sources for tools.",
  siteUrl: "https://fibel.dev",
  collections: [
    {
      id: "docs",
      label: "Docs",
      description: "Guides and reference for building documentation with Fibel.",
      content: "docs",
    },
    {
      id: "blog",
      label: "Blog Demo",
      description: "Notes, ideas, and small updates from the Fibel project.",
      content: "blog",
    },
    {
      id: "custom-demo",
      label: "Custom Demo",
      description: "Interactive host-rendered pages inside the Fibel shell.",
      content: "custom-demo",
    },
  ],
  defaultCollection: "docs",
  pages: [
    {
      path: "/",
      collection: "custom-demo",
      title: "Hello world counter",
      description: "A tiny interactive custom page with searchable Markdown context.",
      navTitle: "Counter",
      section: "Demo",
      order: 10,
      tags: ["custom-page", "interactive"],
      content: counterContent,
      render: renderCounterDemo,
    },
  ],
  assets: "assets",
  routing: {
    basePath: "",
    internalPath: "/_fibel",
    assetsPath: "/assets",
  },
  locales: [
    { code: "en", label: "English" },
    { code: "de", label: "Deutsch" },
  ],
  defaultLocale: "en",
  theme: {
    defaultMode: "light",
    cookieName: "fibel_theme",
  },
  seo: {
    ogImage: "/assets/social.png",
  },
  footerLinks: [{ label: "GitHub", value: "https://github.com/k2b-dev/fibel" }],
  plugins: [
    ...defaultPlugins(),
    imprintPlugin({ url: "https://impressum.valentin-kolb.com", label: "Impressum" }),
    mcpPlugin(),
    agentSkillsPlugin({ directory: "skills" }),
    blogPlugin({ collection: "blog" }),
    ...assistant,
  ],
});
