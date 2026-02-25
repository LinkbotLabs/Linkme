export default function handler(req, res) {
  const { id } = req.query;

  if (!global.walls || !global.walls[id]) {
    return res.status(404).json({ error: "Not found" });
  }

  res.status(200).json(global.walls[id]);
}
