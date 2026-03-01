import { Redis } from '@upstash/redis';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Connect to your Upstash Redis (env vars auto-added by Vercel)
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  // Generate short random ID (same as before)
  const id = Math.random().toString(36).substring(2, 8);

  try {
    // Store the body ({ wall: [...], tags: {...} }) as JSON string
    // Key format: wall:abc123 (easy to namespace)
    // Optional: expire after 30 days (2592000 seconds) to auto-clean old shares
    await redis.set(`wall:${id}`, JSON.stringify(req.body), { ex: 2592000 });

    // Return the ID so frontend can build ?id= link
    res.status(200).json({ id });
  } catch (err) {
    console.error('Save error:', err);
    res.status(500).json({ error: 'Failed to save wall' });
  }
}
