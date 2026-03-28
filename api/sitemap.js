import { Redis } from '@upstash/redis';

export default async function handler(req, res) {

  const base = "https://floatrising.com";

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  let shareIds = [];

  try {
    const keys = await redis.keys("float:*");
    shareIds = keys.map(k => k.replace("float:", ""));
    console.log(`Sitemap: Found ${shareIds.length} products`);
  } catch (err) {
    console.error("Redis error in sitemap:", err);
  }

  const today = new Date().toISOString();

  // 🔥 STATIC SEO PAGES
  const staticPages = [
    "",
    "/viral-amazon-products.html",
    "/tiktok-made-me-buy-it.html",
    "/amazon-must-haves.html",
    "/viral-kitchen-gadgets.html",
    "/viral.html"
  ];

  const staticUrls = staticPages.map(path => `
  <url>
    <loc>${base}${path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>${path === "" ? "1.0" : "0.9"}</priority>
  </url>`).join("");

  // 🔥 PRODUCT PAGES
  const productUrls = shareIds.map(id => `
  <url>
    <loc>${base}/s.html?id=${id}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

${staticUrls}

${productUrls}

</urlset>`;

  res.setHeader("Content-Type", "application/xml");
  res.status(200).end(xml);
}
