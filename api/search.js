const cache = {
  timestamp: 0,
  data: null
};

const ONE_DAY = 1000 * 60 * 60 * 24;

/* ------------------ DISCOVERY KEYWORDS ------------------ */

const keywords = [

  // Core discovery
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
  "amazon best seller home gadgets",

  // Viral niches
  "tiktok viral plush accessories amazon",
  "jellycat plush keychain amazon",
  "magnetic phone mount car amazon viral",
  "collagen peptide face mask amazon",
  "solar power bank portable charger amazon",
  "back stretcher spine decompressor amazon",
  "tiktok fusion food tools amazon",
  "asmr slime kit amazon viral",
  "long distance touch bracelet amazon",
  "mini hydroponic plant grower amazon",
  "rfid blocking wallet amazon",
  "led nail lamp uv amazon",
  "portable espresso maker amazon",
  "smart ring fitness tracker amazon"

];

/* ------------------ VIRAL FALLBACK PRODUCTS ------------------ */

const VIRAL_PRODUCTS = [

  {
    title: "Dash Mini Waffle Maker",
    image: "https://images-na.ssl-images-amazon.com/images/I/71T2Xh9p0zL._SL1500_.jpg",
    link: "https://www.amazon.com/dp/B010TCP3SC"
  },
  {
    title: "Sunset Projection Lamp",
    image: "https://images-na.ssl-images-amazon.com/images/I/61c5dXnGZBL._SL1500_.jpg",
    link: "https://www.amazon.com/dp/B08QZ7F1VZ"
  },
  {
    title: "Electric Spin Scrubber",
    image: "https://images-na.ssl-images-amazon.com/images/I/71rC9Yh8BQL._SL1500_.jpg",
    link: "https://www.amazon.com/dp/B09BHZL8H8"
  },
  {
    title: "Portable Blender Smoothie Maker",
    image: "https://images-na.ssl-images-amazon.com/images/I/71hM0yJq9mL._SL1500_.jpg",
    link: "https://www.amazon.com/dp/B08C7M1T8F"
  },
  {
    title: "Heated Eyelash Curler",
    image: "https://images-na.ssl-images-amazon.com/images/I/61p+q1uAqBL._SL1500_.jpg",
    link: "https://www.amazon.com/dp/B07P7YVQX2"
  }

];

/* ------------------ AMAZON MOVERS & SHAKERS ------------------ */

async function getMoversAndShakers() {

  try {

    const res = await fetch("https://www.amazon.com/gp/movers-and-shakers");
    const html = await res.text();

    const matches = [...html.matchAll(/\/dp\/([A-Z0-9]{10})/g)];

    const asins = [...new Set(matches.map(m => m[1]))].slice(0, 20);

    return asins.map((asin, i) => ({
      id: `mover-${i}`,
      title: "Trending Amazon Product",
      image: `https://images-na.ssl-images-amazon.com/images/P/${asin}.01._SL500_.jpg`,
      link: `https://www.amazon.com/dp/${asin}`
    }));

  } catch {

    return [];

  }

}

/* ------------------ MAIN API HANDLER ------------------ */

export default async function handler(req, res) {

  res.setHeader("Cache-Control", "no-store");

  const now = Date.now();

  /* ---------- CACHE ---------- */

  if (cache.data && now - cache.timestamp < ONE_DAY) {

    return res.status(200).json({ products: cache.data });

  }

  try {

    /* ---------- RANDOM KEYWORDS ---------- */

    const shuffled = [...keywords].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 5);

    let allItems = [];

    for (const keyword of selected) {

      const query =
        `${keyword} site:amazon.com inurl:/dp/ -book -novel -kindle`;

      const googleRes = await fetch(
        `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_KEY}&cx=${process.env.CX_ID}&q=${encodeURIComponent(query)}&num=10`
      );

      const data = await googleRes.json();

      if (data.items) {

        allItems = allItems.concat(data.items);

      }

    }

    /* ---------- FILTER AMAZON LINKS ---------- */

    const filtered = allItems.filter(item =>

      item.link &&
      item.link.includes("amazon.com") &&
      (item.link.includes("/dp/") || item.link.includes("/gp/product/")) &&
      item.title &&
      item.title.length > 20

    );

    /* ---------- MAP PRODUCTS ---------- */

    const products = filtered.map((item, i) => {

      const asinMatch = item.link.match(
        /\/dp\/([A-Z0-9]{10})|\/gp\/product\/([A-Z0-9]{10})/
      );

      const asin = asinMatch?.[1] || asinMatch?.[2];

      const image =
        asin
          ? `https://images-na.ssl-images-amazon.com/images/P/${asin}.01._SL500_.jpg`
          : item.pagemap?.cse_image?.[0]?.src ||
            item.pagemap?.cse_thumbnail?.[0]?.src ||
            "https://via.placeholder.com/600x600?text=Float+Pick";

      const cleanLink = normalizeAmazonLink(item.link);

      return {
        id: `${now}-${i}`,
        title: cleanTitle(item.title),
        image,
        link: cleanLink
      };

    });

    /* ---------- ADD MOVERS + FALLBACK ---------- */

    const movers = await getMoversAndShakers();

    const fallback = VIRAL_PRODUCTS.map((p, i) => ({
      id: `fallback-${i}`,
      ...p
    }));

    const combined = [...products, ...movers, ...fallback];

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

    /* ---------- CACHE ---------- */

    cache.timestamp = now;
    cache.data = unique;

    return res.status(200).json({ products: unique });

  } catch (error) {

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
