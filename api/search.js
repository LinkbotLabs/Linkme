const cache = {
  timestamp: 0,
  data: []
};

const CACHE_TIME = 1000 * 60 * 60 * 6;


/* ---------------- VIRAL SOURCES ---------------- */

const queries = [

/* AMAZON TREND DATA */

"site:amazon.com/gp/movers-and-shakers",
"site:amazon.com/gp/movers-and-shakers kitchen",
"site:amazon.com/gp/movers-and-shakers home",
"site:amazon.com/gp/movers-and-shakers electronics",

/* TIKTOK VIRAL SIGNALS */

"tiktok made me buy it amazon gadget",
"viral tiktok gadget amazon",
"tiktok cleaning gadget amazon",
"tiktok kitchen gadget amazon",
"tiktok amazon home gadget",

/* PINTEREST STYLE VIRAL PRODUCTS */

"amazon problem solving gadgets site:amazon.com",
"amazon life hack gadget site:amazon.com",
"amazon must have gadgets site:amazon.com",

/* KNOWN VIRAL PRODUCT CATEGORIES */

"vegetable chopper kitchen gadget site:amazon.com",
"electric spin scrubber cleaner site:amazon.com",
"portable blender usb rechargeable site:amazon.com",
"mini thermal label printer site:amazon.com",
"automatic soap dispenser touchless site:amazon.com",
"magnetic screen door mesh site:amazon.com",
"car seat gap filler organizer site:amazon.com",
"cordless handheld vacuum car site:amazon.com"

];


/* ---------------- VIRAL WORD SIGNALS ---------------- */

const viralWords = [
  "gadget",
  "viral",
  "must",
  "portable",
  "mini",
  "electric",
  "automatic",
  "cleaner",
  "organizer",
  "kitchen",
  "tool",
  "smart",
  "wireless",
  "rechargeable",
  "foldable",
  "adjustable",
  "multifunction"
];


/* ---------------- API HANDLER ---------------- */

export default async function handler(req, res) {

  res.setHeader("Cache-Control", "no-store");

  const now = Date.now();

  if (cache.data.length && now - cache.timestamp < CACHE_TIME) {
    return res.status(200).json({ products: cache.data });
  }

  try {

    const shuffled = [...queries].sort(() => 0.5 - Math.random());
    const selectedQueries = shuffled.slice(0, 5);

    let allItems = [];

    for (const query of selectedQueries) {

      const googleRes = await fetch(
        `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_KEY}&cx=${process.env.CX_ID}&q=${encodeURIComponent(query)}&num=10`
      );

      const data = await googleRes.json();

      if (data.items) {
        allItems = [...allItems, ...data.items];
      }

    }

    if (!allItems.length) {
      return res.status(200).json({ products: cache.data });
    }


    /* -------- STRICT AMAZON PRODUCT FILTER -------- */

    const filtered = allItems.filter(item =>
      item.link &&
      item.link.includes("amazon.com") &&
      (
        item.link.includes("/dp/") ||
        item.link.includes("/gp/product/")
      )
    );


    const products = filtered.map((item, i) => {

      const rawImage =
        item.pagemap?.cse_image?.[0]?.src ||
        item.pagemap?.metatags?.[0]?.["og:image"] ||
        item.pagemap?.cse_thumbnail?.[0]?.src;

      if (!rawImage) return null;

      const image = upgradeAmazonImage(rawImage);

      const description =
        item.snippet ||
        item.pagemap?.metatags?.[0]?.["og:description"] ||
        "Trending Amazon product going viral right now.";

      const link = normalizeAmazonLink(item.link);

      const title = cleanTitle(item.title);

      const titleLower = title.toLowerCase();

      const score = viralWords.reduce((count, word) => {
        return titleLower.includes(word) ? count + 1 : count;
      }, 0);

      return {
        id: `${now}-${i}`,
        title,
        description: description.substring(0, 140),
        image,
        link,
        score
      };

    })
    .filter(Boolean)
    .sort((a,b)=>b.score-a.score)
    .slice(0,24);


    /* -------- MERGE + REMOVE DUPES -------- */

    const existing = cache.data || [];
    const merged = [...existing, ...products];

    const unique = [];
    const seen = new Set();

    for (const p of merged) {

      if (seen.has(p.link)) continue;

      seen.add(p.link);

      unique.push(p);

    }

    cache.data = unique.slice(-300);
    cache.timestamp = now;

    return res.status(200).json({ products: cache.data });

  } catch (error) {

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


function normalizeAmazonLink(url) {

  try {

    const parsed = new URL(url);

    const dpMatch = parsed.pathname.match(/\/dp\/([A-Z0-9]{10})/);
    const gpMatch = parsed.pathname.match(/\/gp\/product\/([A-Z0-9]{10})/);

    const asin = dpMatch?.[1] || gpMatch?.[1];

    if (!asin) return parsed.origin;

    return `https://www.amazon.com/dp/${asin}`;

  } catch {

    return url;

  }

}


function upgradeAmazonImage(url) {
  return url.replace(/\._.*_\./, ".");
}
