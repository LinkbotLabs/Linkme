export default async function handler(req, res) {

  const token = process.env.TELEGRAM_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  try {

    const apiRes = await fetch("https://floatrising.com/api/search");
    const data = await apiRes.json();

    if (!data.products || data.products.length === 0) {
      return res.status(200).json({ message: "No products found" });
    }

    // shuffle products
    const shuffled = data.products.sort(() => 0.5 - Math.random());

    // select 3
    const products = shuffled.slice(0, 3);

    // HEADER MESSAGE
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: `🔥 Float Rising Creator Pack

3 viral products ready for creators today.

Pin them. Share them. Earn from them 👇`
      })
    });

    // LOOP PRODUCTS
    for (const p of products) {

      const productUrl =
        `https://floatrising.com/s.html?id=${p.id}&utm_source=telegram`;

      const pinCaption =
`Save this viral product before it sells out 🔥

Creators are sharing this trending product right now.

See the product here 👇
${productUrl}`;

      const pinIdeas =
`📌 Pin Ideas

1️⃣ Amazon Finds You Need
2️⃣ Viral Products Creators Love
3️⃣ TikTok Made Me Buy It`;

      const caption =
`🔥 ${p.title}

${p.description || "Creators are sharing this trending product."}

${pinIdeas}

📌 Pinterest Caption
${pinCaption}`;

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

    // FOOTER
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: `🚀 Discover more viral products

https://floatrising.com`
      })
    });

    res.status(200).json({ message: "Creator pack posted" });

  } catch (error) {

    console.error(error);
    res.status(500).json({ error: "Bot failed" });

  }

}
