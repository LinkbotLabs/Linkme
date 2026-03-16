export default async function handler(req, res) {

  const token = process.env.TELEGRAM_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  const apiRes = await fetch("https://floatrising.com/api/search");
  const data = await apiRes.json();

  if (!data.products || data.products.length === 0) {
    return res.status(200).json({ message: "No products found" });
  }

  const product =
    data.products[Math.floor(Math.random() * data.products.length)];

  const caption = `🔥 ${product.title}

${product.description}

See it here 👇
https://floatrising.com/s.html?id=${product.id}`;

  await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      photo: product.image,
      caption: caption
    })
  });

  res.status(200).json({ message: "Posted to Telegram" });

}
