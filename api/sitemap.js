export default async function handler(req, res) {

  const base = "https://linkmetagshop.vercel.app";

  try {

    const response = await fetch(`${base}/api/search`);
    const data = await response.json();

    const products = data.products || [];

    const urls = products.map(p => {
      return `
      <url>
        <loc>${base}/s.html?id=${p.id}</loc>
        <changefreq>daily</changefreq>
        <priority>0.8</priority>
      </url>`;
    }).join("");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    ${urls}
    </urlset>`;

    res.setHeader("Content-Type", "text/xml");
    res.status(200).send(xml);

  } catch (error) {

    res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`);

  }
}
