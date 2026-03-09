const cache = {
  timestamp: 0,
  data: null
};

const ONE_DAY = 1000 * 60 * 60 * 24;

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
  "tiktok viral wellness gadgets amazon"
];

export default async function handler(req, res) {

  res.setHeader("Cache-Control", "no-store");

  const now = Date.now();

  // Return cached products if fresh
  if (cache.data && now - cache.timestamp < ONE_DAY) {
    return res.status(200).json({ products: cache.data });
  }

  try {

    const activeKeyword =
      keywords[Math.floor(Math.random() * keywords.length)];

    const query =
      `${activeKeyword} site:amazon.com -book -novel -kindle`;

    const googleRes = await fetch(
      `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_KEY}&cx=${process.env.CX_ID}&q=${encodeURIComponent(query)}&num=10`
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

    // Filter Amazon product links
    const filtered = data.items.filter(item =>
      item.link &&
      item.link.includes("amazon.com") &&
      item.link.match(/\/(dp|gp\/product)\//)
    );

    const products = filtered
      .map((item, i) => {

        const image =
          item.pagemap?.cse_image?.[0]?.src ||
          item.pagemap?.cse_thumbnail?.[0]?.src;

        // Skip results without images
        if (!image) return null;

        const description =
          item.snippet ||
          item.pagemap?.metatags?.[0]?.["og:description"] ||
          "Trending product people are buying right now.";

        const cleanLink = normalizeAmazonLink(item.link);

        return {
          id: `${now}-${i}`,
          title: cleanTitle(item.title),
          description: description.substring(0, 140),
          image,
          link: cleanLink
        };

      })
      .filter(Boolean);

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
