---
title: A hidden page
navTitle: Hidden page
section: Meta
order: 90
hidden: true
description: Demonstrates what frontmatter hidden does, by being hidden itself.
tags: [frontmatter]
updated: 2026-07-25
---

# A hidden page

This page is reachable only through a direct link. It does not appear in the sidebar, the pager, the search index, `llms.txt`, or the sitemap, because its frontmatter declares:

```yaml
hidden: true
```

Its response also carries `<meta name="robots" content="noindex, nofollow">`, so search engines leave it alone.

This is the mechanism for pages that must exist at a stable URL without appearing in navigation: legal notices, deep links from external systems, or drafts that are not ready to be found yet. See [Configuration](/en/configuration) for the rest of the frontmatter fields.
