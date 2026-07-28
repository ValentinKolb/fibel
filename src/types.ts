export type ThemeMode = "light" | "dark";

export type LocaleConfig = {
  code: string;
  label: string;
  dir?: "ltr" | "rtl";
};

export type FibelCollectionConfig = {
  id: string;
  label: string;
  description?: string;
  content: string;
  path?: string;
};

export type FibelCollection = {
  id: string;
  label: string;
  description: string;
  content: string;
  path: string;
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

export type FibelSeoConfig = {
  favicon?: string;
  ogImage?: string;
  twitterSite?: string;
  disallow?: string[];
};

export type FibelHeaderLinkContext = {
  locale: string;
  pathname: string;
  basePath: string;
  collection?: string;
};

export type FibelHeaderHref = string | ((context: FibelHeaderLinkContext) => string);

export type FibelHeaderLinkConfig = {
  label: string;
  href: FibelHeaderHref;
  activeWhen?: string;
};

export type FibelHeaderConfig = {
  title?: string;
  homeHref?: FibelHeaderHref;
  links?: FibelHeaderLinkConfig[];
  search?: boolean;
  searchLabel?: string;
  searchPlaceholder?: string;
  themeToggle?: boolean;
  mobileNavigation?: boolean;
};

export type NavLink = {
  label: string;
  value: string;
};

export type FooterLink = NavLink;

export type FibelPageLayout = "article" | "full";

export type FibelCustomPageContext = string | ({ default: string } & Record<string, string>);

export type FibelPageDocument = {
  body: string;
  scripts?: string;
};

export type FibelDocumentRenderer = (document: FibelPageDocument) => string;

export type FibelCustomPageRenderContext = {
  request: Request;
  page: FibelPage;
  context: {
    markdown: string;
    html: string;
  };
  fibel: FibelContext;
  renderDocument: FibelDocumentRenderer;
};

export type FibelCustomPageRenderResult = string | FibelPageDocument | Response;

export type FibelCustomPage = {
  path: string;
  collection?: string;
  title: string;
  description: string;
  navTitle?: string;
  section?: string;
  order?: number;
  hidden?: boolean;
  tags?: string[];
  updated?: string;
  image?: string;
  layout?: FibelPageLayout;
  context?: FibelCustomPageContext;
  render: (
    context: FibelCustomPageRenderContext,
  ) => FibelCustomPageRenderResult | Promise<FibelCustomPageRenderResult>;
};

export type FibelConfig = {
  title: string;
  description?: string;
  siteUrl?: string;
  root?: string;
  content?: string;
  collections?: FibelCollectionConfig[];
  defaultCollection?: string;
  assets?: string;
  routing?: FibelRoutingConfig;
  locales?: LocaleConfig[];
  defaultLocale?: string;
  theme?: FibelThemeConfig;
  seo?: FibelSeoConfig;
  header?: FibelHeaderConfig;
  headerLinks?: NavLink[];
  footerLinks?: NavLink[];
  pages?: FibelCustomPage[];
  plugins?: FibelPlugin[];
};

export type ResolvedFibelConfig = Required<
  Pick<FibelConfig, "title" | "root" | "content" | "assets">
> & {
  description: string;
  siteUrl?: string;
  collections: FibelCollection[];
  defaultCollection?: string;
  routing: Required<FibelRoutingConfig>;
  locales: LocaleConfig[];
  defaultLocale: string;
  theme: Required<FibelThemeConfig>;
  seo: { favicon?: string; ogImage?: string; twitterSite?: string; disallow: string[] };
  header: FibelHeaderConfig;
  headerLinks: NavLink[];
  footerLinks: NavLink[];
  pages: FibelCustomPage[];
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
  image?: string;
};

export type Heading = {
  depth: number;
  text: string;
  id: string;
};

export type FibelPage = {
  id: string;
  kind: "markdown" | "custom";
  collection?: FibelCollection;
  locale: LocaleConfig;
  slug: string;
  href: string;
  sourcePath: string;
  raw: string;
  body: string;
  html: string;
  headings: Heading[];
  meta: PageMeta;
  layout: FibelPageLayout;
  render?: FibelCustomPage["render"];
};

export type NavSection = {
  label: string;
  pages: FibelPage[];
};

export type SearchEntry = {
  id: string;
  locale: string;
  collection?: string;
  collectionLabel?: string;
  title: string;
  description: string;
  href: string;
  section: string;
  text: string;
};

export type FibelRoute = {
  path: string;
  scope?: "public" | "internal" | "both";
  handler: (request: Request, context: FibelContext) => Response | Promise<Response>;
};

export type HeadTag = (page: FibelPage, context: FibelContext) => string;
export type BodyItem = (page: FibelPage, context: FibelContext) => string;

export type FibelServices = {
  renderMarkdown: (markdown: string, page: FibelPage, context: FibelContext) => string;
  renderPage: (
    page: FibelPage,
    request: Request,
    context: FibelContext,
  ) => string | Response | Promise<string | Response>;
  getTheme: (request: Request, context: FibelContext) => ThemeMode;
  search: (
    query: string,
    locale: string,
    context: FibelContext,
    collection?: string,
  ) => SearchEntry[];
};

export type FibelContext = {
  config: ResolvedFibelConfig;
  pages: FibelPage[];
  nav: Map<string, NavSection[]>;
  footerItems: string[];
  headTags: HeadTag[];
  bodyItems: BodyItem[];
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
