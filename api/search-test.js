const ONE_DAY = 1000 * 60 * 60 * 24;

const BASE_SITE = "https://linkmetagshop.vercel.app";

const platformCache = {
  amazon: { timestamp: 0, data: [] },
  dhgate: { timestamp: 0, data: [] },
  temu: { timestamp: 0, data: [] }
};

const platformConfigs = {
  amazon: {
    site: "amazon.com",
    keywords: [

  "tiktok made me buy it amazon gadget",
  "amazon viral gadgets under 50",
  "amazon cool tech gadgets",
  "amazon impulse buy gadgets",
  "amazon trending tech 2025",
  "amazon must have gadgets",
  "amazon weird but useful gadgets",
  "amazon problem solving gadgets"
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
    const manualKeyword = req.query.keyword;

    if (!platformConfigs[platform]) {
      return res.status(400).json({ error: "Invalid platform" });
    }

    const now = Date.now();
    const cache = platformCache[platform];

    // ✅ Return cached results (24h)
    if (!manualKeyword && cache.data.length && now - cache.timestamp < ONE_DAY) {
      return res.status(200).json({
        cached: true,
        platform,
        count: cache.data.length,
        products: cache.data,
        site: BASE_SITE
      });
    }

    const config = platformConfigs[platform];

    const activeKeyword = manualKeyword
      ? manualKeyword
      : config.keywords[Math.floor(Math.random() * config.keywords.length)];

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
      if (!item?.link) return false;

      const url = item.link.toLowerCase();

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

      image = image.replace(/\s/g, "");

      const cleanLink = item.link
        .split("?")[0]
        .split("/ref=")[0];

      // 🔥 THIS is your site link format
      const siteLink = `${BASE_SITE}/s.html?id=${platform}-${now}-${i}`;

      return {
        id: `${platform}-${now}-${i}`,
        platform,
        title: item.title?.substring(0, 90) || "Product",
        image,
        originalLink: cleanLink,
        siteLink
      };
    });

    // Cache only if not manual test
    if (!manualKeyword) {
      platformCache[platform] = {
        timestamp: now,
        data: products
      };
    }

    return res.status(200).json({
      cached: false,
      platform,
      keywordUsed: activeKeyword,
      count: products.length,
      products,
      site: BASE_SITE
    });

  } catch (error) {
    console.error("Search test crash:", error);

    return res.status(500).json({
      error: "Function crashed",
      details: error.message
    });
  }
}
