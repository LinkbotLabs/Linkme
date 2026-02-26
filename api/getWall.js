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
    const data = await redis.get(`wall:${id}`);

    if (!data) {
      return res.status(404).json({ error: 'Not found' });
    }

    // data comes back as string → parse to object
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;

    res.status(200).json(parsed);
  } catch (err) {
    console.error('Load error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
}
