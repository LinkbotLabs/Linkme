const cache = {
  timestamp: 0,
  data: null,
  fetching: false
};

const ONE_DAY = 1000 * 60 * 60 * 24;

/* ---------------- CATEGORY SEARCHES ---------------- */

const categorySearches = {

  general: [
    "viral baby products 2026",
    "tiktok baby finds",
    "newborn must haves",
    "amazon baby gadgets",
    "viral nursery products"
  ],

  sleep: [
    "baby sleep products",
    "baby sound machine",
    "baby night light",
    "baby swaddle",
    "white noise machine baby",
    "baby bassinet",
    "baby sleep soother"
  ],

  feeding: [
    "baby feeding products",
    "baby bottle",
    "formula dispenser",
    "silicone baby feeding set",
    "baby bib",
    "sippy cup baby"
  ],

  toys: [
    "baby toys",
    "montessori baby toys",
    "sensory baby toys",
    "educational baby toys",
    "baby play gym",
    "baby teether toys"
  ],

  travel: [
    "baby travel gear",
    "portable baby products",
    "baby stroller accessories",
    "travel diaper bag",
    "baby carrier",
    "portable baby bed"
  ]
};

/* ---------------- CATEGORY FILTERS ---------------- */

const categoryFilters = {

  sleep: [
    "sleep",
    "bassinet",
    "crib",
    "swaddle",
    "white noise",
    "sound machine",
    "night light",
    "sleeping",
    "baby monitor",
    "soother"
  ],

  feeding: [
    "feeding",
    "bottle",
    "formula",
    "bib",
    "sippy",
    "milk",
    "breast",
    "baby food",
    "high chair",
    "silicone"
  ],

  toys: [
    "toy",
    "montessori",
    "sensory",
    "learning",
    "educational",
    "activity",
    "play",
    "teether",
    "blocks",
    "play gym"
  ],

  travel: [
    "travel",
    "stroller",
    "carrier",
    "portable",
    "diaper bag",
    "car seat",
    "backseat",
    "foldable",
    "on the go"
  ]
};

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
    .replace(/Amazon\.com:?/gi, "")
    .replace(/- Amazon\.com/gi, "")
    .replace(/\| Amazon/gi, "")
    .replace(/\bAmazon\b/gi, "")
    .replace(/\(.*?\)/g, "")
    .split("|")[0]
    .trim()
    .substring(0, 80);
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

/* ---------------- CATEGORY MATCHER ---------------- */

function matchesCategory(title, category) {

  if (!categoryFilters[category]) {
    return true;
  }

  const lower =
    title.toLowerCase();

  return categoryFilters[category]
    .some(keyword =>
      lower.includes(keyword)
    );
}

/* ---------------- VIRAL SCORE ---------------- */

function getViralScore({
  title,
  image,
  source,
  category
}) {

  const t =
    title.toLowerCase();

  let score = 0;

  if (t.includes("baby")) score += 30;
  if (t.includes("newborn")) score += 25;
  if (t.includes("toddler")) score += 20;
  if (t.includes("viral")) score += 20;
  if (t.includes("tiktok")) score += 20;

  if (
    category &&
    matchesCategory(title, category)
  ) {
    score += 50;
  }

  if (image) {
    score += 20;
  }

  if (source.includes("amazon")) {
    score += 10;
  }

  score += Math.random() * 10;

  return score;
}

/* ---------------- API HANDLER ---------------- */

export default async function handler(req, res) {

  res.setHeader(
    "Cache-Control",
    "s-maxage=86400, stale-while-revalidate"
  );

  const now = Date.now();

  const category =
    (req.query.category || "general")
    .toLowerCase();

  const cacheKey =
    `baby-${category}`;

  if (!cache[cacheKey]) {

    cache[cacheKey] = {
      timestamp: 0,
      data: null
    };
  }

  /* ---------------- USE CACHE ---------------- */

  if (
    cache[cacheKey].data &&
    now - cache[cacheKey].timestamp < ONE_DAY
  ) {

    return res.status(200).json({
      products: cache[cacheKey].data
    });
  }

  if (cache.fetching) {

    return res.status(200).json({
      products:
        cache[cacheKey].data || []
    });
  }

  try {

    cache.fetching = true;

    const searches =
      categorySearches[category] ||
      categorySearches.general;

    const discovered = [];

    const seenASIN =
      new Set();

    /* ---------------- SEARCH LOOP ---------------- */

    for (const keyword of searches) {

      const query = `
        ${keyword}
        site:amazon.com
        -book
        -manual
        -guide
      `
      .replace(/\s+/g, " ")
      .trim();

      const googleRes =
        await fetch(
          `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_KEY}&cx=${process.env.CX_ID}&q=${encodeURIComponent(query)}&num=10`
        );

      const data =
        await googleRes.json();

      if (!data.items) {
        continue;
      }

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

        const title =
          cleanTitle(item.title || "");

        /* ---------------- STRICT CATEGORY FILTER ---------------- */

        if (
          !matchesCategory(
            title,
            category
          )
        ) {
          continue;
        }

        let rawImage =
          item.pagemap?.cse_image?.[0]?.src ||
          item.pagemap?.cse_thumbnail?.[0]?.src;

        const image =
          cleanAmazonImage(rawImage);

        if (!image) {
          continue;
        }

        if (
          !image.includes("images/I/")
        ) {
          continue;
        }

        const description =
          item.snippet ||
          "Trending baby product parents are loving right now.";

        const score =
          getViralScore({
            title,
            image,
            source: link,
            category
          });

        if (score < 50) {
          continue;
        }

        discovered.push({

          id: asin,

          title,

          description:
            description.substring(0, 160),

          image,

          link:
            `https://www.amazon.com/dp/${asin}`,

          score

        });

        seenASIN.add(asin);

        if (
          discovered.length >= 40
        ) {
          break;
        }
      }

      if (
        discovered.length >= 40
      ) {
        break;
      }
    }

    /* ---------------- SORT ---------------- */

    const finalProducts =
      discovered
        .sort((a, b) =>
          b.score - a.score
        )
        .slice(0, 24);

    /* ---------------- SAVE CACHE ---------------- */

    cache[cacheKey].timestamp =
      now;

    cache[cacheKey].data =
      finalProducts;

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
