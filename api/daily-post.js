export default async function handler(req, res) {

  const token = process.env.TELEGRAM_TOKEN;

  if (req.method === "GET") {
    console.log("Daily post triggered manually");
  }

  try {

    const apiRes = await fetch("https://floatrising.com/api/search");
    const data = await apiRes.json();

    if (!data.products || data.products.length === 0) {
      return res.status(200).json({ message: "No products found" });
    }

    /* -------- VIRAL SCORING -------- */

    const scored = data.products.map(p => {

      const rating = p.rating || 4;
      const reviews = p.reviews || 50;
      const price = p.price || 20;

      const viralScore =
        (rating * 20) +
        Math.log(reviews + 1) * 40 +
        price * 0.5;

      return { ...p, viralScore };

    });

    const sorted = scored.sort((a, b) => b.viralScore - a.viralScore);
    const product = sorted[0];

    /* -------- CREATE PRODUCT CARD -------- */

    const shareRes = await fetch("https://floatrising.com/api/share", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(product)
    });

    const shareData = await shareRes.json();
    const shareId = shareData.id;

    /* -------- TELEGRAM CAPTION -------- */

    const caption =
`🔥 Today’s Viral Product Pick

${product.title}

${product.description || "Creators are sharing this trending product right now."}

🔎 View product card
https://floatrising.com/s.html?id=${shareId}&utm_source=telegram

📦 Get today's creator pack
https://t.me/floatrisingbot?start=pack`;

    /* -------- POST TO TELEGRAM -------- */

    await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: "@floatviral",
        photo: product.image,
        caption: caption
      })
    });

    return res.status(200).json({ message: "Posted to Telegram channel" });

  } catch (error) {

    console.error("Daily post error:", error);

    return res.status(500).json({ error: "Failed to post" });

  }

}
