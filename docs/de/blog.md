---
title: Blog-Collections
navTitle: Blog
section: Inhalte
order: 28
description: Veröffentliche einen nach Datum sortierten redaktionellen Feed aus einer normalen Markdown-Collection, ohne eine zweite Content-Pipeline einzuführen.
tags: [blog, collections, markdown]
updated: 2026-08-01
---

# Blog-Collections

`blogPlugin()` macht aus einer bestehenden Collection einen Blog. Die
Collection behält die normalen Fibel-Routen und ihre Sidebar; auf der
Collection-Startseite erscheint ein nach Veröffentlichungsdatum sortierter
Feed.

## Collection konfigurieren

```ts
import { defaultPlugins, defineFibel } from "@k2b/fibel";
import { blogPlugin } from "@k2b/fibel/plugins";

export default defineFibel({
  title: "Product",
  collections: [
    { id: "docs", label: "Docs", content: "content/docs" },
    {
      id: "blog",
      label: "Blog",
      description: "Neuigkeiten und Notizen des Produktteams.",
      content: "content/blog",
    },
  ],
  defaultCollection: "docs",
  plugins: [...defaultPlugins(), blogPlugin({ collection: "blog" })],
});
```

Lege in der Blog-Collection keine `index.md` an. Das Plugin besitzt die
Collection-Startseite und erzeugt dort den Feed.

## Beiträge schreiben

Jeder Beitrag ist eine normale lokalisierte Markdown-Datei. `date` ist Pflicht;
`authors` und alle üblichen Fibel-Metadaten sind optional.

```md
---
title: Ein kleines Release
description: Was sich geändert hat und warum es wichtig ist.
date: 2026-08-01
authors: [Ada Lovelace, Grace Hopper]
tags: [release, notes]
---

# Ein kleines Release

Dieser Absatz erscheint im Feed.

<!-- truncate -->

Hier geht der vollständige Beitrag weiter.
```

Bei den Locales `en` und `de` liegen Übersetzungen unter übereinstimmenden
Pfaden wie `content/blog/en/small-release.md` und
`content/blog/de/small-release.md`. Fibel verwendet das aktive Locale für
Datumsformat und Sprachwechsel.

## Eine Quelle für alle Verbraucher

Das Plugin ändert die Darstellung, nicht die Speicherung. Die Suche indexiert
den vollständigen Beitrag, Assistant und MCP lesen sein Markdown, Raw-`.md`-
Routen funktionieren weiter und das Collection-spezifische `llms.txt` enthält
dieselben Seiten. Der Feed verwendet den Inhalt vor `<!-- truncate -->`; ohne
Marker fällt er auf die Frontmatter-Beschreibung zurück.
