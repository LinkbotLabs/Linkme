import { Redis } from '@upstash/redis';

export default async function handler(req, res) {
  const base = "https://floatrising.com";
  let shareIds = [];

  // === NEW: Connect directly to Upstash Redis (no fetch needed) ===
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  try {
    // Get every key that starts with "float:"
    const keys = await redis.keys("float:*");
    shareIds = keys.map(k => k.replace("float:", ""));

    console.log(`Sitemap: Found ${shareIds.length} products`);
  } catch (err) {
    console.error("Redis error in sitemap:", err);
  }
  // === END NEW PART ===

  const productUrls = shareIds.map(id => `
  <url>
    <loc>${base}/s.html?id=${id}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

  <url>
    <loc>${base}</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>

  <url>
    <loc>${base}/pin.html</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>

${productUrls}

</urlset>`;

  res.setHeader("Content-Type", "application/xml");
  res.status(200).end(xml);
}
