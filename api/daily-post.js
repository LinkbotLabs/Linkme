export default async function handler(req, res) {

  const token = process.env.TELEGRAM_TOKEN;

  console.log("Baby niche bot triggered");

  try {

    /* =========================================================
       AMAZON AFFILIATE CLEANER
    ========================================================= */

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

    /* =========================================================
       FETCH PRODUCTS
    ========================================================= */

    const apiRes = await fetch(
      "https://floatrising.com/api/search"
    );

    const data = await apiRes.json();

    if (
      !data.products ||
      data.products.length === 0
    ) {

      return res.status(200).json({
        message: "No baby products found"
      });
    }

    /* =========================================================
       BABY PRODUCT SCORE
    ========================================================= */

    const scored = data.products.map(product => {

      const rating = product.rating || 4;
      const reviews = product.reviews || 100;

      let score = 0;

      score += rating * 25;

      score += Math.log(reviews + 1) * 35;

      if (product.image) score += 25;

      if (
        product.title?.toLowerCase().includes("baby")
      ) score += 20;

      if (
        product.title?.toLowerCase().includes("newborn")
      ) score += 15;

      score += Math.random() * 20;

      return {
        ...product,
        viralScore: score
      };
    });

    const sorted = scored.sort(
      (a, b) => b.viralScore - a.viralScore
    );

    /* =========================================================
       PICK PRODUCT
    ========================================================= */

    const topPool = sorted.slice(0, 6);

    const product =
      topPool[
        Math.floor(Math.random() * topPool.length)
      ];

    if (!product.image) {

      console.log("Missing image");

      return res.status(200).json({
        message: "Skipped"
      });
    }

    /* =========================================================
       AFFILIATE LINK
    ========================================================= */

    const productWithAffiliate = {

      ...product,

      link: cleanAmazonUrl(
        product.url || product.link
      )
    };

    /* =========================================================
       CREATE SHARE CARD
    ========================================================= */

    const shareRes = await fetch(
      "https://floatrising.com/api/share",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify(
          productWithAffiliate
        )
      }
    );

    const shareData = await shareRes.json();

    if (!shareData.id) {

      console.log("Share failed");

      return res.status(200).json({
        message: "Share failed"
      });
    }

    const shareId = shareData.id;

    /* =========================================================
       HOOK ENGINE
    ========================================================= */

    const hooks = [

      "👶 Parents are loving this right now",

      "🔥 Viral baby find spotted",

      "🚀 TikTok moms are sharing this",

      "💡 This parenting product is trending fast",

      "👀 Amazon baby find going viral",

      "🍼 Smart parents are buying this"
    ];

    const hook =
      hooks[
        Math.floor(Math.random() * hooks.length)
      ];

    /* =========================================================
       CTA ENGINE
    ========================================================= */

    const ctas = [

      "✨ Definitely worth a look",

      "💡 This could make parenting easier",

      "🚀 Trending fast across TikTok",

      "👶 One of today's most shared baby finds"
    ];

    const cta =
      ctas[
        Math.floor(Math.random() * ctas.length)
      ];

    /* =========================================================
       TELEGRAM PROMO
    ========================================================= */

    const promo = `

━━━━━━━━━━━━━━━

🚀 Join The Viral Baby Feed

Daily:
• Viral baby finds
• TikTok mom products
• Parenting hacks
• Amazon baby deals

👉 https://floatrising.com
`;

    /* =========================================================
       DESCRIPTION
    ========================================================= */

    const description =
      product.description
        ? product.description.substring(0, 160)
        : "Trending baby product parents are discovering right now.";

    /* =========================================================
       FINAL CAPTION
    ========================================================= */

    const caption = `${hook}

🍼 ${product.title}

${description}

👀 View Product
https://floatrising.com/s.html?id=${shareId}&utm_source=telegram&utm_campaign=babyfeed&utm_content=${shareId}

${cta}

${promo}`;

    /* =========================================================
       TELEGRAM POST
    ========================================================= */

    const tgRes = await fetch(
      `https://api.telegram.org/bot${token}/sendPhoto`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({

          chat_id: "@floatviral",

          photo: product.image,

          caption: caption
        })
      }
    );

    const tgData = await tgRes.json();

    console.log("Telegram response:", tgData);

    return res.status(200).json({

      message: "Baby product posted",

      product: product.title
    });

  } catch (error) {

    console.error(
      "Daily baby post error:",
      error
    );

    return res.status(500).json({

      error: "Failed to post"
    });
  }
}
