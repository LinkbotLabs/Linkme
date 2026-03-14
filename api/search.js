const cache = {
  timestamp: 0,
  data: []
};

const ONE_DAY = 1000 * 60 * 60 * 24;


/* ---------------- VIRAL SEARCH QUERIES ---------------- */

const queries = [

  "amazon trending gadgets site:amazon.com -book -novel -kindle",
  "viral kitchen gadgets amazon site:amazon.com -book -novel -kindle",
  "tiktok made me buy it amazon gadgets site:amazon.com -book -novel -kindle",
  "amazon impulse buy gadgets site:amazon.com -book -novel -kindle",

  /* piggyback Amazon ranking pages */

  "site:amazon.com \"best sellers in\" kitchen gadgets",
  "site:amazon.com \"movers and shakers\" gadgets",
  "site:amazon.com \"most wished for\" gadgets",

  /* viral niches */

  "amazon gadgets under $25 site:amazon.com",
  "amazon weird gadgets site:amazon.com",
  "amazon problem solving gadgets site:amazon.com",
  "amazon cleaning gadgets viral site:amazon.com",
  "amazon travel gadgets site:amazon.com"

];


/* -------- WORDS COMMON IN VIRAL GADGET PRODUCTS -------- */

const viralWords = [
  "gadget",
  "portable",
  "mini",
  "electric",
  "automatic",
  "cleaner",
  "organizer",
  "kitchen",
  "tool",
  "travel"
];


/* ---------------- API HANDLER ---------------- */

export default async function handler(req, res) {

  res.setHeader("Cache-Control", "no-store");

  const now = Date.now();


  /* ---------- RETURN CACHE IF STILL FRESH ---------- */

  if (cache.data.length && now - cache.timestamp < ONE_DAY) {
    return res.status(200).json({ products: cache.data });
  }


  try {

    /* pick 3 queries randomly */

    const selectedQueries = queries
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);


    let allItems = [];


    for (const query of selectedQueries) {

      const googleRes = await fetch(
        `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_KEY}&cx=${process.env.CX_ID}&q=${encodeURIComponent(query)}&num=10`
      );

      const data = await googleRes.json();

      if (data.items) {
        allItems = [...allItems, ...data.items];
      }

    }


    if (allItems.length === 0) {
      return res.status(200).json({ products: cache.data });
    }


    /* -------- FILTER REAL AMAZON PRODUCT LINKS -------- */

    const filtered = allItems.filter(item =>
      item.link &&
      item.link.includes("amazon.com") &&
      !item.link.includes("/s?") &&
      item.link.match(/\/(dp|gp\/product)\//)
    );


    const products = filtered
      .map((item, i) => {

        const rawImage =
          item.pagemap?.cse_image?.[0]?.src ||
          item.pagemap?.metatags?.[0]?.["og:image"] ||
          item.pagemap?.cse_thumbnail?.[0]?.src;


        if (!rawImage) return null;


        const image = upgradeAmazonImage(rawImage);


        const description =
          item.snippet ||
          item.pagemap?.metatags?.[0]?.["og:description"] ||
          "Trending Amazon product people are buying right now.";


        const cleanLink = normalizeAmazonLink(item.link);

        const title = cleanTitle(item.title);


        /* prioritize gadget style products */

        const titleLower = title.toLowerCase();

        const score = viralWords.some(word =>
          titleLower.includes(word)
        ) ? 1 : 0;


        return {
          id: `${now}-${i}`,
          title,
          description: description.substring(0, 140),
          image,
          link: cleanLink,
          score
        };

      })
      .filter(Boolean)


      /* boost viral gadget titles */

      .sort((a, b) => b.score - a.score)


      /* limit daily discoveries */

      .slice(0, 18);



    /* ---------------- MERGE WITH EXISTING DATABASE ---------------- */

    const existing = cache.data || [];

    const merged = [...existing, ...products];


    /* ---------------- REMOVE DUPLICATES ---------------- */

    const unique = [];
    const seen = new Set();

    for (const p of merged) {

      if (seen.has(p.link)) continue;

      seen.add(p.link);

      unique.push(p);

    }


    /* ---------------- LIMIT TOTAL DATABASE SIZE ---------------- */

    cache.data = unique.slice(-300);


    cache.timestamp = now;


    return res.status(200).json({ products: cache.data });


  } catch (error) {

    return res.status(500).json({
      error: "Search failed",
      details: error.message
    });

  }

}


/* ---------------- HELPER FUNCTIONS ---------------- */


function cleanTitle(title) {

  return title
    .replace("- Amazon.com", "")
    .replace("| Amazon", "")
    .split("|")[0]
    .substring(0, 80)
    .trim();

}


function normalizeAmazonLink(url) {

  try {

    const parsed = new URL(url);

    const dpMatch = parsed.pathname.match(/\/dp\/([A-Z0-9]{10})/);

    const gpMatch = parsed.pathname.match(/\/gp\/product\/([A-Z0-9]{10})/);

    const asin = dpMatch?.[1] || gpMatch?.[1];

    if (!asin) return parsed.origin;

    return `https://www.amazon.com/dp/${asin}`;

  } catch {

    return url;

  }

}


/* upgrade Amazon thumbnails to full images */

function upgradeAmazonImage(url) {

  return url.replace(/\._.*_\./, ".");
