/** One `BreadcrumbList` entry for a public page one level below the
 * homepage — every route using this is genuinely one click from "/", so
 * a two-item list (Solventia > This Page) is honestly what the site's
 * structure is, not an invented hierarchy. */
export function breadcrumbJsonLd(pageName: string, path: string, siteUrl: string) {
  const base = siteUrl.replace(/\/$/, "");
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Solventia", item: `${base}/` },
      { "@type": "ListItem", position: 2, name: pageName, item: `${base}${path}` },
    ],
  };
}
