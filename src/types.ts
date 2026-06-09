export type ThemeMode = "light" | "dark";

export type LocaleConfig = {
  code: string;
  label: string;
  dir?: "ltr" | "rtl";
};

export type FibelRoutingConfig = {
  basePath?: string;
  internalPath?: string;
  assetsPath?: string;
};

export type FibelThemeConfig = {
  defaultMode?: ThemeMode;
  cookieName?: string;
};

export type FooterLink = {
  label: string;
  value: string;
};

export type FibelConfig = {
  title: string;
  description?: string;
  siteUrl?: string;
  root?: string;
  content?: string;
  assets?: string;
  routing?: FibelRoutingConfig;
  locales?: LocaleConfig[];
  defaultLocale?: string;
  theme?: FibelThemeConfig;
  footerLinks?: FooterLink[];
  plugins?: FibelPlugin[];
};

export type ResolvedFibelConfig = Required<
  Pick<FibelConfig, "title" | "root" | "content" | "assets">
> & {
  description: string;
  siteUrl?: string;
  routing: Required<FibelRoutingConfig>;
  locales: LocaleConfig[];
  defaultLocale: string;
  theme: Required<FibelThemeConfig>;
  footerLinks: FooterLink[];
  plugins: FibelPlugin[];
};

export type PageMeta = {
  title: string;
  description: string;
  navTitle: string;
  section: string;
  order: number;
  hidden: boolean;
  tags: string[];
  updated?: string;
};

export type Heading = {
  depth: number;
  text: string;
  id: string;
};

export type FibelPage = {
  id: string;
  locale: LocaleConfig;
  slug: string;
  href: string;
  sourcePath: string;
  raw: string;
  body: string;
  html: string;
  headings: Heading[];
  meta: PageMeta;
};

export type NavSection = {
  label: string;
  pages: FibelPage[];
};

export type SearchEntry = {
  id: string;
  locale: string;
  title: string;
  description: string;
  href: string;
  section: string;
  text: string;
};

export type FibelRoute = {
  path: string;
  handler: (request: Request, context: FibelContext) => Response | Promise<Response>;
};

export type FibelServices = {
  renderMarkdown: (markdown: string, page: FibelPage, context: FibelContext) => string;
  renderPage: (page: FibelPage, request: Request, context: FibelContext) => string;
  getTheme: (request: Request, context: FibelContext) => ThemeMode;
  search: (query: string, locale: string, context: FibelContext) => SearchEntry[];
};

export type FibelContext = {
  config: ResolvedFibelConfig;
  pages: FibelPage[];
  nav: Map<string, NavSection[]>;
  footerItems: string[];
  searchIndex: SearchEntry[];
  routes: FibelRoute[];
  services: FibelServices;
};

export type FibelPlugin = {
  name: string;
  setup?: (context: FibelContext) => void | Promise<void>;
  afterContent?: (context: FibelContext) => void | Promise<void>;
  routes?: (context: FibelContext) => FibelRoute[] | Promise<FibelRoute[]>;
};

export type FibelApp = {
  fetch: (request: Request) => Response | Promise<Response>;
  context: FibelContext;
};
