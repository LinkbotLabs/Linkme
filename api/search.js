const cache = {
  timestamp: 0,
  data: null,
  fetching: false
};

const ONE_DAY = 1000 * 60 * 60 * 24;

/* ---------------- KEYWORD ENGINE ---------------- */

const intents = [
  "trending",
  "viral",
  "best seller",
  "must have",
  "hidden gems",
  "problem solving",
  "aesthetic",
  "smart",
  "portable",
  "high tech"
];

const categories = [
  "kitchen gadgets",
  "home gadgets",
  "tech gadgets",
  "beauty products",
  "car accessories",
  "travel gadgets",
  "desk gadgets",
  "cleaning tools",
  "organization tools",
  "bedroom gadgets",
  "bathroom gadgets",
  "pet gadgets",
  "baby products",
  "fitness gadgets",
  "outdoor gear"
];

function generateKeywords(count = 5) {

  const combos = [];

  for (const intent of intents) {

    for (const category of categories) {

      combos.push(
        `${intent} ${category} amazon 2026`
      );

      combos.push(
        `${intent} ${category} tiktok amazon finds`
      );
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

    let clean = url;

    clean = clean.replace(/\._.*_\./, ".");

    clean = clean.split("?")[0];

    const bad = [
      "sprite",
      "icon",
      "logo",
      "loading",
      "spinner",
      "transparent",
      "aplus-media",
      "awareness"
    ];

    if (
      bad.some(word =>
        clean.toLowerCase().includes(word)
      )
    ) {
      return null;
    }

    if (
      !clean.includes(".jpg") &&
      !clean.includes(".jpeg") &&
      !clean.includes(".png") &&
      !clean.includes(".webp")
    ) {
      return null;
    }

    return clean;

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

  const t =
    (title || "").toLowerCase();

  let score = 0;

  if (t.includes("viral")) score += 30;
  if (t.includes("tiktok")) score += 25;
  if (t.includes("must have")) score += 20;
  if (t.includes("gadget")) score += 15;
  if (t.includes("smart")) score += 10;
  if (t.includes("portable")) score += 10;
  if (t.includes("amazon")) score += 10;

  if (image) score += 25;

  if (
    source.includes("amazon.com")
  ) {
    score += 15;
  }

  return score;
}

/* ---------------- HANDLER ---------------- */

export default async function handler(req, res) {

  res.setHeader(
    "Cache-Control",
    "s-maxage=86400, stale-while-revalidate"
  );

  const now = Date.now();

  /* ---------------- RETURN CACHE ---------------- */

  if (
    cache.data &&
    now - cache.timestamp < ONE_DAY
  ) {

    console.log("SERVING CACHE");

    return res.status(200).json({
      products: cache.data
    });
  }

  /* ---------------- PREVENT DUPLICATE FETCHES ---------------- */

  if (cache.fetching) {

    console.log("FETCH IN PROGRESS");

    return res.status(200).json({
      products: cache.data || []
    });
  }

  try {

    cache.fetching = true;

    const keywords =
      generateKeywords(5);

    const discovered = [];

    const seenIds =
      new Set();

    /* ---------------- SEARCH ---------------- */

    for (const keyword of keywords) {

      const query =
        `${keyword} site:amazon.com -book -kindle -manual -pdf`;

      console.log(
        "SEARCH:",
        query
      );

      const googleRes = await fetch(
        `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_KEY}&cx=${process.env.CX_ID}&q=${encodeURIComponent(query)}&num=10`
      );

      const data =
        await googleRes.json();

      if (!data.items) {
        continue;
      }

      for (const item of data.items) {

        try {

          const link =
            item.link || "";

          /* ---------------- ONLY REAL AMAZON PRODUCTS ---------------- */

          if (
            !link.includes("/dp/") &&
            !link.includes("/gp/product/")
          ) {
            continue;
          }

          const asin =
            extractASIN(link);

          if (!asin) {
            continue;
          }

          if (
            seenIds.has(asin)
          ) {
            continue;
          }

          /* ---------------- IMAGE ---------------- */

          const rawImage =
            item.pagemap?.cse_image?.[0]?.src ||
            item.pagemap?.cse_thumbnail?.[0]?.src ||
            item.thumbnail;

          const image =
            cleanAmazonImage(rawImage);

          if (!image) {
            continue;
          }

          /* ---------------- TITLE ---------------- */

          if (
            !item.title ||
            item.title.length < 10
          ) {
            continue;
          }

          const lowerTitle =
            item.title.toLowerCase();

          const blocked = [
            "book",
            "manual",
            "guide",
            "pdf",
            "kindle",
            "ebook"
          ];

          if (
            blocked.some(word =>
              lowerTitle.includes(word)
            )
          ) {
            continue;
          }

          /* ---------------- DESCRIPTION ---------------- */

          const description =
            item.snippet ||
            item.pagemap?.metatags?.[0]?.[
              "og:description"
            ] ||
            "Trending viral product.";

          /* ---------------- CLEAN AMAZON LINK ---------------- */

          const cleanLink =
            `https://www.amazon.com/dp/${asin}`;

          /* ---------------- SCORE ---------------- */

          const score =
            getViralScore({
              title: item.title,
              image,
              source: link
            });

          if (score < 20) {
            continue;
          }

          /* ---------------- PRODUCT ---------------- */

          const product = {

            id: asin,

            asin,

            title:
              cleanTitle(item.title),

            description:
              description.substring(0, 160),

            image,

            link: cleanLink,

            score
          };

          discovered.push(product);

          seenIds.add(asin);

          console.log(
            "PRODUCT:",
            product.title
          );

          /* ---------------- LIMIT ---------------- */

          if (
            discovered.length >= 50
          ) {
            break;
          }

        } catch (err) {

          console.log(
            "ITEM ERROR:",
            err.message
          );
        }
      }

      if (
        discovered.length >= 50
      ) {
        break;
      }
    }

    /* ---------------- NO PRODUCTS ---------------- */

    if (!discovered.length) {

      cache.fetching = false;

      console.log(
        "NO PRODUCTS FOUND"
      );

      return res.status(200).json({
        products: []
      });
    }

    /* ---------------- SORT ---------------- */

    const finalProducts =
      discovered
        .sort(
          (a, b) =>
            b.score - a.score
        )
        .slice(0, 30);

    /* ---------------- SAVE CACHE ---------------- */

    cache.timestamp = now;

    cache.data =
      finalProducts;

    cache.fetching = false;

    console.log(
      "FINAL PRODUCTS:",
      finalProducts.length
    );

    return res.status(200).json({
      products: finalProducts
    });

  } catch (error) {

    cache.fetching = false;

    console.error(
      "API ERROR:",
      error
    );

    return res.status(500).json({

      error: "Search failed",

      details:
        error.message ||
        "Unknown error"
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
    .substring(0, 80)
    .trim();
}

function extractASIN(url) {

  try {

    const parsed =
      new URL(url);

    const dpMatch =
      parsed.pathname.match(
        /\/dp\/([A-Z0-9]{10})/
      );

    const gpMatch =
      parsed.pathname.match(
        /\/gp\/product\/([A-Z0-9]{10})/
      );

    return (
      dpMatch?.[1] ||
      gpMatch?.[1] ||
      null
    );

  } catch {

    return null;
  }
}
