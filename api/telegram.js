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

    /* -------- TRACKING -------- */
    async function trackUser(userId, source = "direct") {
      try {
        await fetch("https://floatrising.com/api/track-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            source,
            timestamp: Date.now()
          })
        });
      } catch (e) {
        console.log("Tracking failed");
      }
    }

    /* -------- AFFILIATE STORAGE -------- */
    async function saveAffiliate(userId, affiliateId) {
      try {
        await fetch("https://floatrising.com/api/affiliate/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, affiliateId })
        });
      } catch (e) {
        console.log("Save affiliate failed");
      }
    }

    async function getAffiliate(userId) {
      try {
        const res = await fetch(`https://floatrising.com/api/affiliate/get?userId=${userId}`);
        const data = await res.json();
        return data.affiliateId || null;
      } catch (e) {
        return null;
      }
    }

    /* -------- AMAZON CLEANER -------- */
    function cleanAmazonUrl(url, tag) {
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
    if (text.startsWith("/start")) {

      const parts = text.split(" ");
      const source = parts[1] || "direct";

      await trackUser(userId, source);

      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text:
`🔥 Float Rising Creator Bot

Send /pack to receive viral products.

First time? Set your affiliate:
👉 /pack YOUR-AFFILIATE-ID`
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
          text: `🔥 Discover more viral products\n\nhttps://floatrising.com`
        })
      });

      return res.status(200).json({ ok: true });
    }

    /* -------- PACK -------- */
    if (text.startsWith("/pack")) {

      const parts = text.split(" ");
      let affiliateId = parts[1];

      // Save affiliate if provided
      if (affiliateId) {
        await saveAffiliate(userId, affiliateId);
      }

      // Retrieve affiliate if not provided
      if (!affiliateId) {
        affiliateId = await getAffiliate(userId);

        if (!affiliateId) {
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: "❗ Please set your affiliate ID:\n/pack YOUR-AFFILIATE-ID"
            })
          });

          return res.status(200).json({ ok: true });
        }
      }

      const apiRes = await fetch("https://floatrising.com/api/feed");
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

      /* -------- SCORING -------- */
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

      /* -------- PICKS -------- */
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

      addPick(sorted[0]);
      addPick([...sorted].sort((a,b)=> (b.price||0)-(a.price||0))[0]);
      addPick([...sorted].sort((a,b)=> (b.reviews||0)-(a.reviews||0))[0]);

      const products = picks;

      /* -------- HEADER -------- */
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: `📦 Creator Pack Ready\n\n3 product cards coming 👇`
        })
      });

      /* -------- SEND PRODUCTS -------- */
      let index = 1;

      for (const product of products) {

        if (!product?.image) continue;

        const productWithAffiliate = {
          ...product,
          link: cleanAmazonUrl(product.url || product.link, affiliateId)
        };

        const saveRes = await fetch("https://floatrising.com/api/share", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(productWithAffiliate)
        });

        const saveData = await saveRes.json();

        if (!saveData.id) continue;

        const shareId = saveData.id;

        /* ✅ SAME FORMAT AS CHANNEL */
        const productUrl =
          `https://floatrising.com/s.html?id=${shareId}&utm_source=telegram_bot&utm_campaign=pack&utm_content=${index}&aff=${affiliateId}`;

        const cardImage =
          `https://floatrising.com/api/card-image?id=${shareId}`;

        const pinterestUrl =
          `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(productUrl)}&media=${encodeURIComponent(cardImage)}&description=${encodeURIComponent(product.title)}`;

        const caption =
`🔥 Creator Pick #${index}

${product.title}

🔎 View product card
${productUrl}

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
          text: `📦 Pack delivered\n\nType /more for more products.`
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
        text: "Send /pack to get viral products."
      })
    });

    return res.status(200).json({ ok: true });

  } catch (error) {
    console.error("BOT ERROR:", error);
    return res.status(200).json({ ok: true });
  }
}
