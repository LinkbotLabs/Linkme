import { Redis } from '@upstash/redis';

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).send("Missing ID");
  }

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  try {
    const data = await redis.get(`float:${id}`);

    if (!data) {
      return res.status(404).send("Not found");
    }

    const product = typeof data === "string" ? JSON.parse(data) : data;

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${req.headers.host}`;
    const redirectUrl = `${siteUrl}/s.html?id=${id}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
<title>${escapeHtml(product.title)}</title>

<meta property="og:title" content="${escapeHtml(product.title)}" />
<meta property="og:description" content="Trending gadget on Float Rising. Tap to shop." />
<meta property="og:image" content="${product.image}" />
<meta property="og:url" content="${siteUrl}/api/share-page?id=${id}" />
<meta name="twitter:card" content="summary_large_image" />

<meta http-equiv="refresh" content="0; url=${redirectUrl}" />

<meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body>
Redirecting to product...
</body>
</html>
`;

    res.setHeader("Content-Type", "text/html");
    res.status(200).send(html);

  } catch (err) {
    console.error("Share page error:", err);
    res.status(500).send("Server error");
  }
}

function escapeHtml(text = "") {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
