import { SITE_CONFIG, absoluteUrl } from "./site-config";

/**
 * Organization Schema (E-E-A-T trust signals)
 */
export function getOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_CONFIG.brand,
    url: SITE_CONFIG.siteUrl,
    logo: absoluteUrl("/favicon.png"),
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      telephone: SITE_CONFIG.supportPhone,
      email: SITE_CONFIG.email,
      availableLanguage: ["English", "Hindi"],
    },
    sameAs: [SITE_CONFIG.social.instagram, SITE_CONFIG.social.youtube],
  };
}

/**
 * WebSite Schema with SearchAction
 */
export function getWebSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_CONFIG.brand,
    url: SITE_CONFIG.siteUrl,
    description: SITE_CONFIG.defaultDescription,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_CONFIG.siteUrl}/services?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * BreadcrumbList Schema for Google SERP rich snippets
 */
export function getBreadcrumbSchema(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/**
 * FAQPage Schema (Matches visible FAQs exactly)
 */
export function getFaqSchema(faqs: Array<{ q: string; a: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a,
      },
    })),
  };
}

/**
 * Service Schema for SMM services & platform categories
 */
export function getServiceSchema({
  name,
  description,
  path,
  minPrice,
  currency = "INR",
}: {
  name: string;
  description: string;
  path: string;
  minPrice?: number;
  currency?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    description,
    url: absoluteUrl(path),
    provider: {
      "@type": "Organization",
      name: SITE_CONFIG.brand,
      url: SITE_CONFIG.siteUrl,
    },
    areaServed: "Worldwide",
    ...(minPrice !== undefined && {
      offers: {
        "@type": "Offer",
        price: minPrice.toFixed(4),
        priceCurrency: currency,
        availability: "https://schema.org/InStock",
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: minPrice.toFixed(4),
          priceCurrency: currency,
          unitText: "per 1000 units",
        },
      },
    }),
  };
}

/**
 * Article Schema for Blog posts
 */
export function getArticleSchema({
  title,
  description,
  path,
  coverImage,
  author = "Intopsmm Editorial Team",
  datePublished,
  dateModified,
}: {
  title: string;
  description: string;
  path: string;
  coverImage?: string;
  author?: string;
  datePublished: string;
  dateModified?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    url: absoluteUrl(path),
    image: coverImage ? absoluteUrl(coverImage) : absoluteUrl("/og-image.jpg"),
    author: {
      "@type": "Person",
      name: author,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_CONFIG.brand,
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl("/favicon.png"),
      },
    },
    datePublished,
    dateModified: dateModified || datePublished,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": absoluteUrl(path),
    },
  };
}
