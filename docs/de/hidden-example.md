---
title: Eine versteckte Seite
navTitle: Versteckte Seite
section: Meta
order: 90
hidden: true
description: Zeigt, was hidden im Frontmatter bewirkt, indem sie selbst versteckt ist.
tags: [frontmatter]
updated: 2026-07-25
---

# Eine versteckte Seite

Diese Seite ist ausschließlich über einen direkten Link erreichbar. Sie erscheint nicht in der Sidebar, nicht in der Pagination, nicht im Suchindex, nicht in `llms.txt` und nicht in der Sitemap, weil ihr Frontmatter das so festlegt:

```yaml
hidden: true
```

Ihre Antwort trägt zusätzlich `<meta name="robots" content="noindex, nofollow">`, Suchmaschinen lassen sie also in Ruhe.

Das ist der Mechanismus für Seiten, die unter einer stabilen URL existieren müssen, ohne in der Navigation aufzutauchen: rechtliche Hinweise, Deeplinks aus externen Systemen oder Entwürfe, die noch nicht gefunden werden sollen. Die übrigen Frontmatter-Felder stehen in der [Konfiguration](/de/docs/configuration).
