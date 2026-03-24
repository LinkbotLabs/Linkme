import { Redis } from '@upstash/redis';

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userId, affiliateId } = req.body;

  if (!userId || !affiliateId) {
    return res.status(400).json({ error: "Missing userId or affiliateId" });
  }

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  try {
    // ✅ Save using same namespace as get.js
    await redis.set(`float:aff:${userId}`, affiliateId);

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error("Save affiliate error:", error);
    return res.status(500).json({ error: "Server error" });
  }
}
