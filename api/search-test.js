const ONE_DAY = 1000 * 60 * 60 * 24;

const platformCache = {
  amazon: { timestamp: 0, data: [] },
  dhgate: { timestamp: 0, data: [] },
  temu: { timestamp: 0, data: [] }
};

const platformConfigs = {
  amazon: {
    site: "amazon.com",
    keywords: [
      "tiktok made me buy it amazon",
      "amazon viral gadgets",
      "amazon hidden gems",
      "amazon must have under 50",
      "amazon aesthetic home finds",
      "amazon trending tech 2025"
    ]
  },
  dhgate: {
    site: "dhgate.com",
    keywords: [
      "dhgate viral gadgets",
      "dhgate trending products",
      "dhgate best selling tech",
      "dhgate hidden gems"
    ]
  },
  temu: {
    site: "temu.com",
    keywords: [
      "temu viral products",
      "temu trending gadgets",
      "temu best sellers",
      "temu hidden finds"
    ]
  }
};

export default async function handler(req, res) {
  try {
    res.setHeader("Cache-Control", "no-store");

    const platform = (req.query.platform || "amazon").toLowerCase();

    if (!platformConfigs[platform]) {
      return res.status(400).json({ error: "Invalid platform" });
    }

    const now = Date.now();
    const cache = platformCache[platform];

    // ✅ Serve cached for 24h (no API hit)
    if (cache.data.length && now - cache.timestamp < ONE_DAY) {
      return res.status(200).json({
        cached: true,
        platform,
        count: cache.data.length,
        products: cache.data
      });
    }

    const config = platformConfigs[platform];

    let allProducts = [];
    let seenLinks = new Set();

    // 🔥 Loop ALL keywords (one-time daily hit)
    for (const keyword of config.keywords) {

      const query = `${keyword} site:${config.site} -book -novel -blog -advertising`;

      const googleRes = await fetch(
        `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_KEY}&cx=${process.env.CX_ID}&q=${encodeURIComponent(query)}&num=10`
      );

      const data = await googleRes.json();
      if (!googleRes.ok) continue;

      const filtered = (data.items || []).filter(item => {
        if (!item || !item.link) return false;

        const url = String(item.link).toLowerCase();

        if (platform === "amazon") return url.includes("/dp/");
        if (platform === "dhgate") return url.includes("/product/");
        if (platform === "temu") return url.endsWith(".html");

        return false;
      });

      for (const item of filtered) {

        const cleanLink = String(item.link)
          .split("?")[0]
          .split("/ref=")[0];

        if (seenLinks.has(cleanLink)) continue;
        seenLinks.add(cleanLink);

        let image =
          item?.pagemap?.cse_thumbnail?.[0]?.src ||
          item?.pagemap?.cse_image?.[0]?.src ||
          "https://via.placeholder.com/600x600?text=Float+Pick";

        image = String(image).replace(/\s/g, "");

        allProducts.push({
          id: `${platform}-${Date.now()}-${Math.random()}`,
          platform,
          title: item.title?.substring(0, 90) || "Product",
          image,
          link: cleanLink
        });
      }
    }

    platformCache[platform] = {
      timestamp: now,
      data: allProducts
    };

    return res.status(200).json({
      cached: false,
      platform,
      count: allProducts.length,
      products: allProducts
    });

  } catch (error) {
    console.error("Keyword test crash:", error);
    return res.status(500).json({
      error: "Function crashed",
      details: error.message
    });
  }
}
