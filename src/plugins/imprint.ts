import type { FibelPlugin } from "../types";

export type ImprintOptions = {
  url: string;
  label?: string;
};

export function imprintPlugin(options: ImprintOptions): FibelPlugin {
  return {
    name: "imprint",
    setup(context) {
      context.config.footerLinks.push({ label: options.label ?? "Imprint", value: options.url });
    },
  };
}
