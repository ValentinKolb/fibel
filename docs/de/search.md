---
title: Suche
navTitle: Suche
section: Integrierte Plugins
order: 30
description: Das Search-Plugin baut einen Suchindex aus Markdown-Inhalten und stellt einen Endpunkt für die Spotlight-Suche bereit.
tags: [suche, spotlight, plugin]
updated: 2026-06-09
---

# Suche

Das Search-Plugin macht die Dokumentation durchsuchbar, ohne die gesamte Website zu einer clientseitigen App zu machen. Der Index wird beim Start aus den Markdown-Seiten gebaut. Die Oberfläche fragt einen Server-Endpunkt ab, während der Nutzer tippt.

## Endpunkt

Der Suchendpunkt liegt unter dem internen Pfad.

```txt
/_fibel/search?locale=de&q=config
```

Wenn Fibel unter `/docs` läuft, wird der Endpunkt unter `/docs/_fibel/search` ausgeliefert.

## Indexierte Inhalte

Der Index enthält:

- Seitentitel.
- Seitenbeschreibung.
- Sidebar-Bereich.
- Markdown-Text der Seite.

Bei eigenen Seiten wird optionales `context`-Markdown statt des gerenderten Komponenten-HTML indexiert. Getrennte Fibel-Instanzen erzeugen dadurch automatisch getrennte Ergebnismengen.

Die Suche ist locale-bewusst. Eine deutsche Anfrage durchsucht deutsche Seiten. Eine englische Anfrage durchsucht englische Seiten.

## Spotlight-Oberfläche

Das Default-Layout öffnet die Suche über den Suchbutton im Header, `/` oder `Mod+K`. Ergebnisse werden ohne vollständigen Seitenreload aktualisiert. Pfeiltasten bewegen die Auswahl, Enter öffnet das aktive Ergebnis.

## Projektanpassung

Projekte können das Search-Plugin ersetzen, wenn sie einen anderen Index, ein externes Suchsystem oder andere Ranking-Regeln benötigen. Solange der Layout-Code denselben Endpunkt anspricht, kann die Oberfläche unverändert bleiben.

## Markdown-Quellen

Jede Seite ist auch als Markdown erreichbar, zum Beispiel `/de/search.md`. Der Copy-Markdown-Button kopiert diese URL. Das ist nützlich für LLMs, Support-Workflows und Review-Prozesse.
