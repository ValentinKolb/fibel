---
title: Light and dark mode
navTitle: Theme
section: Built-in plugins
order: 40
description: The theme plugin reads the theme cookie and renders the page without a visible switch between light and dark mode.
tags: [theme, dark-mode, plugin]
updated: 2026-07-27
---

# Light and dark mode

The theme plugin resolves the theme on the server. The page is delivered with the correct class and `color-scheme` before the browser paints it.

## Cookie

```ts
export default defineFibel({
  title: "My Docs",
  theme: {
    defaultMode: "light",
    cookieName: "fibel_theme",
  },
});
```

The server reads the cookie on every request. The theme button in the default layout writes the same cookie when the reader changes the theme.

## Rendered HTML

When dark mode is active, Fibel renders the root element accordingly.

```html
<html class="dark" data-theme="dark" style="color-scheme:dark">
```

This prevents the page from rendering in light mode and switching to dark mode immediately afterward.

## Tailwind

The default theme uses a class-based dark variant.

```css
@custom-variant dark (&:where(.dark, .dark *));
```

The server-rendered HTML state controls the visual output. The reader's selected theme is not limited to media queries.

## Accent colors

Fibel exposes its UI accent as semantic CSS custom properties. A host stylesheet loaded after the Fibel stylesheet can override them without targeting individual components:

```css
:root {
  --fibel-accent: #2563eb;
  --fibel-accent-strong: #1d4ed8;
  --fibel-accent-foreground: #1e40af;
  --fibel-accent-foreground-strong: #1e3a8a;
  --fibel-accent-surface: #eff6ff;
  --fibel-focus-ring: var(--fibel-accent);
}
```

| Property | Used for |
| --- | --- |
| `--fibel-accent` | Brand mark, active borders, checks, and highlighted edges |
| `--fibel-accent-strong` | Links and compact labels |
| `--fibel-accent-foreground` | Text shown with a subtle accent surface |
| `--fibel-accent-foreground-strong` | High-contrast accent text |
| `--fibel-accent-surface` | Subtle hover backgrounds |
| `--fibel-focus-ring` | Keyboard focus indicators |

The defaults preserve Fibel's amber palette. Dark mode supplies matching defaults through `.dark`; a host can override that selector separately when its dark palette needs different values.

## Custom themes

A custom layout plugin can keep using the theme service. This preserves no-flicker behavior while replacing structure, colors, and components.
