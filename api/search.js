const cache = {
  timestamp: 0,
  data: null
};



/* ------------------ KEYWORDS (expanded + 2026 signals) ------------------ */
const keywords = [
  // General high-velocity viral / trending
  "amazon movers and shakers gadgets 2026",
  "amazon best sellers viral gadgets 2026",
  "tiktok viral amazon products 2026",
  "pinterest trending amazon finds 2026",
  "amazon new releases tech gadgets 2026",
  "viral kitchen gadgets tiktok amazon 2026",
  "amazon impulse buy gadgets viral 2026",

  // Your core niches
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

  // 2026 viral / high-commission extras
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
    if (!res.ok) return [];
    const html = await res.text();

    const matches = [...html.matchAll(/\/dp\/([A-Z0-9]{10})/g)];
    const asins = [...new Set(matches.map(m => m[1]))].slice(0, limit);

    return asins.map((asin, i) => ({
      id: `amzn-${asin}-${i}`,
      title: "Trending Amazon Product",
      image: `https://images-na.ssl-images-amazon.com/images/P/${asin}.01._SL800_.jpg`, // ← sharper image
      link: `https://www.amazon.com/dp/${asin}`,
      source: url.includes('movers') ? 'movers' : url.includes('best-sellers') ? 'bestsellers' : url.includes('new-releases') ? 'newreleases' : 'amazon',
      description: "", // scraped pages don't give desc → rely on Google for real text
      score: url.includes('new-releases') ? 3.5 : url.includes('movers') ? 3.0 : 2.0
    }));
  } catch (e) {
    console.error('Scrape failed:', url, e);
    return [];
  }
}

/* ------------------ REDDIT VIRAL PRODUCTS ------------------ */
async function getRedditProducts() {
  try {
    const subreddits = [
      "AmazonFinds", "BuyItForLife", "DidntKnowIWantedThat", "DamnThatsInteresting",
      "mildlyinteresting", "oddlysatisfying", "tiktokshop", "AmazonVine"
    ];

    let products = [];

    for (const sub of subreddits) {
      const res = await fetch(`https://www.reddit.com/r/${sub}/hot.json?limit=50`);
      if (!res.ok) continue;
      const data = await res.json();
      const posts = data?.data?.children || [];

      posts.forEach((post, i) => {
        const url = post.data.url || "";
        const asinMatch = url.match(/\/dp\/([A-Z0-9]{10})/);
        if (!asinMatch) return;

        const asin = asinMatch[1];
        products.push({
          id: `reddit-${sub}-${i}`,
          title: post.data.title.substring(0, 100).trim(),
          image: `https://images-na.ssl-images-amazon.com/images/P/${asin}.01._SL800_.jpg`,
          link: `https://www.amazon.com/dp/${asin}`,
          source: 'reddit',
          description: post.data.selftext?.substring(0, 300) || "", // sometimes reddit has descriptions
          score: 2.2
        });
      });
    }

    return products.slice(0, 25);
  } catch (e) {
    console.error('Reddit fetch failed:', e);
    return [];
  }
}

/* ------------------ MAIN HANDLER ------------------ */
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");

  const now = Date.now();

  // Serve cache if fresh
  if (cache.data && now - cache.timestamp < ONE_DAY) {
    return res.status(200).json({ products: cache.data });
  }

  try {
    // Shuffle + take more keywords for variety (still <100/day quota)
    const shuffled = [...keywords].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 10);

    let allItems = [];

    for (const keyword of selected) {
      const query = `${keyword} site:amazon.com inurl:/dp/ -book -novel -kindle`;
      try {
        const googleRes = await fetch(
          `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&key=${process.env.GOOGLE_API_KEY}&cx=${process.env.GOOGLE_CX}`
        );
        const data = await googleRes.json();
        if (data.items) allItems = allItems.concat(data.items);
      } catch (e) {
        console.error(`Google search failed for "${keyword}":`, e);
      }
    }

    // Google products – prefer longer descriptions
    const googleProducts = allItems
      .map((item, i) => {
        const asinMatch = item.link.match(/\/dp\/([A-Z0-9]{10})|\/gp\/product\/([A-Z0-9]{10})/);
        const asin = asinMatch?.[1] || asinMatch?.[2];
        if (!asin) return null;

        const desc = item.snippet || "";
        if (desc.length < 50) return null; // skip near-empty descriptions

        return {
          id: `google-${now}-${i}`,
          title: cleanTitle(item.title),
          description: desc,
          image: `https://images-na.ssl-images-amazon.com/images/P/${asin}.01._SL800_.jpg`,
          link: `https://www.amazon.com/dp/${asin}`,
          source: 'keyword',
          score: 2.2 + (desc.length / 1000) // tiny bonus for richer snippets
        };
      })
      .filter(Boolean);

    // Amazon sources
    const movers = await scrapeAmazonPage("https://www.amazon.com/gp/movers-and-shakers", 20);
    const bestSellers = await scrapeAmazonPage("https://www.amazon.com/Best-Sellers/zgbs", 20);
    const newReleases = await scrapeAmazonPage("https://www.amazon.com/gp/new-releases", 25); // more weight here

    const reddit = await getRedditProducts();

    // Combine + weight
    const combined = [
      ...newReleases.map(p => ({ ...p, score: 3.8 })),   // strongest priority: new & fresh
      ...movers.map(p => ({ ...p, score: 3.2 })),
      ...googleProducts.map(p => ({ ...p, score: p.score || 2.5 })),
      ...reddit.map(p => ({ ...p, score: 2.3 })),
      ...bestSellers.map(p => ({ ...p, score: 1.8 }))
    ];

    // Deduplicate – keep the one with best description & score
    const seen = new Map();
    const unique = combined.filter(p => {
      const asinMatch = p.link.match(/\/dp\/([A-Z0-9]{10})/);
      if (!asinMatch) return true;
      const asin = asinMatch[1];

      if (seen.has(asin)) {
        const existing = seen.get(asin);
        if ((p.description?.length || 0) > (existing.description?.length || 0) ||
            (p.score || 0) > (existing.score || 0)) {
          seen.set(asin, p); // replace with better version
        }
        return false;
      }

      seen.set(asin, p);
      return true;
    });

    // Final sort: high score → random freshness
    unique.sort((a, b) => b.score - a.score || Math.random() - 0.5);

    // Trim to reasonable size (frontend can handle 50–80 nicely)
    const finalProducts = unique.slice(0, 80);

    cache.timestamp = now;
    cache.data = finalProducts;

    return res.status(200).json({ products: finalProducts });

  } catch (e) {
    console.error('API handler crashed:', e);
    return res.status(200).json({ products: [], error: 'Backend fetch failed – try again soon' });
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
    .trim();
}
