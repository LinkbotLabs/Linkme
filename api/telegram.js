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
const userId = update.message.from.id;
    /* -------- HELPER: CLEAN + AFFILIATE -------- */

    function cleanAmazonUrl(url) {
      const tag = "davidshort-21";

      try {
        if (!url) return url;

        const match = url.match(/\/dp\/([A-Z0-9]{10})/);

        if (!match) {
          const u = new URL(url);
          u.searchParams.set("tag", tag);
          return u.toString();
        }

        const asin = match[1];
        return `https://www.amazon.com/dp/${asin}?tag=${tag}`;

      } catch {
        return url;
      }
    }

    /* -------- START -------- */

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

    /* -------- MORE -------- */

    if (text === "/more") {

      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

    /* -------- PACK -------- */

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

      /* -------- SMART PICKS (NO DUPES) -------- */

      const picks = [];
      const usedIds = new Set();

      function addPick(p) {
        if (!p) return;
        const key = p.url || p.title;
        if (!usedIds.has(key)) {
          picks.push(p);
          usedIds.add(key);
        }
      }

      addPick(sorted[0]); // viral
      addPick([...sorted].sort((a,b)=> (b.price||0)-(a.price||0))[0]); // high value
      addPick([...sorted].sort((a,b)=> (b.reviews||0)-(a.reviews||0))[0]); // social proof

      const products = picks;

      /* -------- HEADER -------- */

      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text:
`📦 Creator Pack Ready

Today's best viral products for content creators.

3 product cards coming next 👇`
        })
      });

      /* -------- SEND PRODUCTS -------- */

      let index = 1;

      for (const product of products) {

        if (!product?.image) continue;

        /* 🔥 INJECT AFFILIATE */
        const productWithAffiliate = {
          ...product,
          link: cleanAmazonUrl(product.url || product.link)
        };

        const saveRes = await fetch("https://floatrising.com/api/share", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(productWithAffiliate)
        });

        const saveData = await saveRes.json();

        if (!saveData.id) continue;

        const shareId = saveData.id;

        const productUrl =
          `https://floatrising.com/api/share-page?id=${shareId}&utm_source=telegram_bot&utm_campaign=pack&utm_content=${index}`;

        const cardImage =
          `https://floatrising.com/api/card-image?id=${shareId}`;

        const pinterestUrl =
          `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(productUrl)}&media=${encodeURIComponent(cardImage)}&description=${encodeURIComponent(product.title)}`;

        const caption =
`🔥 Creator Pick #${index}

${product.title}

Trending product creators are posting right now.

🔎 View product card
${productUrl}

🚀 Ready to post on Pinterest
Tap below 👇`;

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

        index++;

      }

      /* -------- FOOTER -------- */

      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text:
`📦 Creator pack delivered

3 products ready for content.

Type /more to discover more viral products.`
        })
      });

      return res.status(200).json({ ok: true });
    }

    /* -------- DEFAULT -------- */

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
