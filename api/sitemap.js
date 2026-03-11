export default async function handler(req, res) {

const base = "https://linkmetagshop.vercel.app";

try {

const response = await fetch(`${base}/api/search`);
const data = await response.json();

const products = data.products || [];

const urls = products.map(p => {
return `<url>
<loc>${base}/s.html?id=${p.id}</loc>
<changefreq>daily</changefreq>
<priority>0.8</priority>
</url>`;
}).join("");

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

<url>
<loc>${base}</loc>
<changefreq>daily</changefreq>
<priority>1.0</priority>
</url>

${urls}

</urlset>`;

res.setHeader("Content-Type", "application/xml");
res.statusCode = 200;
res.write(xml);
res.end();

} catch (error) {

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`;

res.setHeader("Content-Type", "application/xml");
res.statusCode = 200;
res.write(xml);
res.end();

}

}
