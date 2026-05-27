const cache = {
  timestamp: 0,
  data: null,
  fetching: false
};

const ONE_DAY = 1000 * 60 * 60 * 24;

/* ---------------- BABY KEYWORD ENGINE ---------------- */

const intents = [
  "trending",
  "viral",
  "best seller",
  "must have",
  "tiktok made me buy it",
  "smart",
  "portable",
  "aesthetic",
  "mom approved",
  "parent favorite"
];

const categories = [
  "baby products",
  "newborn essentials",
  "baby feeding",
  "baby sleep",
  "baby toys",
  "baby travel gear",
  "diaper bag",
  "baby stroller",
  "nursery products",
  "postpartum essentials",
  "toddler products",
  "mom products",
  "baby gadgets",
  "baby accessories"
];

const platforms = [
  "",
  "tiktok",
  "amazon",
  "viral finds",
  "tiktok mom finds"
];

function generateKeywords(count = 5) {

  const combos = [];

  for (const i of intents) {
    for (const c of categories) {
      for (const p of platforms) {

        combos.push(
          `${p} ${i} ${c} 2026`.trim()
        );

      }
    }
  }

  return combos
    .sort(() => 0.5 - Math.random())
    .slice(0, count);
}

/* ---------------- IMAGE CLEANER ---------------- */

function cleanAmazonImage(url) {

  if (!url) return null;

  try {

    const clean =
      url.split(".jpg")[0] + ".jpg";

    if (
      clean.includes("aplus-media") ||
      clean.includes("PIBSS") ||
      clean.includes("awareness") ||
      clean.includes("deal") ||
      clean.includes("sprite") ||
      clean.includes("icon")
    ) {
      return null;
    }

    return clean;

  } catch {

    return null;
  }
}

/* ---------------- TITLE CLEANER ---------------- */

function cleanTitle(title) {

  if (!title) return "Trending Baby Product";

  return title
    .replace("Amazon.com:", "")
    .replace("- Amazon.com", "")
    .replace("| Amazon", "")
    .replace(/\bAmazon\b/gi, "")
    .split("|")[0]
    .substring(0, 80)
    .trim();
}

/* ---------------- ASIN EXTRACTOR ---------------- */

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

/* ---------------- VIRAL SCORE ---------------- */

function getViralScore({
  title,
  image,
  source
}) {

  const t = title.toLowerCase();

  let score = 0;

  if (t.includes("baby")) score += 40;
  if (t.includes("newborn")) score += 35;
  if (t.includes("toddler")) score += 25;
  if (t.includes("mom")) score += 20;
  if (t.includes("nursery")) score += 20;
  if (t.includes("feeding")) score += 20;
  if (t.includes("stroller")) score += 20;
  if (t.includes("viral")) score += 25;
  if (t.includes("tiktok")) score += 25;

  if (image) {
    score += 25;
  } else {
    score -= 50;
  }

  if (source.includes("tiktok")) score += 20;
  if (source.includes("pinterest")) score += 15;
  if (source.includes("amazon")) score += 10;

  score += Math.random() * 15;

  return score;
}

/* ---------------- API HANDLER ---------------- */

export default async function handler(req, res) {

  res.setHeader(
    "Cache-Control",
    "s-maxage=86400, stale-while-revalidate"
  );

  const now = Date.now();

  /* ---------------- USE CACHE ---------------- */

  if (
    cache.data &&
    cache.data.length > 0 &&
    now - cache.timestamp < ONE_DAY
  ) {

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

    const keywords =
      generateKeywords(5);

    const discovered = [];
    const seenASIN = new Set();

    /* ---------------- SEARCH LOOP ---------------- */

    for (const keyword of keywords) {

      const query = `
        ${keyword}
        (site:amazon.com OR site:pinterest.com OR site:tiktok.com)
        -book
        -manual
        -guide
      `.replace(/\s+/g, " ").trim();

      const starts =
        Math.random() > 0.5
          ? [1, 11]
          : [1];

      for (const start of starts) {

        const googleRes = await fetch(
          `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_KEY}&cx=${process.env.CX_ID}&q=${encodeURIComponent(query)}&num=10&start=${start}`
        );

        const data =
          await googleRes.json();

        if (!data.items) continue;

        for (const item of data.items) {

          const link =
            item.link || "";

          const asin =
            extractASIN(link);

          if (
            !asin ||
            seenASIN.has(asin)
          ) {
            continue;
          }

          const lowerTitle =
            (item.title || "").toLowerCase();

          /* ---------------- FILTERS ---------------- */

          if (
            lowerTitle.includes("book") ||
            lowerTitle.includes("manual") ||
            lowerTitle.includes("guide")
          ) {
            continue;
          }

          let rawImage =
            item.pagemap?.cse_image?.[0]?.src ||
            item.pagemap?.cse_thumbnail?.[0]?.src;

          const image =
            cleanAmazonImage(rawImage);

          if (!image) continue;

          if (
            !image.includes("images/I/")
          ) {
            continue;
          }

          const description =
            item.snippet ||
            item.pagemap?.metatags?.[0]?.["og:description"] ||
            "Trending baby product parents are loving right now.";

          const score =
            getViralScore({
              title: item.title || "",
              image,
              source: link
            });

          if (score < 40) {
            continue;
          }

          discovered.push({

            id: asin,

            title: cleanTitle(
              item.title
            ),

            description:
              description.substring(0, 160),

            image,

            link:
              `https://www.amazon.com/dp/${asin}`,

            score

          });

          seenASIN.add(asin);

          if (
            discovered.length >= 60
          ) {
            break;
          }
        }

        if (
          discovered.length >= 60
        ) {
          break;
        }
      }

      if (
        discovered.length >= 60
      ) {
        break;
      }
    }

    console.log(
      "DISCOVERED PRODUCTS:",
      discovered.length
    );

    /* ---------------- DEDUPE ---------------- */

    const existing =
      cache.data || [];

    const pool = [
      ...existing,
      ...discovered
    ];

    const uniquePool = [];
    const seenIds = new Set();

    for (const p of pool) {

      if (
        !seenIds.has(p.id)
      ) {

        seenIds.add(p.id);

        uniquePool.push(p);
      }
    }

    /* ---------------- SORT ---------------- */

    const sortedPool =
      uniquePool.sort(
        (a, b) => b.score - a.score
      );

    const trimmedPool =
      sortedPool.slice(0, 90);

    /* ---------------- SMART RANDOM ---------------- */

    const top =
      trimmedPool.slice(0, 50);

    const finalProducts = [];

    while (
      finalProducts.length < 30 &&
      top.length > 0
    ) {

      const pickIndex =
        Math.floor(
          Math.random() *
          Math.min(10, top.length)
        );

      const pick =
        top.splice(pickIndex, 1)[0];

      finalProducts.push(pick);
    }

    console.log(
      "FINAL PRODUCTS:",
      finalProducts.length
    );

    /* ---------------- SAVE CACHE ---------------- */

    if (
      finalProducts.length > 0
    ) {

      cache.timestamp = now;

      cache.data = finalProducts;
    }

    cache.fetching = false;

    return res.status(200).json({
      products: finalProducts
    });

  } catch (error) {

    cache.fetching = false;

    console.error(error);

    return res.status(500).json({

      error: "Search failed",

      details: error.message

    });
  }
}
