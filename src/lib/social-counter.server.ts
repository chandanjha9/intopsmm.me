/**
 * Real-time Social Media Live Counter & Link Scraper
 * Extracts live likes, followers, views, and subscribers from public links:
 * - Instagram Posts / Reels (Live Likes)
 * - Instagram Profiles (Live Followers)
 * - YouTube Videos (Live Views)
 * - Telegram Channels (Live Subscribers)
 */

function parseCompactNumber(str: string): number | null {
  if (!str) return null;
  const clean = str.replace(/,/g, "").trim();
  const lower = clean.toLowerCase();

  const multiplier = lower.endsWith("m")
    ? 1_000_000
    : lower.endsWith("k")
    ? 1_000
    : lower.endsWith("b")
    ? 1_000_000_000
    : 1;

  const numPart = parseFloat(lower.replace(/[mkb]/g, ""));
  if (isNaN(numPart)) return null;
  return Math.round(numPart * multiplier);
}

/**
 * Extracts Instagram shortcode from URLs like:
 * - https://www.instagram.com/p/DXQDXZmDfML/
 * - https://www.instagram.com/reel/DXQDXZmDfML/
 * - https://instagram.com/p/DXQDXZmDfML?igsi=...
 */
function extractInstagramShortcode(url: string): string | null {
  const match = url.match(/instagram\.com\/(?:p|reel|tv)\/([a-zA-Z0-9_-]+)/i);
  return match ? match[1] : null;
}

/**
 * Extracts Instagram username from profile URLs like:
 * - https://www.instagram.com/cristiano/
 */
function extractInstagramUsername(url: string): string | null {
  const match = url.match(/instagram\.com\/([a-zA-Z0-9._]+)(?:\/|\?|$)/i);
  if (!match) return null;
  const val = match[1];
  if (["p", "reel", "tv", "stories", "explore", "reels", "direct"].includes(val.toLowerCase())) {
    return null;
  }
  return val;
}

/**
 * Live Scraper for Instagram Post / Reel Likes
 */
async function scrapeInstagramPostLikes(shortcode: string): Promise<number | null> {
  const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`;
  try {
    const res = await fetch(embedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) return null;
    const html = await res.text();

    // Pattern 1: edge_liked_by\":{\"count\":5051
    const match1 = html.match(/edge_liked_by\\*":\s*\{\\*"count\\*":\s*(\d+)/);
    if (match1) return Number(match1[1]);

    // Pattern 2: edge_media_preview_like\":{\"count\":5051
    const match2 = html.match(/edge_media_preview_like\\*":\s*\{\\*"count\\*":\s*(\d+)/);
    if (match2) return Number(match2[1]);

    // Pattern 3: class="likeCountClick">5,051 likes
    const match3 = html.match(/class=["']likeCountClick["'][^>]*>([\d,.]+)/i);
    if (match3) return Number(match3[1].replace(/,/g, ""));

    return null;
  } catch (err) {
    console.warn("Instagram post like scrape failed:", err);
    return null;
  }
}

/**
 * Live Scraper for Instagram Profile Followers
 */
async function scrapeInstagramProfileFollowers(username: string): Promise<number | null> {
  const url = `https://www.instagram.com/${username}/`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) return null;
    const html = await res.text();

    // Look for meta description: "127 Followers, 145 Following..."
    const metaDesc = html.match(/<meta[^>]+(?:description|og:description)[^>]+content=["']([^"']+)["']/i);
    if (metaDesc) {
      const followerMatch = metaDesc[1].match(/([\d,.]+[KkMmBb]?)\s*Followers/i);
      if (followerMatch) {
        return parseCompactNumber(followerMatch[1]);
      }
    }

    return null;
  } catch (err) {
    console.warn("Instagram follower scrape failed:", err);
    return null;
  }
}

/**
 * Live Scraper for YouTube Video Views
 */
async function scrapeYouTubeVideoViews(url: string): Promise<number | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) return null;
    const html = await res.text();

    const match = html.match(/"viewCount":\s*"(\d+)"/);
    if (match) return Number(match[1]);

    return null;
  } catch (err) {
    console.warn("YouTube view scrape failed:", err);
    return null;
  }
}

/**
 * Live Scraper for Telegram Channel Subscribers
 */
async function scrapeTelegramSubscribers(url: string): Promise<number | null> {
  try {
    const match = url.match(/t\.me\/(?:s\/)?([a-zA-Z0-9_]+)/i);
    if (!match) return null;
    const channel = match[1];

    const previewUrl = `https://t.me/s/${channel}`;
    const res = await fetch(previewUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) return null;
    const html = await res.text();

    const subMatch = html.match(/class=["']counter_value["']>([^<]+)<\/span>\s*<span class=["']counter_type["']>subscribers/i);
    if (subMatch) {
      return parseCompactNumber(subMatch[1]);
    }

    const memberMatch = html.match(/class=["']counter_value["']>([^<]+)<\/span>\s*<span class=["']counter_type["']>members/i);
    if (memberMatch) {
      return parseCompactNumber(memberMatch[1]);
    }

    return null;
  } catch (err) {
    console.warn("Telegram scrape failed:", err);
    return null;
  }
}

export type LiveSocialCountResult = {
  count: number;
  metric: "likes" | "followers" | "views" | "subscribers" | "count";
  source: string;
};

/**
 * Main dispatcher to automatically inspect a target link and scrape its live count.
 */
export async function fetchLiveSocialCount(
  link: string | undefined | null,
  serviceName?: string
): Promise<LiveSocialCountResult | null> {
  if (!link || typeof link !== "string") return null;
  const cleanLink = link.trim();
  const lowerService = (serviceName || "").toLowerCase();

  try {
    // 1. Instagram Post / Reel (Likes or Views)
    const igShortcode = extractInstagramShortcode(cleanLink);
    if (igShortcode) {
      const likes = await scrapeInstagramPostLikes(igShortcode);
      if (likes !== null) {
        return { count: likes, metric: "likes", source: "Instagram Post Embed" };
      }
    }

    // 2. Instagram Profile (Followers)
    const igUsername = extractInstagramUsername(cleanLink);
    if (igUsername && (lowerService.includes("follower") || !lowerService.includes("like"))) {
      const followers = await scrapeInstagramProfileFollowers(igUsername);
      if (followers !== null) {
        return { count: followers, metric: "followers", source: "Instagram Profile Meta" };
      }
    }

    // 3. YouTube (Views)
    if (cleanLink.includes("youtube.com") || cleanLink.includes("youtu.be")) {
      const views = await scrapeYouTubeVideoViews(cleanLink);
      if (views !== null) {
        return { count: views, metric: "views", source: "YouTube Video Statistics" };
      }
    }

    // 4. Telegram (Subscribers / Members)
    if (cleanLink.includes("t.me")) {
      const subscribers = await scrapeTelegramSubscribers(cleanLink);
      if (subscribers !== null) {
        return { count: subscribers, metric: "subscribers", source: "Telegram Channel Statistics" };
      }
    }
  } catch (err) {
    console.warn("fetchLiveSocialCount overall error:", err);
  }

  return null;
}
