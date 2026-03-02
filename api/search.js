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
  "amazon impulse buy gadgets"
];

const AFFILIATE_TAG = "tag=davidshort-20";

export default async function handler(req, res) {

  res.setHeader("Cache-Control", "no-store");

  const now = Date.now();

  if (cache.data && now - cache.timestamp < ONE_DAY) {
    return res.status(200).json({ products: cache.data });
  }

  try {

    const activeKeyword =
      keywords[Math.floor(Math.random() * keywords.length)];

    // 🔥 Back to looser query (this is key)
    const query = `${activeKeyword} site:amazon.com -book -novel -kindle`;

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

    // 🔥 Only basic Amazon check
    const filtered = data.items.filter(item =>
      item.link && item.link.includes("amazon.com")
    );

    const products = filtered.map((item, i) => {

      const image =
        item.pagemap?.cse_thumbnail?.[0]?.src ||
        item.pagemap?.cse_image?.[0]?.src ||
        "https://via.placeholder.com/600x600?text=Float+Pick";

      let link = item.link;

      if (!link.includes(AFFILIATE_TAG)) {
        link += link.includes("?")
          ? `&${AFFILIATE_TAG}`
          : `?${AFFILIATE_TAG}`;
      }

      return {
        id: `${now}-${i}`,
        title: cleanTitle(item.title),
        image,
        link
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

function cleanTitle(title) {
  return title
    .replace("- Amazon.com", "")
    .replace("| Amazon", "")
    .split("|")[0]
    .substring(0, 80)
    .trim();
}
