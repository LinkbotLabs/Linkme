const cache = {
  timestamp: 0,
  data: []
};

const CACHE_TIME = 1000 * 60 * 60 * 6;


/* ---------------- VIRAL DISCOVERY SOURCES ---------------- */

/* ---------------- DISCOVERY SEARCH QUERIES ---------------- */

const queries = [

/* Amazon discovery */

"site:amazon.com/gp/movers-and-shakers",
"site:amazon.com/gp/movers-and-shakers kitchen",
"site:amazon.com/gp/movers-and-shakers home",

"best selling gadgets amazon 2025 site:amazon.com",
"amazon must have gadgets site:amazon.com",
"cool gadgets amazon under 50 site:amazon.com",

/* TikTok discovery */

"tiktok made me buy it amazon gadget",
"viral tiktok gadget amazon",
"tiktok cleaning gadget amazon",
"site:tiktok.com amazon gadget",

/* Problem solving */

"amazon problem solving gadgets site:amazon.com",
"amazon life hack gadget site:amazon.com",
"didnt know i needed this amazon gadget",

/* Niche discovery */

"amazon kitchen gadget trending site:amazon.com",
"amazon car gadget trending site:amazon.com",
"amazon desk gadget setup site:amazon.com",
"amazon cleaning gadget trending site:amazon.com"

];


/* ---------------- VIRAL SIGNAL WORDS ---------------- */

const viralWords = [

"gadget","viral","must","portable","mini","electric",
"automatic","smart","wireless","rechargeable",
"foldable","adjustable","multifunction",

"cool","genius","hack","problem solving",
"life hack","tiktok","amazon find",
"game changer"

];


/* ---------------- PROBLEM SOLVER WORDS ---------------- */

const problemWords = [

"cleaner","organizer","holder","opener",
"scrubber","chopper","slicer",
"rack","storage","dispenser",
"vacuum","remover","scale"

];


/* ---------------- HIGH COMMISSION SIGNALS ---------------- */

const commissionWords = [

"vacuum","espresso","printer","tool",
"charger","smart","coffee","kitchen",
"air fryer","blender","projector",
"camera","security"

];


/* ---------------- NEW PRODUCT SIGNALS ---------------- */

const newProductWords = [

"2025","2024","new","latest","upgraded"

];


/* ---------------- BANNED SATURATED PRODUCTS ---------------- */

const bannedWords = [

"nail lamp",
"gel nail",
"uv nail",
"galaxy projector",
"night light projector"

];


/* ---------------- NICHE DETECTION ---------------- */

const nicheKeywords = [

/* original */

"kitchen","cleaner","organizer",
"printer","vacuum","coffee",
"travel","car","garden",
"fitness","desk",

/* your niche list */

"plush","kawaii","phone mount",
"collagen","mask","solar",
"power bank","back stretcher",
"dumpling","sushi","slime",
"bracelet","hydroponic",
"rfid","wallet","espresso",
"smart ring","holographic",
"sauna","biohacking",
"makeup mirror",

/* additional viral niches */

"projector","eye massager",
"fabric shaver","lint remover",
"luggage scale","soap dispenser",
"pet hair","kettle",
"screwdriver","makeup organizer",
"water bottle","mug warmer",
"led lights","neck fan",
"cable organizer","jar opener",
"garment steamer","hand warmer",
"kitchen scale","cleaning brush"

];

const MAX_PER_NICHE = 2;
/* ---------------- API HANDLER ---------------- */

export default async function handler(req, res) {

res.setHeader("Cache-Control","no-store");

const now = Date.now();

if(cache.data.length && now - cache.timestamp < CACHE_TIME){
return res.status(200).json({products:cache.data});
}

try{

const shuffled=[...queries].sort(()=>0.5-Math.random());
const selectedQueries=shuffled.slice(0,6);

let allItems=[];

for(const query of selectedQueries){

const googleRes=await fetch(
`https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_KEY}&cx=${process.env.CX_ID}&q=${encodeURIComponent(query)}&num=10`
);

const data=await googleRes.json();

if(data.items){
allItems=[...allItems,...data.items];
}

}

if(!allItems.length){
return res.status(200).json({products:cache.data});
}


/* -------- STRICT AMAZON PRODUCT FILTER -------- */

const filtered=allItems.filter(item=>
item.link &&
item.link.includes("amazon.com") &&
(
item.link.includes("/dp/") ||
item.link.includes("/gp/product/")
)
);


/* -------- VIRAL PRODUCT ENGINE -------- */

const nicheCounts={};
const titleKeys=new Set();
const asinCount={};

const products=filtered.map((item,i)=>{

const rawImage=
item.pagemap?.cse_image?.[0]?.src ||
item.pagemap?.metatags?.[0]?.["og:image"] ||
item.pagemap?.cse_thumbnail?.[0]?.src;

if(!rawImage) return null;

const image=upgradeAmazonImage(rawImage);

const title=cleanTitle(item.title);
const titleLower=title.toLowerCase();


/* BAN BAD PRODUCTS */

if(bannedWords.some(word=>titleLower.includes(word))){
return null;
}


/* NORMALIZE LINK */

const link=normalizeAmazonLink(item.link);
const asin=extractASIN(link);

if(!asin) return null;


/* TREND CONVERGENCE */

if(!asinCount[asin]) asinCount[asin]=0;
asinCount[asin]++;


/* SIMILAR TITLE FILTER */

const titleKey=titleLower.split(" ").slice(0,3).join(" ");

if(titleKeys.has(titleKey)){
return null;
}

titleKeys.add(titleKey);


/* NICHE DETECTION */

const niche =
nicheKeywords.find(word=>titleLower.includes(word)) || "other";

if(!nicheCounts[niche]) nicheCounts[niche]=0;

if(nicheCounts[niche] >= MAX_PER_NICHE){
return null;
}

nicheCounts[niche]++;


/* SCORING SYSTEM */

const viralScore=viralWords.reduce((c,w)=>titleLower.includes(w)?c+1:c,0);

const problemScore=problemWords.reduce((c,w)=>titleLower.includes(w)?c+1:c,0);

const commissionScore=commissionWords.reduce((c,w)=>titleLower.includes(w)?c+1:c,0);

const newScore=newProductWords.reduce((c,w)=>titleLower.includes(w)?c+1:c,0);

const trendScore=asinCount[asin] || 1;


/* FINAL SCORE */

const score =
viralScore +
problemScore*2 +
commissionScore +
newScore +
trendScore;


/* DESCRIPTION */

const description =
item.snippet ||
item.pagemap?.metatags?.[0]?.["og:description"] ||
"Trending Amazon product going viral right now.";


return{
id:`${now}-${i}`,
title,
description:description.substring(0,140),
image,
link,
score,
niche,
asin
};

})
.filter(Boolean)
.sort((a,b)=>b.score-a.score)
.slice(0,24);


/* -------- MERGE WITH CACHE -------- */

const existing=cache.data||[];
const merged=[...existing,...products];

const unique=[];
const seen=new Set();

for(const p of merged){

if(seen.has(p.asin)) continue;

seen.add(p.asin);
unique.push(p);

}

cache.data=unique.slice(-300);
cache.timestamp=now;

return res.status(200).json({products:cache.data});

}catch(error){

return res.status(500).json({
error:"Search failed",
details:error.message
});

}

}


/* ---------------- HELPERS ---------------- */

function cleanTitle(title){

return title
.replace("- Amazon.com","")
.replace("| Amazon","")
.split("|")[0]
.substring(0,80)
.trim();

}


function normalizeAmazonLink(url){

try{

const parsed=new URL(url);

const dpMatch=parsed.pathname.match(/\/dp\/([A-Z0-9]{10})/);
const gpMatch=parsed.pathname.match(/\/gp\/product\/([A-Z0-9]{10})/);

const asin=dpMatch?.[1] || gpMatch?.[1];

if(!asin) return parsed.origin;

return `https://www.amazon.com/dp/${asin}`;

}catch{
return url;
}

}


function extractASIN(url){

const match=url.match(/\/dp\/([A-Z0-9]{10})/);
return match ? match[1] : null;

}


function upgradeAmazonImage(url){
return url.replace(/\._.*_\./,".");
}
