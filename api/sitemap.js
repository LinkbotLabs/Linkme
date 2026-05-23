import { Redis } from '@upstash/redis';

export default async function handler(req, res) {
  const base = "https://floatrising.com";

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  let shareIds = [];

  try {
    let cursor = 0;

    do {
      const [nextCursor, batch] = await redis.scan(cursor, {
        match: "float:*",
        count: 100,
      });

      cursor = Number(nextCursor);
      shareIds.push(...batch);

    } while (cursor !== 0);

    shareIds = shareIds.map(k => k.replace("float:", ""));

  } catch (err) {
    console.error("Redis error in sitemap:", err);
  }

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
      <changefreq>weekly</changefreq>
      <priority>${path === "" ? "1.0" : "0.8"}</priority>
    </url>
  `).join("");

  const productUrls = shareIds.map(id => `
    <url>
      <loc>${base}/s.html?id=${id}</loc>
      <changefreq>monthly</changefreq>
      <priority>0.7</priority>
    </url>
  `).join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    ${staticUrls}
    ${productUrls}
  </urlset>`;

  res.setHeader("Content-Type", "application/xml");
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate");
  res.status(200).send(xml);
}
