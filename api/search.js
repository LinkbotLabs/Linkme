const cache = {};

export default async function handler(req, res) {
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ error: "Missing query parameter" });
  }

  const ONE_DAY = 1000 * 60 * 60 * 24;

  if (cache[q] && Date.now() - cache[q].time < ONE_DAY) {
    return res.status(200).json(cache[q].data);
  }

  try {
    const googleRes = await fetch(
      `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_KEY}&cx=${process.env.CX_ID}&searchType=image&q=${encodeURIComponent(q)}`
    );

    const data = await googleRes.json();

    if (!googleRes.ok) {
      return res.status(googleRes.status).json({
        error: data.error?.message || "Google API error"
      });
    }

    const formatted = {
      items: (data.items || []).map(item => ({
        title: item.title,
        link: item.image?.contextLink || item.link,
        image: item.link
      }))
    };

    cache[q] = {
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
