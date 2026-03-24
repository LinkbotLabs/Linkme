import { Redis } from '@upstash/redis';

export default async function handler(req, res) {

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  try {

    const ids = await redis.lrange("float:feed", 0, 20);

    if (!ids || ids.length === 0) {
      return res.status(200).json({ products: [] });
    }

    const products = await Promise.all(
      ids.map(id => redis.get(`float:${id}`))
    );

    const parsed = products
      .filter(Boolean)
      .map(p => typeof p === "string" ? JSON.parse(p) : p);

    res.status(200).json({ products: parsed });

  } catch (err) {
    console.error("Feed error:", err);
    res.status(500).json({ products: [] });
  }
}
