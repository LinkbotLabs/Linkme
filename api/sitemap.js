export default async function handler(req, res) {

  const base = "https://www.floatrising.com";

  const pages = [
    "",
    "/remote-work-starter-kit.html",
    "/meditation-books.html",
    "/meditation-accessories.html",
    "/fine-dining-at-home.html",
    "/surreal-art-prints.html"
  ];

  const today = new Date().toISOString().split("T")[0];

  const urls = pages.map(path => `
    <url>
      <loc>${base}${path}</loc>
      <lastmod>${today}</lastmod>
      <changefreq>${path === "" ? "daily" : "weekly"}</changefreq>
      <priority>${path === "" ? "1.0" : "0.9"}</priority>
    </url>
  `).join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  res.setHeader("Content-Type", "application/xml");
  res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate");
  res.status(200).send(xml);
}
