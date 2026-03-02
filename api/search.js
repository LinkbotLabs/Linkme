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

  // 🔥 CRITICAL: Disable HTTP caching (fixes 304 issue)
  res.setHeader("Cache-Control", "no-store");

  const now = Date.now();

  // ✅ Serve server-side cache (still keeps your daily rotation)
  if (cache.data && now - cache.timestamp < ONE_DAY) {
    console.log("Serving from server cache:", cache.data.length);
    return res.status(200).json({ products: cache.data });
  }

  try {
    // Rotate keyword daily
    const dayIndex = Math.floor(now / ONE_DAY) % keywords.length;
    const activeKeyword = keywords[dayIndex];

    // 🔥 Improved query (forces product pages)
    const query = `${activeKeyword} site:amazon.com/dp/ -book -novel -kindle`;

    const googleRes = await fetch(
      `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_KEY}&cx=${process.env.CX_ID}&q=${encodeURIComponent(query)}&num=10`
    );

    const data = await googleRes.json();

    if (!googleRes.ok) {
      return res.status(googleRes.status).json({
        error: data.error?.message || "Google API error"
      });
    }

    if (!data.items) {
      return res.status(500).json({ error: "No results from PSE" });
    }

    console.log("Total Google results:", data.items.length);

    // ✅ More flexible Amazon filtering
    const filtered = data.items.filter(item =>
      item.link &&
      item.link.includes("amazon.com")
    );

    console.log("Valid Amazon links:", filtered.length);

    if (!filtered.length) {
      return res.status(500).json({ error: "No valid Amazon product links found" });
    }

    const products = filtered.map((item, i) => {

      const image =
        item.pagemap?.cse_image?.[0]?.src ||
        item.pagemap?.cse_thumbnail?.[0]?.src ||
        "";

      let link = item.link;

      // ✅ Append affiliate safely
      if (!link.includes(AFFILIATE_TAG)) {
        link += link.includes("?")
          ? `&${AFFILIATE_TAG}`
          : `?${AFFILIATE_TAG}`;
      }

      return {
        id: `${now}-${i}`,
        title: cleanTitle(item.title),
        image,
        hook1: cleanTitle(item.title),
        hook2: randomHook(),
        link
      };
    });

    // Save server cache
    cache.timestamp = now;
    cache.data = products;

    console.log("Products returned to frontend:", products.length);

    return res.status(200).json({
      products
    });

  } catch (error) {
    return res.status(500).json({
      error: "FLOAT engine failed",
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

function randomHook() {
  const lines = [
    "TikTok can’t stop talking about it.",
    "Quietly trending this week.",
    "One of Amazon’s fastest risers.",
    "Floating up the charts today.",
    "The internet’s latest obsession.",
    "This keeps selling out.",
    "Everyone’s adding this to cart."
  ];
  return lines[Math.floor(Math.random() * lines.length)];
}
