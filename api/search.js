const cache = {
  timestamp: 0,
  data: null,
  fetching: false
};

const ONE_DAY = 1000 * 60 * 60 * 24;

/* ---------------- KEYWORD ENGINE ---------------- */

const intents = [
  "trending", "viral", "best seller", "must have",
  "hidden gems", "problem solving", "weird", "aesthetic",
  "smart", "portable", "high tech"
];

const categories = [
  "kitchen gadgets", "home gadgets", "tech gadgets",
  "beauty products", "car accessories", "travel gadgets",
  "desk gadgets", "cleaning tools", "organization tools",
  "bedroom gadgets", "bathroom gadgets",
  "pet gadgets", "baby products", "fitness gadgets", "outdoor gear"
];

const platforms = [
  "", "tiktok", "amazon", "tiktok made me buy it", "viral finds"
];

function generateKeywords(count = 4) {
  const combos = [];

  for (const i of intents) {
    for (const c of categories) {
      for (const p of platforms) {
        combos.push(`${p} ${i} ${c} 2026`.trim());
      }
    }
  }

  return combos.sort(() => 0.5 - Math.random()).slice(0, count);
}

/* ---------------- IMAGE CLEANER ---------------- */

function cleanAmazonImage(url) {
  if (!url) return null;

  try {
    // strip everything after .jpg
    const clean = url.split(".jpg")[0] + ".jpg";

    // reject garbage / overlays
    if (
      clean.includes("aplus-media") ||
      clean.includes("PIBSS") ||
      clean.includes("awareness") ||
      clean.includes("deal") ||
      clean.includes("sprite") ||
      clean.includes("icon")
    ) return null;

    return clean;

  } catch {
    return null;
  }
}

/* ---------------- VIRAL SCORE ENGINE ---------------- */

function getViralScore({ title, image, source }) {
  const t = title.toLowerCase();

  let score = 0;

  if (t.includes("tiktok")) score += 40;
  if (t.includes("viral")) score += 40;
  if (t.includes("must have")) score += 25;
  if (t.includes("amazon find")) score += 20;
  if (t.includes("gadgets")) score += 15;
  if (t.includes("smart")) score += 10;
  if (t.includes("portable")) score += 10;

  if (image) score += 25;
  else score -= 50;

  if (source.includes("tiktok")) score += 25;
  if (source.includes("pinterest")) score += 15;
  if (source.includes("amazon")) score += 10;

  score += Math.random() * 15;

  return score;
}

/* ---------------- HANDLER ---------------- */

export default async function handler(req, res) {

  res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate");

  const now = Date.now();

  if (cache.data && now - cache.timestamp < ONE_DAY) {
    return res.status(200).json({ products: cache.data });
  }

  if (cache.fetching) {
    return res.status(200).json({ products: cache.data || [] });
  }

  try {

    cache.fetching = true;

    const shuffledKeywords = generateKeywords(4);

    const discovered = [];
    const seenASIN = new Set();

    for (const keyword of shuffledKeywords) {

      const query = `${keyword} (site:amazon.com OR site:pinterest.com OR site:tiktok.com) -book -kindle`;

      const starts = Math.random() > 0.5 ? [1, 11] : [1];

      for (const start of starts) {

        const googleRes = await fetch(
          `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_KEY}&cx=${process.env.CX_ID}&q=${encodeURIComponent(query)}&num=10&start=${start}`
        );

        const data = await googleRes.json();
        if (!data.items) continue;

        for (const item of data.items) {

          const link = item.link || "";
          const asin = extractASIN(link);
          if (!asin || seenASIN.has(asin)) continue;

          let rawImage =
            item.pagemap?.cse_image?.[0]?.src ||
            item.pagemap?.cse_thumbnail?.[0]?.src;

          const image = cleanAmazonImage(rawImage);

          // ❌ HARD FILTERS
          if (!image) continue;
          if (!image.includes("images/I/")) continue;
          if (!item.title || item.title.length < 25) continue;

          const lowerTitle = item.title.toLowerCase();

          if (
            lowerTitle.includes("book") ||
            lowerTitle.includes("manual") ||
            lowerTitle.includes("guide")
          ) continue;

          // ❌ REMOVE BORING LOW-VIRAL ITEMS
          const badWords = ["organizer", "storage", "tray", "case"];
          if (badWords.some(w => lowerTitle.includes(w))) continue;

          const description =
            item.snippet ||
            item.pagemap?.metatags?.[0]?.["og:description"] ||
            "Trending product people are buying right now.";

          const cleanLink = `https://www.amazon.com/dp/${asin}`;

          const score = getViralScore({
            title: item.title,
            image,
            source: link
          });

          if (score < 40) continue;

          discovered.push({
            id: asin,
            title: cleanTitle(item.title),
            description: description.substring(0, 140),
            image,
            link: cleanLink,
            score
          });

          seenASIN.add(asin);

          if (discovered.length >= 60) break;
        }

        if (discovered.length >= 60) break;
      }

      if (discovered.length >= 60) break;
    }

    /* ---------------- MERGE + DEDUPE ---------------- */

    const DAILY_LIMIT = 30;
    const MAX_POOL = 90;

    let existing = cache.data || [];
    let pool = [...existing, ...discovered];

    const uniquePool = [];
    const seenIds = new Set();

    for (const p of pool) {
      if (!seenIds.has(p.id)) {
        seenIds.add(p.id);
        uniquePool.push(p);
      }
    }

    /* ---------------- SORT ---------------- */

    const sortedPool = uniquePool.sort((a, b) => b.score - a.score);

    const trimmedPool = sortedPool.slice(0, MAX_POOL);

    /* ---------------- SMART DISPLAY ---------------- */

    const top = trimmedPool.slice(0, 50);
    const finalProducts = [];

    while (finalProducts.length < DAILY_LIMIT && top.length > 0) {
      const pickIndex = Math.floor(Math.random() * Math.min(10, top.length));
      const pick = top.splice(pickIndex, 1)[0];
      finalProducts.push(pick);
    }

    /* ---------------- SAVE CACHE ---------------- */

    cache.timestamp = now;
    cache.data = finalProducts;
    cache.fetching = false;

    return res.status(200).json({ products: finalProducts });

  } catch (error) {

    cache.fetching = false;

    return res.status(500).json({
      error: "Search failed",
      details: error.message
    });

  }
}

/* ---------------- HELPERS ---------------- */

function cleanTitle(title) {
  return title
    .replace("Amazon.com:", "")
    .replace("- Amazon.com", "")
    .replace("| Amazon", "")
    .replace(/\bAmazon\b/gi, "")
    .split("|")[0]
    .substring(0, 70)
    .trim();
}

function extractASIN(url) {
  try {
    const parsed = new URL(url);

    const dpMatch = parsed.pathname.match(/\/dp\/([A-Z0-9]{10})/);
    const gpMatch = parsed.pathname.match(/\/gp\/product\/([A-Z0-9]{10})/);

    return dpMatch?.[1] || gpMatch?.[1] || null;

  } catch {
    return null;
  }
}
