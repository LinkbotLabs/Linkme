const ONE_DAY = 1000 * 60 * 60 * 24;

const BASE_SITE = "https://linkmetagshop.vercel.app";

// 🔥 Simple per-platform daily cache
const platformCache = {
  amazon: { day: null, data: [] },
  dhgate: { day: null, data: [] },
  temu: { day: null, data: [] }
};

const platformConfigs = {
  amazon: {
    site: "amazon.com",
    keywords: [
      "amazon kitchen problem solving gadgets",
      "amazon car gadgets accessories",
      "amazon home organization gadgets",
      "amazon tech gadgets under 50",
      "amazon cleaning gadgets"
    ]
  },
  dhgate: {
    site: "dhgate.com",
    keywords: [
      "dhgate trending tech gadgets",
      "dhgate cool electronics",
      "dhgate car accessories"
    ]
  },
  temu: {
    site: "temu.com",
    keywords: [
      "temu kitchen gadgets",
      "temu viral home gadgets",
      "temu tech accessories"
    ]
  }
};

function getDayNumber() {
  return Math.floor(Date.now() / ONE_DAY);
}

export default async function handler(req, res) {
  try {
    res.setHeader("Cache-Control", "no-store");

    const platform = (req.query.platform || "amazon").toLowerCase();

    if (!platformConfigs[platform]) {
      return res.status(400).json({ error: "Invalid platform" });
    }

    const today = getDayNumber();
    const cache = platformCache[platform];

    // ✅ If already fetched today → return cached
    if (cache.day === today && cache.data.length) {
      return res.status(200).json({
        cached: true,
        platform,
        count: cache.data.length,
        products: cache.data,
        site: BASE_SITE
      });
    }

    const config = platformConfigs[platform];

    // 🔥 Daily rotating keyword
    const keywordIndex = today % config.keywords.length;
    const activeKeyword = config.keywords[keywordIndex];

    const query = `${activeKeyword} site:${config.site} -book -novel -kindle -cd -vinyl -album -case -cover -blog -advertising`;

    const googleRes = await fetch(
      `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_KEY}&cx=${process.env.CX_ID}&q=${encodeURIComponent(query)}&num=10`
    );

    const data = await googleRes.json();

    if (!googleRes.ok) {
      return res.status(googleRes.status).json({
        error: data.error?.message || "Google API error"
      });
    }

    const filtered = (data.items || []).filter(item => {
      if (!item?.link) return false;

      const url = item.link.toLowerCase();

      if (platform === "amazon") return url.includes("/dp/");
      if (platform === "dhgate") return url.includes("/product/");
      if (platform === "temu") return url.endsWith(".html");

      return false;
    });

    const now = Date.now();

    const products = filtered.map((item, i) => {
      let image =
        item?.pagemap?.cse_thumbnail?.[0]?.src ||
        item?.pagemap?.cse_image?.[0]?.src ||
        "https://via.placeholder.com/600x600?text=Float+Pick";

      image = image.replace(/\s/g, "");

      const cleanLink = item.link
        .split("?")[0]
        .split("/ref=")[0];

      const id = `${platform}-${now}-${i}`;

      return {
        id,
        platform,
        title: item.title?.substring(0, 90) || "Product",
        image,
        originalLink: cleanLink,
        siteLink: `${BASE_SITE}/s.html?id=${id}`
      };
    });

    // ✅ Save daily cache
    platformCache[platform] = {
      day: today,
      data: products
    };

    return res.status(200).json({
      cached: false,
      platform,
      keywordUsed: activeKeyword,
      count: products.length,
      products,
      site: BASE_SITE
    });

  } catch (error) {
    console.error("Search crash:", error);

    return res.status(500).json({
      error: "Function crashed",
      details: error.message
    });
  }
}
