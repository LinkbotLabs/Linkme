export const config = {
  api: {
    bodyParser: true
  }
};

export default async function handler(req, res) {

  const token = process.env.TELEGRAM_TOKEN;

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

    // START
    if (text === "/start") {

      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text:
`🔥 Float Rising Creator Bot

Send /pack to receive 3 viral products creators are posting right now.

Perfect for Pinterest and TikTok creators.`
        })
      });

      return res.status(200).json({ ok: true });
    }

    // PACK
    if (text === "/pack") {

      const apiRes = await fetch("https://floatrising.com/api/search");
      const data = await apiRes.json();

      if (!data.products || data.products.length === 0) {

        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: "No products available right now."
          })
        });

        return res.status(200).json({ ok: true });
      }
if (text === "/more") {

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      chat_id: chatId,
      text:
`🔥 Discover more viral products

Browse the live product feed creators are sharing.

https://floatrising.com`
    })
  });

  return res.status(200).json({ ok: true });
}
      const shuffled = data.products.sort(() => 0.5 - Math.random());
      const products = shuffled.slice(0, 3);

      for (const product of products) {

        // Save product card
        const saveRes = await fetch("https://floatrising.com/api/share", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(product)
        });

        const saveData = await saveRes.json();
        const shareId = saveData.id;

        const productUrl = `https://floatrising.com/api/share-page?id=${shareId}&utm_source=telegram_bot`;

       const cardImage =
  `https://floatrising.com/api/card-image?id=${shareId}`;

const pinterestUrl =
  `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(productUrl)}&media=${encodeURIComponent(cardImage)}&description=${encodeURIComponent(product.title)}`; 
        const caption =
`🔥 Creator Product

${product.title}

Trending product creators are posting.

View product card
${productUrl}

🔎 Discover more viral finds
https://floatrising.com`;

        await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            photo: product.image,
            caption: caption,
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "📌 Create Pinterest Pin",
                    url: pinterestUrl
                  }
                ]
              ]
            }
          })
        });

      }

      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text:
`📦 Creator pack delivered

3 products ready for content.

Come back tomorrow for the next creator pack.`
        })
      });

      return res.status(200).json({ ok: true });
    }

    // DEFAULT
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: "Send /pack to receive today's viral creator products."
      })
    });

    return res.status(200).json({ ok: true });

  } catch (error) {

    console.error("BOT ERROR:", error);
    return res.status(200).json({ ok: true });

  }

}
