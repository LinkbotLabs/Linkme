export default async function handler(req, res) {

  const token = process.env.TELEGRAM_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  try {

    const apiRes = await fetch("https://floatrising.com/api/search");
    const data = await apiRes.json();

    if (!data.products || data.products.length === 0) {
      return res.status(200).json({ message: "No products found" });
    }

    // Shuffle products so packs change daily
    const shuffled = data.products.sort(() => 0.5 - Math.random());

    // Take first 3
    const products = shuffled.slice(0, 3);

    // Header message
    const header = `🔥 Float Rising Creator Pack

3 viral products creators are posting today.

Pin them. Share them. Earn from them 👇`;

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: header
      })
    });

    // Post each product
    for (let i = 0; i < products.length; i++) {

      const p = products[i];

      const productUrl =
        `https://floatrising.com/s.html?id=${p.id}&utm_source=telegram`;

      const caption = `🔥 ${p.title}

${p.description || "Creators are sharing this trending product right now."}

📌 Pin this product
📦 Share with creators

👇 Open the product card
${productUrl}`;

      await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          photo: p.image,
          caption: caption,
          reply_markup: {
            inline_keyboard: [
              [
                { text: "📌 Open Product Card", url: productUrl }
              ]
            ]
          }
        })
      });

    }

    // Footer message
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: `🚀 Discover more viral products creators are posting daily.

https://floatrising.com`
      })
    });

    res.status(200).json({ message: "Creator Pack posted" });

  } catch (error) {

    console.error(error);

    res.status(500).json({ error: "Bot failed to post" });

  }

}
