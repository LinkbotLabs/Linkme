import { Redis } from '@upstash/redis';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  const id = Math.random().toString(36).substring(2, 8);

  try {
    // We now expect a SINGLE product object
    const product = req.body;

    if (!product || !product.title || !product.link) {
      return res.status(400).json({ error: 'Invalid product data' });
    }

    // Store under new FLOAT namespace
    await redis.set(
      `float:${id}`,
      JSON.stringify(product),
      { ex: 2592000 } // 30 days
    );

    res.status(200).json({ id });

  } catch (err) {
    console.error('Save error:', err);
    res.status(500).json({ error: 'Failed to save product' });
  }
}
