const ONE_DAY = 1000 * 60 * 60 * 24;
const MAX_PRODUCTS = 8;

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

// 🔥 Fisher-Yates shuffle
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
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

    // ✅ Return cached version if already built today
    if (cache.day === today && cache.data.length === MAX_PRODUCTS) {
      return res.status(200).json({
        cached: true,
        platform,
        count: cache.data.length,
        products: cache.data,
        site: BASE_SITE
      });
    }

    const config = platformConfigs[platform];
    const allResults = [];

    // 🔥 Pull from ALL keywords daily for mix
    for (const keyword of config.keywords) {

      const query = `${keyword} site:${config.site} -book -novel -kindle -cd -vinyl -album -case -cover -blog -advertising`;

      const googleRes = await fetch(
        `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_KEY}&cx=${process.env.CX_ID}&q=${encodeURIComponent(query)}&num=6`
      );

      if (!googleRes.ok) continue;

      const data = await googleRes.json();

      const validItems = (data.items || []).filter(item => {
        if (!item?.link) return false;

        const url = item.link.toLowerCase();

        if (platform === "amazon") return url.includes("/dp/");
        if (platform === "dhgate") return url.includes("/product/");
        if (platform === "temu") return url.endsWith(".html");

        return false;
      });

      allResults.push(...validItems);
    }

    // 🔥 Remove duplicates
    const uniqueMap = new Map();
    allResults.forEach(item => {
      if (!uniqueMap.has(item.link)) {
        uniqueMap.set(item.link, item);
      }
    });

    const uniqueResults = Array.from(uniqueMap.values());

    const now = Date.now();

    // ✅ Clean but NEVER reject products
    const cleanProducts = uniqueResults.map((item, i) => {

      let image =
        item?.pagemap?.cse_image?.[0]?.src ||
        item?.pagemap?.cse_thumbnail?.[0]?.src ||
        "";

      // 🔥 If image bad → fallback instead of dropping
      if (
        !image ||
        !image.startsWith("http") ||
        image.includes("data:image")
      ) {
        image = "https://via.placeholder.com/600x600?text=Float+Pick";
      }

      // Remove Amazon resize patterns
      image = image.replace(/\._.*?_\.jpg/, ".jpg");

      // Remove query params
      image = image.split("?")[0];

      const cleanLink = item.link
        .split("?")[0]
        .split("/ref=")[0];

      return {
        id: `${platform}-${now}-${i}`,
        platform,
        title: item.title?.substring(0, 90) || "Product",
        image,
        link: cleanLink,
        siteLink: `${BASE_SITE}/s.html?id=${platform}-${now}-${i}`
      };
    });

    // 🔥 Shuffle daily
    shuffle(cleanProducts);

    // ✅ Guarantee up to 8
    const finalProducts = cleanProducts.slice(0, MAX_PRODUCTS);

    platformCache[platform] = {
      day: today,
      data: finalProducts
    };

    return res.status(200).json({
      cached: false,
      platform,
      count: finalProducts.length,
      products: finalProducts,
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
