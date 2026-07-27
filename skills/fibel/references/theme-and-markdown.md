# Theme and Markdown rendering

Read this reference when customizing Fibel colors, embedding the shared header, changing Markdown rendering, or debugging tables.

## Accent tokens

Fibel exposes the UI accent through semantic CSS custom properties:

```css
:root {
  --fibel-accent: #d69e2e;
  --fibel-accent-strong: #b7791f;
  --fibel-accent-foreground: #8a5a12;
  --fibel-accent-foreground-strong: #6f470d;
  --fibel-accent-surface: #fffaf0;
  --fibel-focus-ring: var(--fibel-accent);
}
```

A host stylesheet loaded after the Fibel stylesheet can override these values without component-specific selectors. Override them under `.dark` as well when the host needs a separate dark palette.

Use the tokens by role:

- `--fibel-accent`: brand mark, active borders, checks, and highlighted edges.
- `--fibel-accent-strong`: links and compact labels.
- `--fibel-accent-foreground`: text on subtle accent surfaces.
- `--fibel-accent-foreground-strong`: high-contrast accent text.
- `--fibel-accent-surface`: subtle badge and hover backgrounds.
- `--fibel-focus-ring`: keyboard focus indicators.

Do not reintroduce hard-coded amber values or project-specific overrides for Fibel components. Keep syntax-highlighting colors and the static favicon independent from the UI accent contract.

## Markdown rendering

Page Markdown and assistant Markdown use the same server-side Marked renderer and `@k2b/stdlib` syntax highlighter. Preserve that shared stack instead of adding a second client-only renderer.

Markdown tables render as:

```html
<div class="fibel-table-scroll">
  <table>...</table>
</div>
```

The wrapper owns borders, radius, and horizontal overflow. The table remains a semantic table with `width: 100%` and `min-width: max-content`, so short tables fill the content width and wide tables scroll inside the wrapper.

Do not set `display: block` on `<table>`. Apply table overflow behavior to `.fibel-table-scroll` in both page and assistant styles.
