import { Redis } from '@upstash/redis';

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Missing id' });
  }

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  try {
    const data = await redis.get(`float:${id}`);

    if (!data) {
      return res.status(404).json({ error: 'Not found' });
    }

    const p = typeof data === 'string' ? JSON.parse(data) : data;

    // 🔧 NORMALISE EVERYTHING (THIS IS THE FIX)
    const product = {
      id,
      title: p.title || "Trending Product",
      image: p.image || "",
      link: p.link || p.url || "",
      price: p.price || null,
      reviews: p.reviews || null,
      rating: p.rating || null
    };

    // ❗ HARD GUARD (ONLY REAL FAILURE CASE)
    if (!product.image || !product.title) {
      return res.status(404).json({
        error: 'Invalid product data'
      });
    }

    return res.status(200).json(product);

  } catch (err) {
    console.error('Load error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
}
