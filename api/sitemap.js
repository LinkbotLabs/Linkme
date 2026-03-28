import { Redis } from '@upstash/redis';

export default async function handler(req, res) {
  const base = "https://floatrising.com";

  // OPTIONAL: keep Redis (future use)
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  // === CORE SEO PAGES ===
  const pages = [
    "",
    "/viral-amazon-products.html",
    "/tiktok-made-me-buy-it.html",
    "/amazon-must-haves.html",
    "/viral-kitchen-gadgets.html",
    "/pin.html"
  ];

  const pageUrls = pages.map(path => `
  <url>
    <loc>${base}${path}</loc>
    <changefreq>daily</changefreq>
    <priority>${path === "" ? "1.0" : "0.9"}</priority>
  </url>
  `).join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

${pageUrls}

</urlset>`;

  res.setHeader("Content-Type", "application/xml");
  res.status(200).end(xml);
}
