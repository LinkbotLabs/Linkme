export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const id = Math.random().toString(36).substring(2, 8);

  global.walls = global.walls || {};
  global.walls[id] = req.body;

  res.status(200).json({ id });
}
