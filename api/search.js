const cache = {
  timestamp: 0,
  data: null
};

const ONE_DAY = 1000 * 60 * 60 * 24;

const keywords = [
  // Core originals + 2026 freshness
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

  // New for requested categories (plush, wellness, tech, novelty, etc.)
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

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  const now = Date.now();

  // Serve cached if fresh (24h)
  if (cache.data && now - cache.timestamp < ONE_DAY) {
    return res.status(200).json({ products: cache.data });
  }

  try {
    // Day-based offset for revolving variety
    const dayOfYear = Math.floor((now - new Date(new Date(now).getFullYear(), 0, 0)) / ONE_DAY);
    const startIndex = dayOfYear % keywords.length;

    // Fetch from 5 keywords in parallel
    const numToFetch = 5;
    const promises = [];

    for (let i = 0; i < numToFetch; i++) {
      const kwIndex = (startIndex + i) % keywords.length;
      const kw = keywords[kwIndex];
      const query = `${kw} site:amazon.com -book -novel -kindle`;

      promises.push(
        fetch(
          `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_KEY}&cx=${process.env.CX_ID}&q=${encodeURIComponent(query)}&num=10`
        )
          .then(res => res.ok ? res.json() : { items: [] })
          .catch(() => ({ items: [] }))
      );
    }

    const allResponses = await Promise.all(promises);
    let allItems = allResponses.flatMap(r => r.items || []);

    // Deduplicate by ASIN + strict filter
    const seenASIN = new Set();
    const uniqueItems = allItems.filter(item => {
      if (!item.link || !item.link.includes("amazon.com")) return false;

      const cleanLink = normalizeAmazonLink(item.link);
      const dpMatch = cleanLink.match(/\/dp\/([A-Z0-9]{10})/);
      const gpMatch = cleanLink.match(/\/gp\/product\/([A-Z0-9]{10})/);
      const asin = dpMatch?.[1] || gpMatch?.[1];

      if (!asin || seenASIN.has(asin)) return false;

      seenASIN.add(asin);
      return true;
    });

    // Map to products
    const products = uniqueItems.map((item, i) => {
      const image =
        item.pagemap?.cse_thumbnail?.[0]?.src ||
        item.pagemap?.cse_image?.[0]?.src ||
        "https://via.placeholder.com/600x600?text=Float+Pick";

      return {
        id: `${now}-${i}`,
        title: cleanTitle(item.title),
        image,
        link: normalizeAmazonLink(item.link)
      };
    }).slice(0, 30);

    cache.timestamp = now;
    cache.data = products;

    return res.status(200).json({ products });

  } catch (error) {
    console.error("Search handler error:", error);
    return res.status(500).json({
      error: "Search failed",
      details: error.message
    });
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
