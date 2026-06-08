---
title: Light und Dark Mode
navTitle: Theme
section: Integrierte Plugins
order: 40
description: Das Theme-Plugin liest den Theme-Cookie und rendert die Seite ohne sichtbaren Wechsel zwischen Light und Dark Mode.
tags: [theme, dark-mode, plugin]
updated: 2026-06-09
---

# Light und Dark Mode

Das Theme-Plugin bestimmt das Theme auf dem Server. Dadurch wird die Seite bereits mit der richtigen Klasse und dem passenden `color-scheme` ausgeliefert.

## Cookie

```ts
export default defineFibel({
  title: "Meine Docs",
  theme: {
    defaultMode: "light",
    cookieName: "fibel_theme",
  },
});
```

Der Server liest den Cookie bei jeder Anfrage. Der Theme-Button im Standard-Layout schreibt denselben Cookie, wenn der Nutzer das Theme umschaltet.

## Gerendertes HTML

Bei aktivem Dark Mode rendert Fibel das Root-Element entsprechend.

```html
<html class="dark" data-theme="dark" style="color-scheme:dark">
```

Das verhindert, dass die Seite erst hell gerendert und direkt danach dunkel geschaltet wird.

## Tailwind

Das Standard-Theme nutzt eine klassenbasierte Dark-Variante.

```css
@custom-variant dark (&:where(.dark, .dark *));
```

Dadurch entscheidet der serverseitig gesetzte HTML-Zustand über die Darstellung. Die Nutzerpräferenz hängt nicht ausschließlich an Media Queries.

## Eigene Themes

Ein eigenes Layout-Plugin kann den Theme-Service weiterverwenden. So bleibt das flickerfreie Verhalten erhalten, während Struktur, Farben und Komponenten ersetzt werden.
