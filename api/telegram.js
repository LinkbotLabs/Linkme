export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req, res) {

  const token = process.env.TELEGRAM_TOKEN;

  if (req.method !== "POST") {
    return res.status(200).json({ message: "Bot ready" });
  }

  try {

    const update = req.body;

    console.log("Telegram update:", update);

    if (!update.message) {
      return res.status(200).json({ ok: true });
    }

    const chatId = update.message.chat.id;
    const text = update.message.text || "";

    if (text === "/start") {

      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: "🔥 Float Rising Bot is working.\n\nSend /pack to get 3 viral products."
        })
      });

      return res.status(200).json({ ok: true });
    }

    if (text === "/pack") {

      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: "Creator pack coming next (bot connection confirmed)."
        })
      });

      return res.status(200).json({ ok: true });
    }

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

    console.error("Bot error:", error);

    return res.status(200).json({ ok: true });

  }

}
