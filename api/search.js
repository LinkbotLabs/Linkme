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

"site:amazon.com \"best sellers in\" kitchen gadgets",
"site:amazon.com \"movers and shakers\" gadgets",
"site:amazon.com \"most wished for\" gadgets",

"amazon gadgets under $25 site:amazon.com",
"amazon weird gadgets site:amazon.com",
"amazon problem solving gadgets site:amazon.com",
"amazon cleaning gadgets viral site:amazon.com",
"amazon travel gadgets site:amazon.com",

/* force real product pages */

"site:amazon.com/dp gadget",
"site:amazon.com/dp kitchen tool",
"site:amazon.com/dp cleaning gadget"

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

/* pick 5 queries randomly */

const selectedQueries = queries
.sort(() => 0.5 - Math.random())
.slice(0, 5);

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
return res.status(200).json({ products: cache.data || [] });
}


/* -------- FILTER AMAZON LINKS -------- */

const filtered = allItems.filter(item =>
item.link &&
item.link.includes("amazon.com") &&
!item.link.includes("/s?")
);


const products = filtered
.map((item, i) => {

const rawImage =
item.pagemap?.product?.[0]?.image ||
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
.sort((a,b)=>b.score-a.score)
.slice(0,18);


/* ---------------- MERGE DATABASE ---------------- */

const existing = cache.data || [];

const merged = [...existing, ...products];

const unique = [];
const seen = new Set();

for (const p of merged) {

if (!p.link) continue;

if (seen.has(p.link)) continue;

seen.add(p.link);

unique.push(p);

}


/* keep last 300 products */

cache.data = unique.slice(-300);

cache.timestamp = now;


/* safety fallback */

if (cache.data.length === 0) {

cache.data = [
{
id:"fallback1",
title:"Portable Blender Bottle",
description:"Popular portable blender trending on Amazon.",
image:"https://m.media-amazon.com/images/I/71K8H6L3OCL._AC_SL1500_.jpg",
link:"https://www.amazon.com/",
score:1
}
];

}

return res.status(200).json({ products: cache.data });

} catch (error) {

return res.status(500).json({
error: "Search failed",
details: error.message
});

}

}


/* ---------------- HELPERS ---------------- */


function cleanTitle(title) {

return title
.replace("- Amazon.com","")
.replace("| Amazon","")
.split("|")[0]
.substring(0,80)
.trim();

}


function normalizeAmazonLink(url) {

try {

const parsed = new URL(url);

const dpMatch = parsed.pathname.match(/\/dp\/([A-Z0-9]{10})/);

const gpMatch = parsed.pathname.match(/\/gp\/product\/([A-Z0-9]{10})/);

const asin = dpMatch?.[1] || gpMatch?.[1];

if (!asin) return url;

return `https://www.amazon.com/dp/${asin}`;

} catch {

return url;

}

}


function upgradeAmazonImage(url) {

return url.replace(/\._.*_\./,".");

}
