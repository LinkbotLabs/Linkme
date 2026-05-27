import { Redis } from '@upstash/redis';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  try {
    const product = req.body;

    if (!product || !product.title || !product.link) {
      return res.status(400).json({ error: 'Invalid product data' });
    }

    // 🔥 FORCE ID = ASIN (THIS IS THE FIX)
    const id =
      product.asin ||
      product.id ||
      product.link?.match(/\/dp\/([A-Z0-9]{10})/)?.[1];

    if (!id) {
      return res.status(400).json({ error: 'Missing ASIN' });
    }

    await redis.set(
      `float:${id}`,
      JSON.stringify({
        ...product,
        id
      }),
      { ex: 2592000 }
    );

    return res.status(200).json({ id });

  } catch (err) {
    console.error('Save error:', err);
    return res.status(500).json({ error: 'Failed to save product' });
  }
}
