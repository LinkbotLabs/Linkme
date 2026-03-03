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
      "amazon trending gadgets",
      "tiktok viral amazon finds",
      "amazon movers and shakers gadgets"
    ]
  },
  dhgate: {
    site: "dhgate.com",
    keywords: [
      "dhgate trending gadgets",
      "viral dhgate finds",
      "dhgate best selling tech"
    ]
  },
  temu: {
    site: "temu.com",
    keywords: [
      "temu trending gadgets",
      "temu viral products",
      "temu best sellers"
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

    // ✅ Return cached if fresh
    if (cache.data.length && now - cache.timestamp < ONE_DAY) {
      return res.status(200).json({
        cached: true,
        platform,
        count: cache.data.length,
        products: cache.data
      });
    }

    const config = platformConfigs[platform];

    const activeKeyword =
      config.keywords[Math.floor(Math.random() * config.keywords.length)];

    const query = `${activeKeyword} site:${config.site} -book -novel -kindle -blog -advertising`;

    const googleRes = await fetch(
      `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_KEY}&cx=${process.env.CX_ID}&q=${encodeURIComponent(query)}&num=10`
    );

    const data = await googleRes.json();

    if (!googleRes.ok) {
      return res.status(googleRes.status).json({
        error: data.error?.message || "Google API error"
      });
    }

    // ✅ STRICT PRODUCT FILTERING
    const filtered = (data.items || []).filter(item => {
      if (!item || !item.link) return false;

      const url = String(item.link).toLowerCase();

      if (platform === "amazon") return url.includes("/dp/");
      if (platform === "dhgate") return url.includes("/product/");
      if (platform === "temu") return url.endsWith(".html");

      return false;
    });

    const products = filtered.map((item, i) => {

      let image =
        item?.pagemap?.cse_thumbnail?.[0]?.src ||
        item?.pagemap?.cse_image?.[0]?.src ||
        "https://via.placeholder.com/600x600?text=Float+Pick";

      image = String(image).replace(/\s/g, "");

      const cleanLink = String(item.link)
        .split("?")[0]
        .split("/ref=")[0];

      return {
        id: `${platform}-${now}-${i}`,
        platform,
        title: item.title?.substring(0, 90) || "Product",
        image,
        link: cleanLink
      };
    });

    platformCache[platform] = {
      timestamp: now,
      data: products
    };

    return res.status(200).json({
      cached: false,
      platform,
      keywordUsed: activeKeyword,
      count: products.length,
      products
    });

  } catch (error) {
    console.error("Search test crash:", error);

    return res.status(500).json({
      error: "Function crashed",
      details: error.message
    });
  }
}
