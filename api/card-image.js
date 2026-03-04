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

  const image = `
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#111"/>
      
      <image href="${product.image}" x="60" y="100" width="400" height="400" />
      
      <text x="520" y="220" fill="white" font-size="48" font-family="Arial" font-weight="bold">
        ${product.title.substring(0, 60)}
      </text>

      <text x="520" y="300" fill="#00ffcc" font-size="40" font-family="Arial">
        ${product.price || ""}
      </text>

      <text x="520" y="380" fill="#ccc" font-size="28" font-family="Arial">
        🔥 Trending on Float Rising
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
