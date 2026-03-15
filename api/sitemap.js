export default async function handler(req, res) {

  const base = "https://floatrising.com";

  let shareIds = [];

  try {
    const r = await fetch(base + "/api/get");
    const data = await r.json();
    shareIds = data.ids || [];
  } catch (e) {
    console.log("Share fetch failed");
  }

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
