export default async function handler(req, res) {

  const token = process.env.TELEGRAM_TOKEN;

  console.log("Bot triggered");

  try {

    /* -------- HELPER: CLEAN + AFFILIATE LINK -------- */

    function cleanAmazonUrl(url) {
      const tag = "davidshort-21"; // ✅ YOUR TAG

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

    /* -------- FETCH PRODUCTS -------- */

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

    /* -------- SAFETY CHECK -------- */

    if (!product.image) {
      console.log("Missing image, skipping");
      return res.status(200).json({ message: "Skipped (no image)" });
    }

    /* -------- 🔥 INJECT AFFILIATE LINK -------- */

    const productWithAffiliate = {
      ...product,
      link: cleanAmazonUrl(product.url || product.link)
    };

    /* -------- CREATE PRODUCT CARD -------- */

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
      "🔥 This could be your next viral post",
      "📈 People are sharing this fast",
      "⚡ This just started trending",
      "🛍️ This one is everywhere right now"
    ];

    const hook = hooks[Math.floor(Math.random() * hooks.length)];

    /* -------- CTA VARIATIONS -------- */

    const ctas = [
      "🔥 Post it. Test it. Repeat.",
      "🚀 Try this in your next post",
      "💡 Add this to your content loop",
      "📈 This could convert well",
      "👀 Worth testing today"
    ];

    const cta = ctas[Math.floor(Math.random() * ctas.length)];

    /* -------- CAPTION -------- */

    const caption = `${hook}

${product.title}

${product.description || "Creators are sharing this trending product right now."}

🔎 View product card
https://floatrising.com/s.html?id=${shareId}&utm_source=telegram&utm_campaign=bot&utm_content=${shareId}

${cta}`;
    /* -------- POST TO TELEGRAM -------- */

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

    /* -------- SUCCESS -------- */

    return res.status(200).json({
      message: "Posted",
      product: product.title,
      affiliateLink: productWithAffiliate.link
    });

  } catch (error) {

    console.error("Daily post error:", error);

    return res.status(500).json({ error: "Failed to post" });

  }

}
