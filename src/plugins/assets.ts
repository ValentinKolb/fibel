import { existsSync } from "fs";
import { join, normalize, resolve } from "path";
import type { FibelPlugin } from "../types";

export function assetsPlugin(): FibelPlugin {
  return {
    name: "assets",
    routes(context) {
      return [
        {
          path: `${context.config.routing.assetsPath}/*`,
          handler: (request) => {
            const url = new URL(request.url);
            const prefix = context.config.routing.assetsPath;
            const rel = decodeURIComponent(url.pathname.split(prefix)[1]?.replace(/^\/+/, "") ?? "");
            const root = resolve(context.config.root, context.config.assets);
            const file = normalize(join(root, rel));
            if (!file.startsWith(root) || !existsSync(file)) return new Response("Not found", { status: 404 });
            return new Response(Bun.file(file));
          },
        },
      ];
    },
  };
}
