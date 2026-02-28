export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).send("Missing image URL");
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(404).send("Image not found");
    }

    const buffer = await response.arrayBuffer();

    res.setHeader("Content-Type", response.headers.get("content-type"));
    res.setHeader("Cache-Control", "public, max-age=86400");

    res.send(Buffer.from(buffer));
  } catch (err) {
    res.status(500).send("Image proxy failed");
  }
}
