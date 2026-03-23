let users = new Set(); // temporary in-memory storage

export default async function handler(req, res) {

  // 👉 GET = view stats in browser
  if (req.method === "GET") {
    return res.status(200).json({
      totalUsers: users.size
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

    // ✅ Add user (unique)
    const isNewUser = !users.has(userId);
    users.add(userId);

    // 📊 Log useful info
    console.log(
      isNewUser ? "🆕 New User" : "↩️ Returning User",
      "| ID:", userId,
      "| Source:", source || "direct",
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
