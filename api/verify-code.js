export default function handler(req, res) {
  const { code } = req.body;

  // Your secret codes (HIDDEN from users)
  const validCodes = [
    "FR-TEST2026",
    "FR-PAID-001",
    "FR-PAID-002"
  ];

  if (validCodes.includes(code)) {
    return res.status(200).json({ success: true });
  }

  return res.status(401).json({ success: false });
}
