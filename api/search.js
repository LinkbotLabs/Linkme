const cache = {
  timestamp: 0,
  data: null
};

const ONE_DAY = 1000 * 60 * 60 * 24;

/* ------------------ DISCOVERY KEYWORDS ------------------ */

const keywords = [
  "amazon trending gadgets",
  "viral kitchen gadgets amazon",
  "amazon best seller tech",
  "tiktok viral home gadgets amazon",
  "amazon impulse buy gadgets",
  "amazon trending gadgets 2026",
  "viral amazon kitchen finds 2026",
  "tiktok viral beauty products amazon",
  "amazon viral tech gadgets 2026",
  "trending amazon impulse buys 2026",
  "amazon best seller kitchen tools 2026",
  "tiktok viral wellness gadgets amazon",
  "amazon movers and shakers gadgets",
  "amazon best seller home gadgets"
];

/* ------------------ VIRAL FALLBACK POOL ------------------ */
/* This prevents empty feeds + avoids API quota limits */

const VIRAL_PRODUCTS = [
  {
    title: "Dash Mini Waffle Maker",
    image: "https://m.media-amazon.com/images/I/71T2Xh9p0zL._AC_SL1500_.jpg",
    link: "https://www.amazon.com/dp/B010TCP3SC"
  },
  {
    title: "Sunset Projection Lamp",
    image: "https://m.media-amazon.com/images/I/61c5dXnGZBL._AC_SL1500_.jpg",
    link: "https://www.amazon.com/dp/B08QZ7F1VZ"
  },
  {
    title: "Electric Spin Scrubber",
    image: "https://m.media-amazon.com/images/I/71rC9Yh8BQL._AC_SL1500_.jpg",
    link: "https://www.amazon.com/dp/B09BHZL8H8"
  },
  {
    title: "Portable Blender Smoothie Maker",
    image: "https://m.media-amazon.com/images/I/71hM0yJq9mL._AC_SL1500_.jpg",
    link: "https://www.amazon.com/dp/B08C7M1T8F"
  },
  {
    title: "Heated Eyelash Curler",
    image: "https://m.media-amazon.com/images/I/61p+q1uAqBL._AC_SL1500_.jpg",
    link: "https://www.amazon.com/dp/B07P7YVQX2"
  }
];

export default async function handler(req, res) {

  res.setHeader("Cache-Control", "no-store");

  const now = Date.now();

  /* ---------- CACHE ---------- */

  if (cache.data && now - cache.timestamp < ONE_DAY) {
    return res.status(200).json({ products: cache.data });
  }

  try {

    /* ---------- PICK MULTIPLE KEYWORDS ---------- */

    const shuffled = [...keywords].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 3);

    let allItems = [];

    for (const keyword of selected) {

      const query =
        `${keyword} site:amazon.com ("/dp/" OR "/gp/product/") -book -novel -kindle`;

      const googleRes = await fetch(
        `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_KEY}&cx=${process.env.CX_ID}&q=${encodeURIComponent(query)}&num=10`
      );

      const data = await googleRes.json();

      if (data.items) {
        allItems = allItems.concat(data.items);
      }
    }

    /* ---------- FILTER AMAZON PRODUCT LINKS ---------- */

    const filtered = allItems.filter(item =>
      item.link &&
      item.link.includes("amazon.com") &&
      (item.link.includes("/dp/") || item.link.includes("/gp/product/"))
    );

    /* ---------- MAP PRODUCTS ---------- */

    const products = filtered.map((item, i) => {

      const image =
        item.pagemap?.cse_thumbnail?.[0]?.src ||
        item.pagemap?.cse_image?.[0]?.src ||
        "https://via.placeholder.com/600x600?text=Float+Pick";

      const cleanLink = normalizeAmazonLink(item.link);

      return {
        id: `${now}-${i}`,
        title: cleanTitle(item.title),
        image,
        link: cleanLink
      };
    });

    /* ---------- ADD FALLBACK VIRAL PRODUCTS ---------- */

    const fallback = VIRAL_PRODUCTS.map((p, i) => ({
      id: `fallback-${i}`,
      ...p
    }));

    const combined = [...products, ...fallback];

    /* ---------- REMOVE DUPLICATE ASINS ---------- */

    const seen = new Set();

    const unique = combined.filter(p => {

      const asinMatch = p.link.match(/\/dp\/([A-Z0-9]{10})/);

      if (!asinMatch) return true;

      const asin = asinMatch[1];

      if (seen.has(asin)) return false;

      seen.add(asin);

      return true;
    });

    /* ---------- SHUFFLE FEED ---------- */

    unique.sort(() => 0.5 - Math.random());

    /* ---------- SAVE CACHE ---------- */

    cache.timestamp = now;
    cache.data = unique;

    return res.status(200).json({ products: unique });

  } catch (error) {

    /* ---------- IF GOOGLE FAILS USE FALLBACK ---------- */

    const fallback = VIRAL_PRODUCTS.map((p, i) => ({
      id: `fallback-${i}`,
      ...p
    }));

    return res.status(200).json({ products: fallback });

  }

}

/* ------------------ HELPERS ------------------ */

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
