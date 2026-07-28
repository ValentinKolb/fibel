import type { FibelCollection, FibelPage } from "./types";
import { joinUrl } from "./utils";

export function navKey(locale: string, collection?: string) {
  return collection ? `${locale}:${collection}` : locale;
}

export function pageRoute(
  basePath: string,
  locale: string,
  slug: string,
  collection?: FibelCollection,
) {
  return joinUrl(
    basePath,
    locale,
    collection?.path,
    slug === "/" ? undefined : slug,
  );
}

export function sameDocument(left: FibelPage, right: FibelPage) {
  return left.slug === right.slug && left.collection?.id === right.collection?.id;
}

export function collectionForNeutralPath(
  path: string,
  collections: FibelCollection[],
) {
  const normalized = `/${path.replace(/^\/+|\/+$/g, "")}`;
  return [...collections]
    .sort((left, right) => right.path.length - left.path.length)
    .find(
      (collection) =>
        normalized === collection.path ||
        normalized.startsWith(`${collection.path}/`),
    );
}
