const cache = {
  timestamp: 0,
  data: null,
  fetching: false
};

const ONE_DAY = 1000 * 60 * 60 * 24;

/* =========================================================
   BABY NICHE KEYWORD ENGINE
========================================================= */

const intents = [
  "viral",
  "trending",
  "must have",
  "best seller",
  "tiktok made me buy it",
  "mom favorite",
  "parenting hack",
  "amazon find"
];

const categories = [
  "baby products",
  "newborn essentials",
  "baby sleep products",
  "baby travel gear",
  "baby feeding products",
  "postpartum essentials",
  "baby safety products",
  "toddler products",
  "baby gadgets",
  "mom hacks"
];

const platforms = [
  "",
  "amazon",
  "tiktok",
  "viral finds",
  "tiktok amazon finds"
];

function generateKeywords(count = 5) {
  const combos = [];

  for (const intent of intents) {
    for (const category of categories) {
      for (const platform of platforms) {
        combos.push(
          `${platform} ${intent} ${category} 2026`.trim()
        );
      }
    }
  }

  return combos
    .sort(() => 0.5 - Math.random())
    .slice(0, count);
}

/* =========================================================
   IMAGE CLEANER
========================================================= */

function cleanAmazonImage(url) {
  if (!url) return null;

  try {
    const clean = url.split(".jpg")[0] + ".jpg";

    const blocked = [
      "sprite",
      "icon",
      "logo",
      "awareness",
      "deal",
      "aplus-media",
      "PIBSS"
    ];

    if (blocked.some(word => clean.includes(word))) {
      return null;
    }

    return clean;

  } catch {
    return null;
  }
}

/* =========================================================
   BABY PRODUCT SCORE ENGINE
========================================================= */

function getViralScore({ title, image, source }) {

  const t = title.toLowerCase();

  let score = 0;

  /* ---------------- TITLE SIGNALS ---------------- */

  const strongSignals = [
    "baby",
    "newborn",
    "toddler",
    "mom",
    "infant",
    "feeding",
    "sleep",
    "travel",
    "portable",
    "smart",
    "safe",
    "must have",
    "viral",
    "tiktok"
  ];

  for (const word of strongSignals) {
    if (t.includes(word)) score += 12;
  }

  /* ---------------- EMOTIONAL / BUYER WORDS ---------------- */

  const buyerWords = [
    "essential",
    "favorite",
    "best seller",
    "hack",
    "life saver",
    "easy",
    "adjustable",
    "foldable",
    "compact"
  ];

  for (const word of buyerWords) {
    if (t.includes(word)) score += 10;
  }

  /* ---------------- IMAGE ---------------- */

  if (image) score += 25;
  else score -= 60;

  /* ---------------- SOURCE QUALITY ---------------- */

  if (source.includes("amazon")) score += 20;
  if (source.includes("tiktok")) score += 20;
  if (source.includes("pinterest")) score += 10;

  /* ---------------- RANDOMNESS ---------------- */

  score += Math.random() * 10;

  return score;
}

/* =========================================================
   MAIN HANDLER
========================================================= */

export default async function handler(req, res) {

  res.setHeader(
    "Cache-Control",
    "s-maxage=86400, stale-while-revalidate"
  );

  const now = Date.now();

  /* ---------------- CACHE ---------------- */

  if (cache.data && now - cache.timestamp < ONE_DAY) {
    return res.status(200).json({
      products: cache.data
    });
  }

  if (cache.fetching) {
    return res.status(200).json({
      products: cache.data || []
    });
  }

  try {

    cache.fetching = true;

    const keywords = generateKeywords(5);

    const discovered = [];
    const seenASIN = new Set();

    /* =========================================================
       SEARCH LOOP
    ========================================================= */

    for (const keyword of keywords) {

      const query = `
        ${keyword}
        (site:amazon.com OR site:tiktok.com OR site:pinterest.com)
        -book
        -kindle
      `.replace(/\s+/g, " ").trim();

      const googleRes = await fetch(
        `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_KEY}&cx=${process.env.CX_ID}&q=${encodeURIComponent(query)}&num=10`
      );

      const data = await googleRes.json();

      if (!data.items) continue;

      for (const item of data.items) {

        const link = item.link || "";

        const asin = extractASIN(link);

        if (!asin || seenASIN.has(asin)) {
          continue;
        }

        /* ---------------- IMAGE ---------------- */

        const rawImage =
          item.pagemap?.cse_image?.[0]?.src ||
          item.pagemap?.cse_thumbnail?.[0]?.src;

        const image = cleanAmazonImage(rawImage);

        if (!image) continue;

        if (!image.includes("images/I/")) continue;

        /* ---------------- TITLE ---------------- */

        const title = item.title || "";

        if (title.length < 20) continue;

        const lowerTitle = title.toLowerCase();

        /* ---------------- FILTER BAD STUFF ---------------- */

        const blockedWords = [
          "book",
          "manual",
          "guide",
          "replacement",
          "parts",
          "cover",
          "refill",
          "used"
        ];

        if (
          blockedWords.some(word =>
            lowerTitle.includes(word)
          )
        ) {
          continue;
        }

        /* ---------------- DESCRIPTION ---------------- */

        const description =
          item.snippet ||
          item.pagemap?.metatags?.[0]?.["og:description"] ||
          "Trending baby product parents are loving right now.";

        /* ---------------- AMAZON LINK ---------------- */

        const cleanLink = `https://www.amazon.com/dp/${asin}`;

        /* ---------------- SCORE ---------------- */

        const score = getViralScore({
          title,
          image,
          source: link
        });

        if (score < 45) continue;

        /* ---------------- SAVE ---------------- */

        discovered.push({
          id: asin,
          title: cleanTitle(title),
          description: description.substring(0, 140),
          image,
          link: cleanLink,
          score
        });

        seenASIN.add(asin);

        if (discovered.length >= 50) {
          break;
        }
      }

      if (discovered.length >= 50) {
        break;
      }
    }

    /* =========================================================
       DEDUPE + SORT
    ========================================================= */

    const existing = cache.data || [];

    const combined = [...existing, ...discovered];

    const unique = [];
    const seen = new Set();

    for (const item of combined) {

      if (!seen.has(item.id)) {

        seen.add(item.id);

        unique.push(item);
      }
    }

    const sorted = unique.sort(
      (a, b) => b.score - a.score
    );

    /* =========================================================
       SMART DAILY MIX
    ========================================================= */

    const DAILY_LIMIT = 30;

    const topPool = sorted.slice(0, 40);

    const finalProducts = [];

    while (
      finalProducts.length < DAILY_LIMIT &&
      topPool.length > 0
    ) {

      const randomIndex = Math.floor(
        Math.random() * Math.min(8, topPool.length)
      );

      const picked = topPool.splice(randomIndex, 1)[0];

      finalProducts.push(picked);
    }

    /* =========================================================
       SAVE CACHE
    ========================================================= */

    cache.timestamp = now;
    cache.data = finalProducts;
    cache.fetching = false;

    return res.status(200).json({
      products: finalProducts
    });

  } catch (error) {

    cache.fetching = false;

    return res.status(500).json({
      error: "Baby product search failed",
      details: error.message
    });
  }
}

/* =========================================================
   HELPERS
========================================================= */

function cleanTitle(title) {

  return title
    .replace("Amazon.com:", "")
    .replace("- Amazon.com", "")
    .replace("| Amazon", "")
    .replace(/\bAmazon\b/gi, "")
    .split("|")[0]
    .substring(0, 80)
    .trim();
}

function extractASIN(url) {

  try {

    const parsed = new URL(url);

    const dpMatch =
      parsed.pathname.match(/\/dp\/([A-Z0-9]{10})/);

    const gpMatch =
      parsed.pathname.match(/\/gp\/product\/([A-Z0-9]{10})/);

    return (
      dpMatch?.[1] ||
      gpMatch?.[1] ||
      null
    );

  } catch {

    return null;
  }
}
