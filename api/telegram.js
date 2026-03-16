export const config = {
  api: {
    bodyParser: true
  }
};

export default async function handler(req, res) {

  const token = process.env.TELEGRAM_TOKEN;

  // allow browser test
  if (req.method !== "POST") {
    return res.status(200).json({ message: "Bot ready" });
  }

  try {

    const update = req.body;

    if (!update.message) {
      return res.status(200).json({ ok: true });
    }

    const chatId = update.message.chat.id;
    const text = (update.message.text || "").trim();

    // START COMMAND
    if (text === "/start") {

      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          chat_id: chatId,
          text:
"🔥 Float Rising Creator Bot\n\nSend /pack to receive 3 viral products creators are posting right now."
        })
      });

      return res.status(200).json({ ok: true });
    }

    // PACK COMMAND
    if (text === "/pack") {

      const apiRes = await fetch("https://floatrising.com/api/search");
      const data = await apiRes.json();

      if (!data.products || data.products.length === 0) {

        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            chat_id: chatId,
            text: "No products available right now."
          })
        });

        return res.status(200).json({ ok: true });
      }

      const shuffled = data.products.sort(() => 0.5 - Math.random());
      const products = shuffled.slice(0, 3);

      for (const product of products) {

  // Save product to Redis
  const saveRes = await fetch("https://floatrising.com/api/share", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(product)
  });

  const saveData = await saveRes.json();
  const shareId = saveData.id;

  const caption =
    📌 More viral finds
https://floatrising.com
`🔥 Creator Product

${product.title}

${product.description || "Creators are sharing this trending product right now."}

View product card
https://floatrising.com/api/share-page?id=${shareId}&utm_source=telegram_bot`;

  await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      chat_id: chatId,
      photo: product.image,
      caption: caption
    })
  });

}
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: "📦 Creator pack delivered. Come back tomorrow for more viral products."
        })
      });

      return res.status(200).json({ ok: true });
    }

    // DEFAULT RESPONSE
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: "Send /pack to receive today's viral products."
      })
    });

    return res.status(200).json({ ok: true });

  } catch (error) {

    console.error("BOT ERROR:", error);
    return res.status(200).json({ ok: true });

  }

}
