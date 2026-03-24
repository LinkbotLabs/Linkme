export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userId, affiliateId } = req.body;

    if (!userId || !affiliateId) {
      return res.status(400).json({ error: "Missing userId or affiliateId" });
    }

    // 🔐 Replace this with your real storage (Redis / Supabase / KV)
    await fetch("https://your-kv-store/set", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        key: `aff:${userId}`,
        value: affiliateId
      })
    });

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error("Save affiliate error:", error);
    return res.status(500).json({ error: "Server error" });
  }
}
