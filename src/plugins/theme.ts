import type { FibelPlugin, ThemeMode } from "../types";

export function themePlugin(): FibelPlugin {
  return {
    name: "theme",
    setup(context) {
      context.services.getTheme = (request) => readTheme(request, context.config.theme.cookieName, context.config.theme.defaultMode);
    },
  };
}

function readTheme(request: Request, cookieName: string, fallback: ThemeMode) {
  const cookie = request.headers.get("Cookie") ?? "";
  const match = cookie.match(new RegExp(`(?:^|; )${cookieName}=([^;]+)`));
  return match?.[1] === "dark" ? "dark" : match?.[1] === "light" ? "light" : fallback;
}
