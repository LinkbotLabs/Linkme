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

  res.setHeader(
  "Cache-Control",
  "s-maxage=86400, stale-while-revalidate"
);

  const now = Date.now();

  if (cache.data && now - cache.timestamp < ONE_DAY) {
    return res.status(200).json({ products: cache.data });
  }

  try {

    const shuffledKeywords = keywords.sort(() => 0.5 - Math.random()).slice(0,4);

    const discovered = [];
    const seenASIN = new Set();

    for (const keyword of shuffledKeywords) {

      const query = `${keyword} site:amazon.com -book -kindle`;

      const googleRes = await fetch(
        `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_KEY}&cx=${process.env.CX_ID}&q=${encodeURIComponent(query)}&num=10`
      );

      const data = await googleRes.json();

      if (!data.items) continue;

      for (const item of data.items) {

        const link = item.link || "";

        const asin = extractASIN(link);

        if (!asin) continue;

        if (seenASIN.has(asin)) continue;

        const image =
          item.pagemap?.cse_image?.[0]?.src ||
          item.pagemap?.cse_thumbnail?.[0]?.src;

        if (!image) continue;

        const description =
          item.snippet ||
          item.pagemap?.metatags?.[0]?.["og:description"] ||
          "Trending product people are buying right now.";

        const cleanLink = `https://www.amazon.com/dp/${asin}`;

        discovered.push({
          id: `${asin}`,
          title: cleanTitle(item.title),
          description: description.substring(0, 140),
          image,
          link: cleanLink
        });

        seenASIN.add(asin);

        if (discovered.length >= 50) break;

      }

      if (discovered.length >= 50) break;

    }

    cache.timestamp = now;
    cache.data = discovered;

    return res.status(200).json({ products: discovered });

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

function extractASIN(url) {

  try {

    const parsed = new URL(url);

    const dpMatch = parsed.pathname.match(/\/dp\/([A-Z0-9]{10})/);
    const gpMatch = parsed.pathname.match(/\/gp\/product\/([A-Z0-9]{10})/);

    return dpMatch?.[1] || gpMatch?.[1] || null;

  } catch {
    return null;
  }

}
