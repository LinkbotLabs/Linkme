export const config = {
  api: {
    bodyParser: true,
  },
};
export default async function handler(req, res) {

  const token = process.env.TELEGRAM_TOKEN;

  try {

    const body = req.body || {};

    if (!body.message) {
      return res.status(200).json({ message: "Bot ready" });
    }

    const chatId = body.message.chat.id;
    const text = body.message.text;
    // START COMMAND
    if (text === "/start") {

      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: `🔥 Welcome to Float Rising Creator Bot

Creators use this bot to discover viral products and post them on Pinterest, TikTok and Reels.

Commands:

/pack → Get 3 viral products
/site → Open Float Rising

👇 Try it now`
        })
      });

      return res.status(200).json({ ok: true });
    }

    // SITE COMMAND
    if (text === "/site") {

      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: "🚀 Discover viral products here",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "🔥 Open Float Rising",
                  url: "https://floatrising.com"
                }
              ]
            ]
          }
        })
      });

      return res.status(200).json({ ok: true });
    }

    // PACK COMMAND
    if (text === "/pack") {

      const apiRes = await fetch("https://floatrising.com/api/search");
      const data = await apiRes.json();

      if (!data.products || data.products.length === 0) {
        return res.status(200).json({ message: "No products found" });
      }

      const shuffled = data.products.sort(() => 0.5 - Math.random());
      const products = shuffled.slice(0, 3);

      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: `🔥 Float Rising Creator Pack

3 viral products creators are posting today 👇`
        })
      });

      for (const p of products) {

        const productUrl =
          `https://floatrising.com/s.html?id=${p.id}&utm_source=telegram`;

        const pinCaption =
`Save this viral product before it sells out 🔥

Creators are sharing this trending product right now.

See the product here 👇
${productUrl}`;

        const caption =
`🔥 ${p.title}

${p.description || "Creators are sharing this trending product."}

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
                  {
                    text: "📌 Open Product Card",
                    url: productUrl
                  }
                ]
              ]
            }
          })
        });

      }

      return res.status(200).json({ ok: true });

    }

    res.status(200).json({ message: "Command ignored" });

  } catch (error) {

    console.error(error);
    res.status(500).json({ error: "Bot failed" });

  }

}
