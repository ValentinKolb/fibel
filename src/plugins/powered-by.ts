import type { FibelPlugin } from "../types";

export function poweredByPlugin(): FibelPlugin {
  return {
    name: "powered-by",
    setup(context) {
      context.footerItems.push(
        '<span class="fibel-powered-by">Powered by <a href="https://fibel.dev" rel="noreferrer">fibel.dev</a></span>',
      );
    },
  };
}
