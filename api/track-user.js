export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(200).json({ ok: true });
  }

  try {
    const { userId, source, timestamp } = req.body;

    console.log("📊 New User:", {
      userId,
      source,
      time: new Date(timestamp).toLocaleString()
    });

    return res.status(200).json({ ok: true });

  } catch (error) {
    console.error("TRACK ERROR:", error);
    return res.status(200).json({ ok: true });
  }
}
