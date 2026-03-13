const cache = {
  timestamp: 0,
  data: null
};

const ONE_DAY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/* ------------------ DISCOVERY KEYWORDS ------------------ */
// Expanded for your niches + 2026 viral/TikTok/Pinterest signals + high-commission categories
const keywords = [
  // General trending / viral
  "amazon movers and shakers gadgets 2026",
  "amazon best sellers viral gadgets 2026",
  "tiktok viral amazon products 2026",
  "pinterest trending amazon finds 2026",
  "amazon new releases tech gadgets 2026",
  "viral kitchen gadgets tiktok amazon 2026",
  "amazon impulse buy gadgets viral",

  // Your specific niches baked in
  "jellycat plush keychain phone charm amazon viral",
  "magnetic phone mount car viral tiktok amazon",
  "collagen peptide hydrogel face mask amazon viral",
  "solar power bank foldable portable charger amazon",
  "back stretcher spine decompressor yoga amazon",
  "dumpling maker sushi roller fusion food tool tiktok amazon",
  "asmr slime kit kinetic sand jellyfish lamp amazon viral",
  "long distance touch bracelet couple lamp amazon",
  "mini hydroponic grow kit led self watering planter amazon",
  "rfid blocking anti theft wallet amazon viral",
  "led nail lamp uv gel dryer amazon",
  "portable espresso maker manual coffee amazon viral",
  "smart ring fitness tracker oura alternative amazon",
  "holographic projector fan display amazon viral",
  "nmn resveratrol biohacking longevity supplement amazon",
  "infrared portable sauna blanket detox amazon",
  "ar smart makeup mirror virtual try on amazon",

  // Extra 2026 viral / high-commission signals from current trends
  "medicube toner pads viral amazon",
  "viral water bottle tumbler amazon 2026",
  "high waisted leggings pockets amazon viral",
  "wrinkle release spray amazon viral",
  "vitamin c korean skincare pads amazon viral",
  "tiktok viral beauty products amazon 2026",
  "amazon viral wellness gadgets 2026"
];

/* ------------------ AMAZON PAGE SCRAPER ------------------ */
async function scrapeAmazonPage(url, limit = 20) {
  try {
    const res = await fetch(url);
    const html = await res.text();

    const matches = [...html.matchAll(/\/dp\/([A-Z0-9]{10})/g)];
    const asins = [...new Set(matches.map(m => m[1]))].slice(0, limit);

    return asins.map((asin, i) => ({
      id: `${asin}-${i}`,
      title: "Trending Amazon Product",
      image: `https://images-na.ssl-images-amazon.com/images/P/${asin}.01._SL500_.jpg`,
      link: `https://www.amazon.com/dp/${asin}`,
      source: url.includes('movers') ? 'movers' : url.includes('best-sellers') ? 'bestsellers' : url.includes('new-releases') ? 'newreleases' : 'amazon'
    }));
  } catch (e) {
    console.error('Scrape error:', e);
    return [];
  }
}

/* ------------------ REDDIT VIRAL PRODUCTS ------------------ */
async function getRedditProducts() {
  try {
    const subreddits = [
      "AmazonFinds",
      "BuyItForLife",
      "DidntKnowIWantedThat",
      "DamnThatsInteresting",
      "mildlyinteresting",
      "oddlysatisfying",
      "tiktokshop",       // TikTok-related finds
      "AmazonVine"        // Occasional viral mentions
    ];

    let products = [];

    for (const sub of subreddits) {
      const res = await fetch(
        `https://www.reddit.com/r/${sub}/hot.json?limit=50`
      );
      const data = await res.json();
      const posts = data?.data?.children || [];

      posts.forEach((post, i) => {
        const url = post.data.url || "";
        const asinMatch = url.match(/\/dp\/([A-Z0-9]{10})/);

        if (!asinMatch) return;

        const asin = asinMatch[1];
        products.push({
          id: `reddit-${sub}-${i}`,
          title: post.data.title.substring(0, 80).trim(),
          image: `https://images-na.ssl-images-amazon.com/images/P/${asin}.01._SL500_.jpg`,
          link: `https://www.amazon.com/dp/${asin}`,
          source: 'reddit'
        });
      });
    }

    return products.slice(0, 20);
  } catch (e) {
    console.error('Reddit error:', e);
    return [];
  }
}

/* ------------------ MAIN API HANDLER ------------------ */
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  const now = Date.now();

  if (cache.data && now - cache.timestamp < ONE_DAY) {
    return res.status(200).json({ products: cache.data });
  }

  try {
    const shuffled = [...keywords].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 8); // Increased to 8 for better coverage

    let allItems = [];

    for (const keyword of selected) {
      const query = `${keyword} site:amazon.com inurl:/dp/ -book -novel -kindle`;
      const googleRes = await fetch(
        `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&key=${process.env.GOOGLE_API_KEY}&cx=${process.env.GOOGLE_CX}`
      );
      const data = await googleRes.json();

      if (data.items) {
        allItems = allItems.concat(data.items);
      }
    }

    /* ---------- GOOGLE PRODUCTS (keyword/viral hits) ---------- */
    const googleProducts = allItems
      .map((item, i) => {
        const asinMatch = item.link.match(/\/dp\/([A-Z0-9]{10})|\/gp\/product\/([A-Z0-9]{10})/);
        const asin = asinMatch?.[1] || asinMatch?.[2];

        if (!asin) return null;

        return {
          id: `google-${now}-${i}`,
          title: cleanTitle(item.title),
          description: item.snippet || "",
          image: `https://images-na.ssl-images-amazon.com/images/P/${asin}.01._SL500_.jpg`,
          link: `https://www.amazon.com/dp/${asin}`,
          source: 'keyword'
        };
      })
      .filter(Boolean);

    /* ---------- AMAZON SOURCES ---------- */
    const movers = await scrapeAmazonPage("https://www.amazon.com/gp/movers-and-shakers", 20);
    const bestSellers = await scrapeAmazonPage("https://www.amazon.com/Best-Sellers/zgbs", 20);
    const newReleases = await scrapeAmazonPage("https://www.amazon.com/gp/new-releases", 20);

    const reddit = await getRedditProducts();

    /* ---------- COMBINE + WEIGHT for priorities ---------- */
    const combined = [
      ...newReleases.map(p => ({ ...p, score: 3.0 })),      // New to market priority
      ...movers.map(p => ({ ...p, score: 2.5 })),           // Rising fast / viral momentum
      ...googleProducts.map(p => ({ ...p, score: 2.0 })),   // TikTok/Pinterest/niche viral
      ...bestSellers.map(p => ({ ...p, score: 1.5 })),
      ...reddit.map(p => ({ ...p, score: 2.0 }))
    ];

    /* ---------- REMOVE DUPLICATES by ASIN ---------- */
    const seen = new Set();
    const unique = combined.filter(p => {
      const asinMatch = p.link.match(/\/dp\/([A-Z0-9]{10})/);
      if (!asinMatch) return true;
      const asin = asinMatch[1];
      if (seen.has(asin)) return false;
      seen.add(asin);
      return true;
    });

    // Sort: higher score first, then random for freshness
    unique.sort((a, b) => b.score - a.score || Math.random() - 0.5);

    // Optional: trim to reasonable display size (e.g. top 50-80)
    const finalProducts = unique.slice(0, 80);

    cache.timestamp = now;
    cache.data = finalProducts;

    return res.status(200).json({ products: finalProducts });

  } catch (e) {
    console.error('Handler error:', e);
    return res.status(200).json({ products: [] });
  }
}

/* ------------------ HELPERS ------------------ */
function cleanTitle(title) {
  return title
    .replace(/- Amazon\.com.*$/i, '')
    .replace(/\| Amazon.*/i, '')
    .replace(/Amazon\.com: |Amazon : /gi, '')
    .split('|')[0]
    .substring(0, 100)
    .trim();
}
