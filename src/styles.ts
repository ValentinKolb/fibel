import { rmSync } from "fs";
import tailwindPlugin from "bun-plugin-tailwind";
import { ensureDir } from "./utils";

export async function buildStyles(root: string, minify = false) {
  const outdir = `${root}/.fibel/public`;
  ensureDir(outdir);
  rmSync(`${outdir}/styles.css`, { force: true });
  const result = await Bun.build({
    entrypoints: [new URL("./theme/styles.css", import.meta.url).pathname],
    outdir,
    naming: "styles.[ext]",
    plugins: [tailwindPlugin],
    minify,
  });
  if (!result.success) {
    for (const log of result.logs) console.error(log);
    throw new Error("Failed to build Fibel styles.");
  }
}
