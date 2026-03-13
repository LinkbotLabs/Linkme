const cache = {
  timestamp: 0,
  data: null
};

const ONE_DAY = 0; // Disabled as requested — fresh every time

/* ------------------ KEYWORDS (more for better hit rate) ------------------ */
const keywords = [
  "amazon movers and shakers gadgets 2026",
  "amazon best sellers viral gadgets 2026",
  "tiktok viral amazon products 2026",
  "pinterest trending amazon finds 2026",
  "amazon new releases tech gadgets 2026",
  "viral kitchen gadgets tiktok amazon 2026",
  "amazon impulse buy gadgets viral 2026",
  "jellycat plush keychain phone charm amazon viral",
  "collagen peptide hydrogel face mask amazon viral",
  "magnetic phone mount car viral tiktok amazon",
  "solar power bank foldable portable charger amazon",
  "back stretcher spine decompressor yoga amazon",
  "dumpling maker sushi roller tiktok amazon",
  "asmr slime kit kinetic sand amazon viral",
  "long distance touch bracelet amazon",
  "mini hydroponic grow kit amazon",
  "rfid blocking wallet amazon viral",
  "led nail lamp uv amazon",
  "portable espresso maker amazon viral",
  "smart ring fitness tracker amazon",
  "holographic projector fan amazon viral",
  "nmn resveratrol supplement amazon",
  "infrared sauna blanket amazon",
  "ar smart makeup mirror amazon",
  "medicube toner pads viral amazon",
  "viral tumbler water bottle amazon 2026",
  "high waisted leggings amazon viral",
  "tiktok viral beauty amazon 2026",
  "amazon viral wellness gadgets 2026"
];

/* ------------------ AMAZON SCRAPER (higher-res images) ------------------ */
async function scrapeAmazonPage(url, limit = 20) {
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const html = await res.text();

    const matches = [...html.matchAll(/\/dp\/([A-Z0-9]{10})/g)];
    const asins = [...new Set(matches.map(m => m[1]))].slice(0, limit);

    return asins.map((asin, i) => ({
      id: `amzn-${asin}-${i}`,
      title: "Trending Product", // fallback
      image: `https://m.media-amazon.com/images/I/${asin}._AC_SL1500_.jpg`, // ← best quality
      link: `https://www.amazon.com/dp/${asin}`,
      source: url.includes('movers') ? 'movers' : url.includes('best-sellers') ? 'bestsellers' : url.includes('new-releases') ? 'newreleases' : 'amazon',
      description: "",
      score: url.includes('new-releases') ? 4.0 : url.includes('movers') ? 3.5 : 2.5
    }));
  } catch (e) {
    console.error('Scrape failed:', url, e);
    return [];
  }
}

/* ------------------ REDDIT (use selftext for description) ------------------ */
async function getRedditProducts() {
  try {
    const subreddits = [
      "AmazonFinds", "BuyItForLife", "DidntKnowIWantedThat", "DamnThatsInteresting",
      "mildlyinteresting", "oddlysatisfying", "tiktokshop", "AmazonVine", "AmazonVineReviews"
    ];

    let products = [];

    for (const sub of subreddits) {
      const res = await fetch(`https://www.reddit.com/r/${sub}/hot.json?limit=60`);
      if (!res.ok) continue;
      const data = await res.json();
      const posts = data?.data?.children || [];

      posts.forEach((post, i) => {
        const url = post.data.url || "";
        const asinMatch = url.match(/\/dp\/([A-Z0-9]{10})/);
        if (!asinMatch) return;

        const asin = asinMatch[1];
        const desc = post.data.selftext?.trim().substring(0, 400) || "";

        products.push({
          id: `reddit-${sub}-${i}`,
          title: post.data.title.substring(0, 120).trim(),
          image: `https://m.media-amazon.com/images/I/${asin}._AC_SL1500_.jpg`,
          link: `https://www.amazon.com/dp/${asin}`,
          source: 'reddit',
          description: desc || "Viral find from Reddit",
          score: desc.length > 100 ? 2.8 : 2.2
        });
      });
    }

    return products.slice(0, 30);
  } catch (e) {
    console.error('Reddit fetch failed:', e);
    return [];
  }
}

/* ------------------ MAIN HANDLER ------------------ */
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");

  const now = Date.now();

  try {
    const shuffled = [...keywords].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 12); // more keywords = better chance of good snippets

    let allItems = [];

    for (const keyword of selected) {
      const query = `${keyword} site:amazon.com inurl:/dp/ -book -novel -kindle`;
      try {
        const googleRes = await fetch(
          `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&key=${process.env.GOOGLE_API_KEY}&cx=${process.env.GOOGLE_CX}`
        );
        if (!googleRes.ok) continue;
        const data = await googleRes.json();
        if (data.items) allItems = allItems.concat(data.items);
      } catch (e) {
        console.error(`Google failed for "${keyword}":`, e);
      }
    }

    // Google products – allow short descriptions now
    const googleProducts = allItems
      .map((item, i) => {
        const asinMatch = item.link.match(/\/dp\/([A-Z0-9]{10})|\/gp\/product\/([A-Z0-9]{10})/);
        const asin = asinMatch?.[1] || asinMatch?.[2];
        if (!asin) return null;

        const desc = (item.snippet || "").trim();
        return {
          id: `google-${now}-${i}`,
          title: cleanTitle(item.title),
          description: desc || "Viral Amazon find – check details on page",
          image: `https://m.media-amazon.com/images/I/${asin}._AC_SL1500_.jpg`,
          link: `https://www.amazon.com/dp/${asin}`,
          source: 'keyword',
          score: desc.length > 150 ? 3.0 : desc.length > 50 ? 2.5 : 2.0
        };
      })
      .filter(Boolean);

    // Scrape Amazon & Reddit
    const movers = await scrapeAmazonPage("https://www.amazon.com/gp/movers-and-shakers", 25);
    const bestSellers = await scrapeAmazonPage("https://www.amazon.com/Best-Sellers/zgbs", 20);
    const newReleases = await scrapeAmazonPage("https://www.amazon.com/gp/new-releases", 30);

    const reddit = await getRedditProducts();

    // Combine + weight
    const combined = [
      ...newReleases.map(p => ({ ...p, score: 4.0 })),
      ...movers.map(p => ({ ...p, score: 3.5 })),
      ...googleProducts.map(p => ({ ...p, score: p.score })),
      ...reddit.map(p => ({ ...p, score: p.score })),
      ...bestSellers.map(p => ({ ...p, score: 2.0 }))
    ];

    // Dedupe – keep best description + score
    const seen = new Map();
    const unique = combined.filter(p => {
      const asinMatch = p.link.match(/\/dp\/([A-Z0-9]{10})/);
      if (!asinMatch) return true;
      const asin = asinMatch[1];

      if (seen.has(asin)) {
        const ex = seen.get(asin);
        if ((p.description?.length || 0) > (ex.description?.length || 0) ||
            (p.score || 0) > (ex.score || 0)) {
          seen.set(asin, p);
        }
        return false;
      }

      seen.set(asin, p);
      return true;
    });

    // Sort + trim
    unique.sort((a, b) => b.score - a.score || Math.random() - 0.5);
    const finalProducts = unique.slice(0, 80);

    return res.status(200).json({ products: finalProducts });

  } catch (e) {
    console.error('Handler error:', e);
    return res.status(200).json({ 
      products: [], 
      error: 'Fetch failed – check logs or try again later' 
    });
  }
}

/* ------------------ HELPERS ------------------ */
function cleanTitle(title) {
  return title
    .replace(/- Amazon\.com.*$/i, '')
    .replace(/\| Amazon.*/i, '')
    .replace(/Amazon\.com: |Amazon : /gi, '')
    .split('|')[0]
    .substring(0, 120)
    .trim() || "Viral Amazon Find";
}
