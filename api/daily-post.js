export default async function handler(req, res) {

  const token = process.env.TELEGRAM_TOKEN;

  try {

    const response = await fetch("https://floatrising.com/api/search");
    const data = await response.json();

    if (!data.products || data.products.length === 0) {
      return res.status(200).json({ message: "No products found" });
    }

    // pick random product
    const shuffled = data.products.sort(() => 0.5 - Math.random());
    const product = shuffled[0];

    const caption =
`🔥 Daily Viral Product

${product.title}

${product.description || "Creators are sharing this trending product right now."}

Explore more viral finds 👇
https://floatrising.com

📦 Request product pack
Daily viral finds`;

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
