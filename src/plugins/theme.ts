import type { FibelPlugin, ThemeMode } from "../types";
import { json } from "../utils";

export function themePlugin(): FibelPlugin {
  return {
    name: "theme",
    setup(context) {
      context.services.getTheme = (request) => readTheme(request, context.config.theme.cookieName, context.config.theme.defaultMode);
    },
    routes(context) {
      return [
        {
          path: "/theme",
          handler: async (request) => {
            const mode = await readModeFromRequest(request);
            return json({ mode }, 200);
          },
        },
      ];
    },
  };
}

function readTheme(request: Request, cookieName: string, fallback: ThemeMode) {
  const cookie = request.headers.get("Cookie") ?? "";
  const match = cookie.match(new RegExp(`(?:^|; )${cookieName}=([^;]+)`));
  return match?.[1] === "dark" ? "dark" : match?.[1] === "light" ? "light" : fallback;
}

async function readModeFromRequest(request: Request): Promise<ThemeMode> {
  if (request.method === "POST") {
    const body = await request.json().catch(() => ({}));
    return body?.mode === "dark" ? "dark" : "light";
  }
  return "light";
}
