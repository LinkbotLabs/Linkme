const cache = {
  timestamp: 0,
  data: null,
  fetching: false
};

const ONE_DAY = 1000 * 60 * 60 * 24;

/* ---------------- KEYWORD ENGINE ---------------- */
const intents = [
  "trending", "viral", "best seller", "must have",
  "hidden gems", "problem solving", "weird", "aesthetic", "smart",
  "luxury", "minimalist", "space saving", "portable", "high tech"
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

          if (!asin) continue;
          if (seenASIN.has(asin)) continue;

          const image =
            item.pagemap?.cse_image?.[0]?.src ||
            item.pagemap?.cse_thumbnail?.[0]?.src;

          if (!image) continue;

          const description =
            item.snippet ||
            item.pagemap?.metatags?.[0]?.["og:description"] ||
            "Trending product people are buying right now.";

          const cleanLink = `https://www.amazon.com/dp/${asin}`;

          discovered.push({
            id: asin,
            title: cleanTitle(item.title),
            description: description.substring(0, 140),
            image,
            link: cleanLink,

            // SIMPLE AUTO SCORE (no frontend needed)
            score: Math.random() * 5 + Date.now() / 100000000000
          });

          seenASIN.add(asin);

          if (discovered.length >= 60) break;
        }

        if (discovered.length >= 60) break;
      }

      if (discovered.length >= 60) break;
    }

    /* ---------------- MERGE ---------------- */

    const DAILY_LIMIT = 30;

    let existing = cache.data || [];

    const merged = [...existing, ...discovered];

    const unique = [];
    const seen = new Set();

    for (const p of merged) {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        unique.push(p);
      }
    }

    /* ---------------- SORT (VIRAL STYLE) ---------------- */

    const sorted = unique.sort((a, b) => b.score - a.score);

    /* ---------------- ROTATION ---------------- */

    const ROTATION = 0.4;

    const keepCount = Math.floor(existing.length * (1 - ROTATION));
    const newCount = DAILY_LIMIT - keepCount;

    const MAX_POOL = 90; // 3 days worth

let pool = [...existing, ...sorted];

// remove duplicates
const uniquePool = [];
const seenIds = new Set();

for (const p of pool) {
  if (!seenIds.has(p.id)) {
    seenIds.add(p.id);
    uniquePool.push(p);
  }
}

// limit total pool size
const trimmedPool = uniquePool.slice(0, MAX_POOL);

// final display (top 30)
const finalProducts = trimmedPool.slice(0, DAILY_LIMIT);
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
    .replace("- Amazon.com", "")
    .replace("| Amazon", "")
    .split("|")[0]
    .substring(0, 80)
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
