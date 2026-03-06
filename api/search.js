let cache = {
  timestamp: 0,
  data: null
};

const ONE_DAY = 1000 * 60 * 60 * 24;

const keywords = [
  "amazon must have gadgets",
  "tiktok made me buy it amazon",
  "amazon viral kitchen tools",
  "amazon problem solving gadgets",
  "amazon cool gadgets under 50",
  "amazon life hacks gadgets",
  "amazon smart home gadgets",
  "amazon car gadgets trending"
];

export default async function handler(req, res) {

  res.setHeader("Cache-Control", "no-store");

  const now = Date.now();

  // Return cached products
  if (cache.data && now - cache.timestamp < ONE_DAY) {
    return res.status(200).json({ products: cache.data });
  }

  try {

    const activeKeyword =
      keywords[Math.floor(Math.random() * keywords.length)];

    const query =
      `${activeKeyword} site:amazon.com inurl:/dp/ -book -novel -kindle`;

    const googleRes = await fetch(
      `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_KEY}&cx=${process.env.CX_ID}&q=${encodeURIComponent(query)}&num=20`
    );

    const data = await googleRes.json();

    if (!googleRes.ok) {
      return res.status(googleRes.status).json({
        error: data.error?.message || "Google API error"
      });
    }

    if (!data.items || data.items.length === 0) {
      return res.status(200).json({ products: [] });
    }

    const filtered = data.items.filter(item =>
      item.link &&
      item.link.includes("amazon.com") &&
      (item.link.includes("/dp/") || item.link.includes("/gp/product/"))
    );

    const products = filtered.slice(0, 10).map((item, i) => {

      const asin = extractASIN(item.link);

      const image =
        item.pagemap?.cse_image?.[0]?.src ||
        item.pagemap?.cse_thumbnail?.[0]?.src ||
        (asin ? `https://images-na.ssl-images-amazon.com/images/P/${asin}.jpg` : "https://via.placeholder.com/600x600?text=Float+Pick");

      const cleanLink = normalizeAmazonLink(item.link);

      return {
        id: `${now}-${i}`,
        title: cleanTitle(item.title),
        image,
        link: cleanLink
      };

    });

    cache.timestamp = now;
    cache.data = products;

    return res.status(200).json({ products });

  } catch (error) {
    return res.status(500).json({
      error: "Search failed",
      details: error.message
    });
  }
}


/* ------------------ HELPERS ------------------ */

function cleanTitle(title = "") {
  return title
    .replace("- Amazon.com", "")
    .replace("| Amazon", "")
    .split("|")[0]
    .substring(0, 80)
    .trim();
}

function extractASIN(url) {
  try {
    const match = url.match(/\/dp\/([A-Z0-9]{10})|\/gp\/product\/([A-Z0-9]{10})/);
    return match ? (match[1] || match[2]) : null;
  } catch {
    return null;
  }
}

function normalizeAmazonLink(url) {
  try {
    const asin = extractASIN(url);

    if (!asin) return url;

    return `https://www.amazon.com/dp/${asin}`;
  } catch {
    return url;
  }
}
