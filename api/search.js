export default async function handler(req, res) {
  const { q, start = 1 } = req.query;

  if (!q) {
    return res.status(400).json({ error: "Missing query parameter" });
  }

  try {
    const googleRes = await fetch(
      `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_KEY}&cx=${process.env.CX_ID}&q=${encodeURIComponent(q)}&start=${start}`
    );

    const data = await googleRes.json();

    if (!googleRes.ok) {
      return res.status(googleRes.status).json({
        error: data.error?.message || "Google API error"
      });
    }

    return res.status(200).json({
      items: data.items || []
    });

  } catch (error) {
    return res.status(500).json({
      error: "Search failed",
      details: error.message
    });
  }
}
