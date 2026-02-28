const cache = {};

export default async function handler(req, res) {
  const { q, start = 1 } = req.query;

  if (!q) {
    return res.status(400).json({ error: "Missing query parameter" });
  }

  const ONE_DAY = 1000 * 60 * 60 * 24;
  const cacheKey = `${q}_${start}`;

  // ✅ Serve from cache if valid
  if (
    cache[cacheKey] &&
    Date.now() - cache[cacheKey].time < ONE_DAY
  ) {
    return res.status(200).json(cache[cacheKey].data);
  }

  try {
    const googleRes = await fetch(
      `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_KEY}&cx=${process.env.CX_ID}&q=${encodeURIComponent(q)}&start=${start}`
    );

    const data = await googleRes.json();

    // ❌ If Google returned error (like 429), do NOT cache
    if (!googleRes.ok) {
      return res.status(googleRes.status).json({
        error: data.error?.message || "Google API error"
      });
    }

    // ❌ If no items returned, do NOT cache
    if (!data.items || data.items.length === 0) {
      return res.status(200).json({ items: [] });
    }

    const formatted = {
      items: data.items
    };

    // ✅ Only cache valid results
    cache[cacheKey] = {
      data: formatted,
      time: Date.now()
    };

    return res.status(200).json(formatted);

  } catch (error) {
    return res.status(500).json({
      error: "Search failed",
      details: error.message
    });
  }
}
