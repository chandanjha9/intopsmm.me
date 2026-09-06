/**
 * Centralized SEO & Brand Configuration for Intopsmm.
 * Single source of truth for canonical URLs, metadata, contact info, and social links.
 */

export const SITE_CONFIG = {
  brand: "Intopsmm",
  legalName: "Intopsmm Technologies",
  siteUrl: process.env.SITE_URL || "https://intopsmm.me",
  email: "intopsmm.me@gmail.com",
  supportPhone: "+91 94724 84052",
  whatsappLink: "https://wa.me/919472484052",
  tagline: "Cheapest & Fastest SMM Panel Services",
  defaultDescription:
    "Intopsmm is India's #1 fastest & cheapest SMM panel for creators, agencies, and resellers. Boost followers, views, likes, and watch time across Instagram, YouTube, Telegram & TikTok with instant automated delivery.",
  social: {
    instagram: "https://instagram.com/intopsmm.me",
    youtube: "https://www.youtube.com/channel/UCMcQJiSFGJ-YiE3OyA3FpiA",
  },
  defaultOgImage: "/favicon.png",
  locale: "en_IN",
} as const;

/**
 * Helper to construct absolute canonical URLs on the preferred domain.
 */
export function absoluteUrl(path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_CONFIG.siteUrl}${cleanPath}`;
}

/**
 * Standard SEO Metadata Generator for pages.
 */
export function generatePageMeta({
  title,
  description,
  path = "",
  type = "website",
  image,
  noIndex = false,
}: {
  title: string;
  description: string;
  path?: string;
  type?: "website" | "article";
  image?: string;
  noIndex?: boolean;
}) {
  const canonical = absoluteUrl(path);
  const ogImage = image ? (image.startsWith("http") ? image : absoluteUrl(image)) : absoluteUrl(SITE_CONFIG.defaultOgImage);
  const fullTitle = title.includes(SITE_CONFIG.brand) ? title : `${title} | ${SITE_CONFIG.brand}`;

  const metaList: Array<Record<string, string>> = [
    { title: fullTitle },
    { name: "description", content: description },
    { name: "robots", content: noIndex ? "noindex, nofollow" : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" },
    { property: "og:title", content: fullTitle },
    { property: "og:description", content: description },
    { property: "og:type", content: type },
    { property: "og:url", content: canonical },
    { property: "og:image", content: ogImage },
    { property: "og:site_name", content: SITE_CONFIG.brand },
    { property: "og:locale", content: SITE_CONFIG.locale },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: fullTitle },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: ogImage },
  ];

  const linksList = [{ rel: "canonical", href: canonical }];

  return { meta: metaList, links: linksList };
}
