let users = new Set();
let sources = {}; // track traffic sources

export default async function handler(req, res) {

  // 👉 GET = view full stats
  if (req.method === "GET") {
    return res.status(200).json({
      totalUsers: users.size,
      sources
    });
  }

  // 👉 Only allow POST for tracking
  if (req.method !== "POST") {
    return res.status(200).json({ ok: true });
  }

  try {
    const { userId, source, timestamp } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    const src = source || "direct";

    // ✅ Track unique users
    const isNewUser = !users.has(userId);
    users.add(userId);

    // ✅ Track source counts
    sources[src] = (sources[src] || 0) + 1;

    // 📊 Logs
    console.log(
      isNewUser ? "🆕 New User" : "↩️ Returning",
      "| ID:", userId,
      "| Source:", src,
      "| Total:", users.size
    );

    return res.status(200).json({
      ok: true,
      totalUsers: users.size
    });

  } catch (error) {
    console.error("TRACK ERROR:", error);
    return res.status(200).json({ ok: true });
  }
}
