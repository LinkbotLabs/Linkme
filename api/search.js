const ONE_DAY = 1000 * 60 * 60 * 24;
const MAX_PRODUCTS = 8;

const BASE_SITE = "https://linkmetagshop.vercel.app";

let cache = {
  day: null,
  data: []
};

function getDayNumber() {
  return Math.floor(Date.now() / ONE_DAY);
}

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

    const today = getDayNumber();

    // ✅ Return cached daily version
    if (cache.day === today && cache.data.length === MAX_PRODUCTS) {
      return res.status(200).json({
        cached: true,
        count: cache.data.length,
        products: cache.data,
        site: BASE_SITE
      });
    }

    const keywords = [
      "amazon kitchen gadgets",
      "amazon car gadgets",
      "amazon home organization gadgets",
      "amazon tech gadgets under 50",
      "amazon cleaning gadgets"
    ];

    const allResults = [];

    for (const keyword of keywords) {

      const query = `${keyword} site:amazon.com`;

      const googleRes = await fetch(
        `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_KEY}&cx=${process.env.CX_ID}&q=${encodeURIComponent(query)}&num=5`
      );

      if (!googleRes.ok) continue;

      const data = await googleRes.json();

      const validItems = (data.items || []).filter(item => {
        if (!item?.link) return false;
        return item.link.includes("amazon.com");
      });

      allResults.push(...validItems);
    }

    // Remove duplicates
    const uniqueMap = new Map();
    allResults.forEach(item => {
      if (!uniqueMap.has(item.link)) {
        uniqueMap.set(item.link, item);
      }
    });

    const uniqueResults = Array.from(uniqueMap.values());

    const now = Date.now();

    const products = uniqueResults.map((item, i) => {

      let image =
        item?.pagemap?.cse_image?.[0]?.src ||
        item?.pagemap?.cse_thumbnail?.[0]?.src ||
        "https://via.placeholder.com/600x600?text=Amazon+Pick";

      image = image.split("?")[0];

      const cleanLink = item.link.split("?")[0];

      return {
        id: `amazon-${now}-${i}`,
        platform: "amazon",
        title: item.title?.substring(0, 90) || "Amazon Product",
        image,
        link: cleanLink,
        siteLink: `${BASE_SITE}/s.html?id=amazon-${now}-${i}`
      };
    });

    shuffle(products);

    const finalProducts = products.slice(0, MAX_PRODUCTS);

    cache = {
      day: today,
      data: finalProducts
    };

    return res.status(200).json({
      cached: false,
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
