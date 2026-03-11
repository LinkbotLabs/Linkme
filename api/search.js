const cache = {
  timestamp: 0,
  data: []
};

const CACHE_TIME = 1000 * 60 * 60 * 6; // 6 hours


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
"amazon travel gadgets site:amazon.com",

/* NEW VIRAL PRODUCT NICHES */

"jellycat plush keychain phone charm site:amazon.com",
"magnetic phone mount car desk holder site:amazon.com",
"collagen mask peptide sheet mask hydrogel mask site:amazon.com",
"solar power bank portable charger foldable solar site:amazon.com",
"back stretcher spine decompressor yoga wheel site:amazon.com",
"dumpling maker sushi roller scallion pancake maker site:amazon.com",
"slime kit kinetic sand jellyfish lamp site:amazon.com",
"long distance touch bracelet couple lamp site:amazon.com",
"self watering planter led grow light hydroponic kit site:amazon.com",
"rfid blocking wallet anti theft wallet site:amazon.com",
"led nail lamp uv gel dryer site:amazon.com",
"portable espresso maker manual coffee grinder site:amazon.com",
"smart ring fitness tracker sleep monitor site:amazon.com",
"holographic projector fan display site:amazon.com",
"nmn supplement resveratrol longevity site:amazon.com",
"infrared sauna blanket portable detox site:amazon.com",
"smart makeup mirror ar virtual try on site:amazon.com",
"led sunset lamp aesthetic room decor site:amazon.com",
"galaxy projector night light site:amazon.com",
"mini thermal photo printer site:amazon.com",
"reusable water balloons summer toys site:amazon.com",
"magnetic screen door mesh site:amazon.com",
"cordless mini chainsaw garden tool site:amazon.com",
"adjustable laptop stand aluminum site:amazon.com",

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
  "travel",
  "lamp",
  "projector",
  "decor",
  "aesthetic",
  "led",
  "smart"
];

const nicheKeywords = [
  "lamp",
  "projector",
  "organizer",
  "cleaner",
  "printer",
  "wallet",
  "coffee",
  "espresso",
  "beauty",
  "mask",
  "fitness",
  "charger",
  "solar",
  "ring",
  "toy",
  "garden",
  "kitchen"
];
/* ---------------- API HANDLER ---------------- */

export default async function handler(req, res) {

  res.setHeader("Cache-Control", "no-store");

  const now = Date.now();


  /* ---------- RETURN CACHE IF STILL FRESH ---------- */

  if (cache.data.length && now - cache.timestamp < CACHE_TIME) {
    return res.status(200).json({ products: cache.data });
  }


  try {

    /* pick 5 queries randomly */

    const shuffled = [...queries].sort(() => 0.5 - Math.random());

    const selectedQueries = shuffled.slice(0, 5);


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
const niche =
  nicheKeywords.find(word => titleLower.includes(word)) || "other";
        const score = viralWords.reduce((count, word) => {
          return titleLower.includes(word) ? count + 1 : count;
        }, 0);


        return {
          id: `${now}-${i}`,
          title,
          description: description.substring(0, 140),
          image,
          link: cleanLink,
          score
          niche
        };

      })
      .filter(Boolean)

      /* boost viral gadget titles */

      .sort((a, b) => b.score - a.score)

/* add randomness so one niche doesn't dominate */

.sort(() => 0.5 - Math.random())

.slice(0, 24);

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

}
