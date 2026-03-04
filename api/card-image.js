import { Redis } from '@upstash/redis';

export const config = {
  runtime: "edge",
};

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return new Response("Missing ID", { status: 400 });
  }

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  const data = await redis.get(`float:${id}`);
  if (!data) {
    return new Response("Not found", { status: 404 });
  }

  const product = typeof data === "string" ? JSON.parse(data) : data;

  const title = escapeSvg((product.title || "").substring(0, 60));
  const price = escapeSvg(product.price || "");

  const image = `
  <svg width="1000" height="1500" xmlns="http://www.w3.org/2000/svg">

    <!-- Background -->
    <rect width="100%" height="100%" fill="#111"/>

    <!-- Soft Gradient Overlay -->
    <defs>
      <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#111" stop-opacity="0"/>
        <stop offset="100%" stop-color="#000" stop-opacity="0.6"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#fade)" />

    <!-- Product Image -->
    <image 
      href="${product.image}" 
      x="100" 
      y="180" 
      width="800" 
      height="800" 
      preserveAspectRatio="xMidYMid meet"
    />

    <!-- Title -->
    <text 
      x="500" 
      y="1080" 
      fill="white" 
      font-size="60" 
      font-family="Arial, sans-serif" 
      font-weight="bold"
      text-anchor="middle">
      ${title}
    </text>

    <!-- Price -->
    <text 
      x="500" 
      y="1180" 
      fill="#00ffcc" 
      font-size="50" 
      font-family="Arial, sans-serif"
      text-anchor="middle">
      ${price}
    </text>

    <!-- Hook -->
    <text 
      x="500" 
      y="1280" 
      fill="#cccccc" 
      font-size="36" 
      font-family="Arial, sans-serif"
      text-anchor="middle">
      🔥 Trending on Float Rising
    </text>

    <!-- Brand Footer -->
    <text 
      x="500" 
      y="1400" 
      fill="#888"
      font-size="28"
      font-family="Arial, sans-serif"
      text-anchor="middle">
      Float Rising
    </text>

  </svg>
  `;

  return new Response(image, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400",
    },
  });
}

function escapeSvg(text = "") {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
