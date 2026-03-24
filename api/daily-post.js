export default async function handler(req, res) {

  const token = process.env.TELEGRAM_TOKEN;

  console.log("Bot triggered");

  try {

    /* -------- HELPER: CLEAN + AFFILIATE LINK -------- */

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

    /* -------- FETCH PRODUCTS (CAN SWITCH TO /api/feed LATER) -------- */

    const apiRes = await fetch("https://floatrising.com/api/search");
    const data = await apiRes.json();

    if (!data.products || data.products.length === 0) {
      return res.status(200).json({ message: "No products found" });
    }

    /* -------- VIRAL SCORING -------- */

    const scored = data.products.map(p => {

      const rating = p.rating || 4;
      const reviews = p.reviews || 50;
      const price = p.price || 20;

      const viralScore =
        (rating * 20) +
        Math.log(reviews + 1) * 40 +
        price * 0.5 +
        Math.random() * 20;

      return { ...p, viralScore };

    });

    const sorted = scored.sort((a, b) => b.viralScore - a.viralScore);

    /* -------- SMART PICK -------- */

    const pool = sorted.slice(0, 5);
    const product = pool[Math.floor(Math.random() * pool.length)];

    if (!product.image) {
      console.log("Missing image, skipping");
      return res.status(200).json({ message: "Skipped (no image)" });
    }

    /* -------- INJECT AFFILIATE -------- */

    const productWithAffiliate = {
      ...product,
      link: cleanAmazonUrl(product.url || product.link)
    };

    /* -------- CREATE SHARE CARD (THIS FEEDS YOUR LOOP) -------- */

    const shareRes = await fetch("https://floatrising.com/api/share", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(productWithAffiliate)
    });

    const shareData = await shareRes.json();

    if (!shareData.id) {
      console.log("Share failed");
      return res.status(200).json({ message: "Share failed" });
    }

    const shareId = shareData.id;

    /* -------- HOOK ENGINE -------- */

    const hooks = [
      "🔥 This is blowing up right now",
      "🚀 Creators are jumping on this",
      "👀 This one is getting attention",
      "💡 Trending product spotted",
      "📈 People are sharing this fast",
      "⚡ This just started trending"
    ];

    const hook = hooks[Math.floor(Math.random() * hooks.length)];

    /* -------- CTA VARIATIONS -------- */

    const ctas = [
      "🔥 Post it. Test it. Repeat.",
      "🚀 Try this in your next post",
      "💡 Add this to your content loop",
      "📈 This could convert well"
    ];

    const cta = ctas[Math.floor(Math.random() * ctas.length)];

    /* -------- PROMO BLOCK (THIS IS THE KEY ADDITION) -------- */

    const promo = `

💰 Creator Opportunity

• Auto-add your Amazon affiliate ID  
• Get your product cards featured  
• Use the bot to generate viral content  

👉 Start here: https://floatrising.com
👉 Get products: https://t.me/FloatRisingBot
`;

    /* -------- FINAL CAPTION -------- */

    const caption = `${hook}

${product.title}

${product.description || "Creators are sharing this trending product right now."}

🔎 View product card
https://floatrising.com/s.html?id=${shareId}&utm_source=telegram&utm_campaign=channel&utm_content=${shareId}

${cta}

${promo}`;

    /* -------- POST TO TELEGRAM CHANNEL -------- */

    const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: "@floatviral",
        photo: product.image,
        caption: caption
      })
    });

    const tgData = await tgRes.json();
    console.log("Telegram response:", tgData);

    return res.status(200).json({
      message: "Posted",
      product: product.title
    });

  } catch (error) {

    console.error("Daily post error:", error);

    return res.status(500).json({ error: "Failed to post" });

  }

}
