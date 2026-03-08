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
  "amazon best seller home gadgets",

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

/* ------------------ REDDIT VIRAL PRODUCTS ------------------ */

async function getRedditProducts() {

  try {

    const subreddits = [
      "AmazonFinds",
      "BuyItForLife",
      "DidntKnowIWantedThat",
      "DamnThatsInteresting"
    ];

    let products = [];

    for (const sub of subreddits) {

      const res = await fetch(
        `https://www.reddit.com/r/${sub}/hot.json?limit=25`
      );

      const data = await res.json();

      const posts = data?.data?.children || [];

      posts.forEach((post, i) => {

        const url = post.data.url || "";

        const asinMatch = url.match(/\/dp\/([A-Z0-9]{10})/);

        if (!asinMatch) return;

        const asin = asinMatch[1];

        products.push({
          id: `reddit-${sub}-${i}`,
          title: post.data.title,
          image: `https://images-na.ssl-images-amazon.com/images/P/${asin}.01._SL500_.jpg`,
          link: `https://www.amazon.com/dp/${asin}`
        });

      });

    }

    return products.slice(0, 20);

  } catch {

    return [];

  }

}

/* ------------------ MAIN API HANDLER ------------------ */

export default async function handler(req, res) {

  res.setHeader("Cache-Control", "no-store");

  const now = Date.now();

  if (cache.data && now - cache.timestamp < ONE_DAY) {

    return res.status(200).json({ products: cache.data });

  }

  try {

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
  description: item.snippet || "",
  image,
  link: cleanLink
};  

    });

    /* ---------- EXTRA SOURCES ---------- */

    const movers = await getMoversAndShakers();
    const reddit = await getRedditProducts();

    const combined = [...products, ...movers, ...reddit];

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

    unique.sort(() => 0.5 - Math.random());

    cache.timestamp = now;
    cache.data = unique;

    return res.status(200).json({ products: unique });

  } catch {

    return res.status(200).json({ products: [] });

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
