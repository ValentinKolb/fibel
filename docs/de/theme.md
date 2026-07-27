---
title: Light und Dark Mode
navTitle: Theme
section: Integrierte Plugins
order: 40
description: Das Theme-Plugin liest den Theme-Cookie und rendert die Seite ohne sichtbaren Wechsel zwischen Light und Dark Mode.
tags: [theme, dark-mode, plugin]
updated: 2026-07-27
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

## Akzentfarben

Fibel stellt den UI-Akzent über semantische CSS Custom Properties bereit. Ein nach dem Fibel-Stylesheet geladenes Host-Stylesheet kann diese Werte überschreiben, ohne einzelne Komponenten zu selektieren:

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

| Property | Verwendung |
| --- | --- |
| `--fibel-accent` | Brand-Marke, aktive Rahmen, Häkchen und hervorgehobene Kanten |
| `--fibel-accent-strong` | Links und kompakte Labels |
| `--fibel-accent-foreground` | Text auf einer dezenten Akzentfläche |
| `--fibel-accent-foreground-strong` | Kontrastreicher Akzenttext |
| `--fibel-accent-surface` | Dezente Hover-Hintergründe |
| `--fibel-focus-ring` | Fokusindikatoren für die Tastatur |

Die Standardwerte erhalten die gelbe Fibel-Palette. Dark Mode setzt passende Standardwerte über `.dark`; bei abweichender dunkler Palette kann ein Host diesen Selektor separat überschreiben.

## Eigene Themes

Ein eigenes Layout-Plugin kann den Theme-Service weiterverwenden. So bleibt das flickerfreie Verhalten erhalten, während Struktur, Farben und Komponenten ersetzt werden.
