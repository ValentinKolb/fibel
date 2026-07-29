---
title: Dokumentationsassistent
navTitle: KI-Assistent
section: Integrierte Plugins
order: 28
description: Begrenzter Dokumentationschat mit Nessi, standardmäßigem In-Memory-Rate-Limit von Sync und optional geteilter Infrastruktur.
tags: [plugins, ki, nessi, rate-limit]
updated: 2026-07-29
---

# Dokumentationsassistent

`assistantPlugin` ergänzt einen optionalen Chat, der aus sichtbaren Fibel-Seiten antwortet. Der Server nutzt `@k2b/nessi` für den Agent-Loop und gibt dem Agenten zwei schreibgeschützte Tools: die aktuelle Sprache durchsuchen und eine gefundene Seite lesen.

Provider-Zugangsdaten bleiben auf dem Server. Die Dokumentation wird bei Bedarf geladen und nicht in jeden Prompt kopiert.

## Assistent aktivieren

`providerFromEnv()` eignet sich, wenn das Deployment Provider und Modell bestimmen soll:

```ts
import { defaultPlugins, defineFibel } from "@k2b/fibel";
import { assistantPlugin, providerFromEnv } from "@k2b/fibel/plugins";

export default defineFibel({
  title: "Product Docs",
  plugins: [
    ...defaultPlugins(),
    assistantPlugin({
      provider: providerFromEnv(),
      launcherLabel: "Product fragen",
      systemPrompt: "Hilf Lesern bei der Konfiguration von Product. Antworte kurz und praktisch.",
    }),
  ],
});
```

`launcherLabel` ersetzt den lokalisierten Text des Launcher-Buttons (`Ask Product Docs` oder `Product Docs fragen`). Ohne Wert oder bei einem leeren String bleibt dieser lokalisierte Standard erhalten. Der Launcher verwendet das integrierte Sparkles-Icon von Fibel.

Ein Modell und der native Key des ausgewählten Providers werden als Umgebungsvariablen gesetzt:

```sh
FIBEL_AI_PROVIDER=openrouter
FIBEL_AI_MODEL=provider/model-name
OPENROUTER_API_KEY=...
bun run dev
```

`FIBEL_AI_PROVIDER` ist standardmäßig `openrouter`. Unterstützt werden `openrouter`, `openai`, `anthropic`, `gemini`, `mistral` und `ollama`. `FIBEL_AI_BASE_URL` überschreibt den Provider-Endpunkt.

Die Provider-Keys heißen:

| Provider | Umgebungsvariable |
| --- | --- |
| OpenRouter | `OPENROUTER_API_KEY` |
| OpenAI | `OPENAI_API_KEY` |
| Anthropic | `ANTHROPIC_API_KEY` |
| Gemini | `GEMINI_API_KEY` oder `GOOGLE_API_KEY` |
| Mistral | `MISTRAL_API_KEY` |
| Ollama | Kein Key |

`FIBEL_AI_MODEL` ist immer erforderlich. Fehlende oder unbekannte Konfiguration bricht den Start ab, statt einen nicht funktionierenden Chat anzuzeigen.

Für Provider-spezifische Einstellungen außerhalb des Env-Helfers kann ein beliebiger Nessi-`Provider` erzeugt und an `assistantPlugin` übergeben werden.

## Standardmäßige Kostenbegrenzung

Die Standardkonfiguration ist für einen Bun-Prozess ausgelegt und braucht weder Redis noch Datenbank, Queue oder Worker. Sie begrenzt:

- 5 Requests pro Session in einem gleitenden 60-Sekunden-Fenster;
- 100 Requests für den Prozess in einem gleitenden 24-Stunden-Fenster;
- eine aktive Antwort pro Session und höchstens 2 aktive Antworten für den Prozess;
- Nachrichten auf 2.000 Zeichen;
- jede Antwort auf höchstens 3 Nessi-Turns und 600 Output-Tokens;
- Session-History, Tool-Ergebnisse, Suchtreffer, Seitenauszüge, Session-Anzahl und Request-Dauer.

Die Rate-Limiter stammen aus `@k2b/sync/browser` und liegen im Arbeitsspeicher. Ihre Zähler und Chat-Sessions werden bei einem Prozessneustart zurückgesetzt. Jede Replica besitzt eigene Zähler und Sessions.

Im Provider-Konto sollte zusätzlich ein Ausgabenlimit als neustartfeste finanzielle Grenze gesetzt werden. Die Anwendungsgrenzen reduzieren versehentliche Nutzung, ersetzen aber kein Provider-Budget.

Nur abweichende Werte müssen überschrieben werden:

```ts
assistantPlugin({
  provider: providerFromEnv(),
  limits: {
    requestsPerMinute: 3,
    requestsPerDay: 50,
    maxConcurrent: 1,
    maxOutputTokens: 400,
  },
});
```

`onUsage` leitet die aggregierte Token-Nutzung von Nessi an bestehende Logs oder Metriken weiter:

```ts
assistantPlugin({
  provider: providerFromEnv(),
  onUsage: ({ provider, model, reason, usage }) => {
    console.info("fibel assistant usage", { provider, model, reason, usage });
  },
});
```

## Limits zwischen Replicas teilen

Bei mehreren Fibel-Replicas lassen sich serverseitige Limiter aus `@k2b/sync` injizieren. Das Plugin akzeptiert dasselbe `RateLimiter`-Interface wie der In-Memory-Standard:

```ts
import { ratelimit } from "@k2b/sync";

assistantPlugin({
  provider: providerFromEnv(),
  rateLimiters: {
    session: ratelimit({ id: "fibel-assistant-session", limit: 5, windowSecs: 60 }),
    global: ratelimit({ id: "fibel-assistant-global", limit: 100, windowSecs: 86_400 }),
  },
});
```

Das Server-Paket nutzt Redis über Bun. `createSessionStore` ist außerdem erforderlich, wenn der Chatverlauf einer Session zwischen Replicas folgen muss. Ohne diesen Store werden nur die Rate-Limit-Zähler geteilt.

## Kontext steuern

`systemPrompt` enthält vertrauenswürdige Anweisungen des Betreibers. Dort gehören ein kurzer Produktüberblick und stabile Produktregeln hinein, nicht die gesamte Dokumentation. Fibel ergänzt außerdem die aufgelöste Site-Beschreibung, die aktuelle Collection und die Beschreibung der aktuellen Seite als vertrauenswürdigen Überblickskontext. Einfache Fragen zu Identität, grobem Funktionsumfang, Collection und aktueller Seite lassen sich daraus ohne Tool-Aufruf beantworten.

Aktive Agent-Integrationen werden automatisch ergänzt. Ist `agentSkillsPlugin()` aktiv, enthält der vertrauenswürdige Kontext den Skills-CLI-Befehl für den aktuellen Request-Origin. Ist `mcpPlugin()` aktiv, enthält er den aufgelösten öffentlichen, schreibgeschützten MCP-Endpunkt und den Hinweis, dass keine Authentifizierung erforderlich ist. Bei beiden Plugins kennt der Assistent außerdem die Aufgabenteilung: Der Skill liefert kompakte Arbeitsanweisungen, MCP die exakte aktuelle Dokumentation. Nicht aktivierte Plugins werden nicht erwähnt; weitere Konfiguration und ein Opt-out sind nicht erforderlich.

Bei Fragen außerhalb des vertrauenswürdigen Kontexts durchsucht der Assistent die sichtbare Dokumentation. Reichen die begrenzten Suchausschnitte aus, kann er direkt antworten; andernfalls liest er genau einen Treffer vollständig.

Der Standard-Prompt passt erklärende Prosa an die Sprache der letzten Nutzerfrage an. Die konfigurierte Seitensprache dient nur als Fallback, wenn die Sprache der Frage unklar ist. Befehle, Code, Konfiguration, Pfade, Paketnamen, Bezeichner, Flags, Literalwerte und exakte UI-Texte bleiben auch bei einer anderssprachigen Antwort wortgetreu aus der Dokumentation erhalten. Umgebende Dokumentationsprosa darf nur so übersetzt oder zusammengefasst werden, dass ihre belegte Bedeutung unverändert bleibt.

Für einfachen Request-Kontext können Template-Variablen verwendet werden:

```ts
assistantPlugin({
  provider: providerFromEnv(),
  systemPrompt:
    "Hilf {{language}} Lesern mit {{siteTitle}}.\nSite-Überblick: {{siteDescription}}\nCollection: {{currentCollectionLabel}} ({{currentCollection}})\nCollection-Überblick: {{currentCollectionDescription}}\nAktuelle Seite: {{currentPageTitle}} ({{currentPage}})\nSeitenüberblick: {{currentPageDescription}}\nHeute ist {{weekday}}, der {{date}}.",
});
```

Verfügbar sind `{{siteTitle}}`, `{{siteDescription}}`, `{{locale}}`, `{{language}}`, `{{currentCollection}}`, `{{currentCollectionLabel}}`, `{{currentCollectionDescription}}`, `{{currentPage}}`, `{{currentPageTitle}}`, `{{currentPageDescription}}`, `{{date}}`, `{{time}}`, `{{weekday}}` und `{{timezone}}`. Datum und Uhrzeit verwenden die Zeitzone des Servers.

Wenn sich die Anweisung in TypeScript verständlicher zusammensetzen lässt, kann eine synchrone Funktion verwendet werden:

```ts
assistantPlugin({
  provider: providerFromEnv(),
  systemPrompt: (context) =>
    `Hilf ${context.language} Lesern, ${context.currentPageTitle} zu verstehen.`,
});
```

Pro Request ergänzt das Plugin den vertrauenswürdigen Überblicks- und Agent-Zugriffskontext, die aktuelle Sprache und Seite, eine begrenzte Session-History sowie die von den Tools abgerufene Dokumentation. Versteckte Seiten bleiben ausgeschlossen. Tool-Ergebnisse gelten als nicht vertrauenswürdiger Referenztext und können die Systemanweisungen nicht ersetzen.

Eigene Seiten benötigen kein weiteres Tool und keine Registry. Ihr `context`-Markdown steht über die vorhandenen Such- und Lese-Tools bereit. Wird der Assistent auf einer eigenen Route geöffnet, löst Fibel diese Seite automatisch als aktuelle Seite auf.

Auf Collection-Seiten durchsucht `search_docs` standardmäßig die aktuelle Collection. Für bereichsübergreifende Fragen kann das Modell eine andere Collection-ID oder `all` angeben. `read_doc` verlangt weiterhin genau einen kanonischen `href` aus dem Suchergebnis.

## Markdown-Antworten

Antworten des Assistenten nutzen Fibels bestehenden serverseitigen Markdown- und Syntax-Highlighting-Stack mit einer kompakten Typografie für den Chat. Listen, Links, Tabellen, Zitate, Inline-Code und Codeblöcke werden unterstützt. Rohes Modell-HTML, unsichere Link-Protokolle und Bilder werden nicht gerendert.
