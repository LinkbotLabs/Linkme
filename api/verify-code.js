export default function handler(req, res) {
  const { code } = req.body;

  const validCodes = process.env.VALID_CODES
    ? process.env.VALID_CODES.split(",")
    : [];

  if (validCodes.includes(code)) {
    return res.status(200).json({ success: true });
  }

  return res.status(401).json({ success: false });
}
