---
title: Light and dark mode
navTitle: Theme
section: Built-in plugins
order: 40
description: The theme plugin reads the theme cookie and renders the page without a visible switch between light and dark mode.
tags: [theme, dark-mode, plugin]
updated: 2026-06-09
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

## Custom themes

A custom layout plugin can keep using the theme service. This preserves no-flicker behavior while replacing structure, colors, and components.
