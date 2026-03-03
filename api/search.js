// search.js  (api/search.js or similar for Vercel)

const ONE_DAY_MS = 1000 * 60 * 60 * 24;
const MAX_PRODUCTS = 8;
const DAILY_API_LIMIT = 100; // Protect free quota: 100 searches/day

const BASE_SITE = "https://linkmetagshop.vercel.app";

let cache = {
  day: null,
  products: [],           // final shuffled & sliced products
  apiCallsToday: 0,       // total Google API calls made today
  lastReset: null
};

const keywords = [
  "tiktok viral kitchen gadgets",
  "tiktok made me buy it",
  "viral amazon finds under 50",
  "trending home gadgets",
  "amazon must haves viral",
  "tiktok viral car accessories",
  "amazon cleaning hacks viral",
  "tech gadgets tiktok 2026"
];

function getTodayUTC() {
  return Math.floor(Date.now() / ONE_DAY_MS);
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

async function getKV() {
  // Use Vercel KV if available, else in-memory
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    const { createClient } = await import('@vercel/kv');
    return createClient({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN
    });
  }
  return null; // fallback to in-memory
}

async function loadCache(kv) {
  if (kv) {
    const data = await kv.get('search_cache');
    if (data) Object.assign(cache, data);
  }
  // Ensure day alignment
  const today = getTodayUTC();
  if (cache.day !== today) {
    cache = { day: today, products: [], apiCallsToday: 0, lastReset: Date.now() };
  }
}

async function saveCache(kv) {
  if (kv) {
    await kv.set('search_cache', cache, { ex: 60 * 60 * 48 }); // expire after 2 days
  }
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Content-Type", "application/json");

  try {
    const kv = await getKV();
    await loadCache(kv);

    const today = getTodayUTC();

    // Serve from cache if we have valid products and under soft limit
    if (cache.products.length === MAX_PRODUCTS && cache.day === today) {
      return res.status(200).json({
        cached: true,
        apiCallsToday: cache.apiCallsToday,
        count: cache.products.length,
        products: cache.products,
        site: BASE_SITE,
        quotaRemaining: DAILY_API_LIMIT - cache.apiCallsToday
      });
    }

    // Quota check: do NOT hit Google if we'd exceed 100 calls
    if (cache.apiCallsToday >= DAILY_API_LIMIT) {
      console.warn(`Quota protection: ${cache.apiCallsToday}/${DAILY_API_LIMIT} calls today. Returning cached or empty.`);
      return res.status(200).json({
        cached: true,
        quotaExceeded: true,
        apiCallsToday: cache.apiCallsToday,
        count: cache.products.length,
        products: cache.products.length ? cache.products : [],
        site: BASE_SITE,
        message: "Daily Google API quota reached (100 searches). Using cache."
      });
    }

    // Proceed to fetch from Google
    const allResults = [];

    for (const keyword of keywords) {
      if (cache.apiCallsToday >= DAILY_API_LIMIT) break;

      const query = `${keyword} site:amazon.com`;

      const googleRes = await fetch(
        `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_KEY}&cx=${process.env.CX_ID}&q=${encodeURIComponent(query)}&num=10`
      );

      cache.apiCallsToday++; // count every fetch attempt

      if (!googleRes.ok) {
        console.error(`Google fetch failed for "${keyword}": ${googleRes.status}`);
        continue;
      }

      const data = await googleRes.json();
      const validItems = (data.items || []).filter(item => item?.link?.includes("amazon.com"));
      allResults.push(...validItems);
    }

    // Deduplicate
    const uniqueMap = new Map();
    allResults.forEach(item => {
      if (item.link && !uniqueMap.has(item.link)) uniqueMap.set(item.link, item);
    });

    const uniqueResults = Array.from(uniqueMap.values());

    const now = Date.now();

    let products = uniqueResults.map((item, i) => {
      let image =
        item?.pagemap?.cse_image?.[0]?.src ||
        item?.pagemap?.cse_thumbnail?.[0]?.src ||
        "https://via.placeholder.com/600x600?text=Amazon+Pick";

      // Attempt better Amazon image via ASIN
      const cleanLink = item.link.split("?")[0];
      const asinMatch = cleanLink.match(/\/(dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})/i);
      if (asinMatch?.[2]) {
        image = `https://m.media-amazon.com/images/I/${asinMatch[2]}.jpg`;
      }
      image = image.split("?")[0].split(";")[0];

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

    // Update cache
    cache.day = today;
    cache.products = finalProducts;

    await saveCache(kv);

    return res.status(200).json({
      cached: false,
      apiCallsToday: cache.apiCallsToday,
      count: finalProducts.length,
      products: finalProducts,
      site: BASE_SITE,
      quotaRemaining: DAILY_API_LIMIT - cache.apiCallsToday
    });

  } catch (error) {
    console.error("Handler error:", error);
    return res.status(500).json({
      error: "Internal error",
      details: error.message
    });
  }
}
