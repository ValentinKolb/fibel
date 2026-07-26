import type { JSX } from "solid-js";
import type {
  FibelCustomPage,
  FibelCustomPageRenderContext,
  FibelDocumentRenderer,
} from "./types";

export type FibelSsrTemplateOptions = {
  renderDocument: FibelDocumentRenderer;
};

export type FibelSsrTemplateContext = FibelSsrTemplateOptions & {
  body: string;
  scripts: string;
};

export type FibelSsrHtml = (
  render: () => JSX.Element,
  options?: FibelSsrTemplateOptions,
) => Promise<Response>;

export type SolidPageOptions = Omit<FibelCustomPage, "render"> & {
  html: FibelSsrHtml;
  component: (context: FibelCustomPageRenderContext) => JSX.Element;
};

export function fibelSsrTemplate({
  body,
  scripts,
  renderDocument,
}: FibelSsrTemplateContext) {
  return renderDocument({ body, scripts });
}

export function solidPage(options: SolidPageOptions): FibelCustomPage {
  const { html, component, ...page } = options;
  return {
    ...page,
    render: (context) =>
      html(() => component(context), {
        renderDocument: context.renderDocument,
      }),
  };
}
