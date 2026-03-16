export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req, res) {

  const token = process.env.TELEGRAM_TOKEN;

  // Health check for browser visits
  if (req.method !== "POST") {
    return res.status(200).json({ message: "Bot ready" });
  }

  try {

    const update = req.body || {};

    // DEBUG: see Telegram messages in Vercel logs
    console.log("TELEGRAM UPDATE:", JSON.stringify(update));

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
`🔥 Welcome to Float Rising Creator Bot

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
        headers: {
          "Content-Type": "application/json"
        },
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

    // PACK COMMAND (test version)
    if (text === "/pack") {

      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          chat_id: chatId,
          text:
`🔥 Float Rising Creator Pack

Bot connection confirmed.

Next step will pull 3 viral products from Float Rising.`
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
        text: "Send /pack to get viral products."
      })
    });

    return res.status(200).json({ ok: true });

  } catch (error) {

    console.error("BOT ERROR:", error);

    return res.status(200).json({ ok: true });

  }
}
