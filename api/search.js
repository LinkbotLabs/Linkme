const cache = {
  timestamp: 0,
  data: []
};

const CACHE_TIME = 1000 * 60 * 60 * 6;


/* ---------------- DISCOVERY SEARCH QUERIES ---------------- */

const queries = [

/* AMAZON RISING */

"site:amazon.com/gp/movers-and-shakers",
"site:amazon.com/gp/movers-and-shakers kitchen",
"site:amazon.com/gp/movers-and-shakers home",
"site:amazon.com/gp/movers-and-shakers electronics",
"best selling gadgets amazon",
"amazon must have gadgets",

/* TIKTOK VIRAL */

"tiktok made me buy it amazon gadget",
"viral tiktok amazon gadget",
"amazon gadget trending tiktok",
"tiktok cleaning gadget amazon",
"tiktok kitchen gadget amazon",

/* BLOG DISCOVERY */

"best amazon gadgets 2025",
"must have amazon gadgets",
"genius amazon products that make life easier",
"cool amazon gadgets you didnt know you needed",
"amazon problem solving gadgets",

/* NICHE VIRAL */

"amazon cleaning gadget trending",
"amazon car gadget trending",
"amazon desk gadget setup",
"amazon kitchen tool trending",
"amazon travel gadget trending",

/* PINTEREST STYLE */

"amazon aesthetic desk gadgets",
"amazon cozy home gadgets",
"amazon organization gadgets",
"amazon small space gadgets",

/* HIGH COMMISSION */

"best espresso machine amazon",
"best vacuum cleaner amazon",
"best coffee gadget amazon",
"best kitchen appliance amazon",

/* REDDIT VIRAL */

"site:reddit.com amazon gadget",
"site:reddit.com amazon find gadget",
"site:reddit.com must have amazon gadget",
"site:reddit.com cool amazon gadget",

/* TIKTOK HASHTAG VIRAL */

"site:tiktok.com #tiktokmademebuyit amazon",
"site:tiktok.com #amazonfinds gadget",
"site:tiktok.com #amazonmusthaves gadget",
"site:tiktok.com #viralproduct amazon",
"site:tiktok.com #problemsolver gadget",
"site:tiktok.com #lifehack gadget",
"site:tiktok.com #kitchengadget amazon"

];


/* ---------------- VIRAL SIGNAL WORDS ---------------- */

const viralWords = [
"gadget","viral","must","portable","mini",
"electric","automatic","smart","wireless",
"rechargeable","foldable","adjustable",
"multifunction","cool","genius","hack",
"problem solving","life hack","tiktok",
"amazon find","game changer"
];


/* ---------------- PROBLEM SOLVER WORDS ---------------- */

const problemWords = [
"cleaner","organizer","holder","opener",
"scrubber","chopper","slicer","rack",
"storage","dispenser","vacuum",
"remover","scale","brush"
];


/* ---------------- HIGH COMMISSION ---------------- */

const commissionWords = [
"vacuum","espresso","printer","tool",
"charger","coffee","kitchen","air fryer",
"blender","projector","camera",
"security","coffee maker"
];


/* ---------------- NEW PRODUCT SIGNALS ---------------- */

const newProductWords = [
"2025","2024","new","latest","upgraded"
];


/* ---------------- BANNED PRODUCTS ---------------- */

const bannedWords = [
"nail lamp",
"gel nail",
"uv nail",
"galaxy projector",
"night light projector"
];


/* ---------------- NICHE DETECTION ---------------- */

const nicheKeywords = [
"kitchen","cleaner","organizer","printer","vacuum",
"coffee","travel","car","garden","fitness",
"desk","plush","kawaii","phone mount",
"collagen","mask","solar","power bank",
"back stretcher","dumpling","sushi",
"bracelet","hydroponic","rfid","wallet",
"espresso","smart ring","holographic",
"sauna","biohacking","makeup mirror",
"projector","eye massager","fabric shaver",
"lint remover","luggage scale",
"soap dispenser","pet hair","kettle",
"screwdriver","makeup organizer",
"water bottle","mug warmer","led lights",
"neck fan","cable organizer","jar opener",
"garment steamer","hand warmer",
"kitchen scale","cleaning brush"
];


/* ---------------- TIKTOK TREND WORDS ---------------- */

const tiktokTrendWords = [
"tiktok",
"tiktok made me buy",
"amazon finds",
"viral product",
"must have",
"trending product",
"viral gadget",
"tiktok gadget",
"tiktok amazon",
"amazon must have"
];


const MAX_PER_NICHE = 5;


/* ---------------- API HANDLER ---------------- */

export default async function handler(req, res) {

res.setHeader("Cache-Control","no-store");

const now = Date.now();

if(cache.data.length && now - cache.timestamp < CACHE_TIME){
return res.status(200).json({products:cache.data});
}

try{

/* ---------------- 70% SEARCH QUOTA CONTROL ---------------- */

const shuffled=[...queries].sort(()=>0.5-Math.random());
const selectedQueries=shuffled.slice(0,14);

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


/* -------- AMAZON FILTER -------- */

const filtered=allItems.filter(item=>
item.link &&
item.link.includes("amazon.") &&
!item.link.includes("/s?")
);


/* -------- PRODUCT ENGINE -------- */

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

if(bannedWords.some(word=>titleLower.includes(word))){
return null;
}

const link=normalizeAmazonLink(item.link);
const asin=extractASIN(link);

if(!asin) return null;


/* TREND CONVERGENCE */

if(!asinCount[asin]) asinCount[asin]=0;
asinCount[asin]++;


/* DUPLICATE TITLE CONTROL */

const titleKey=titleLower.split(" ").slice(0,2).join(" ");

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


/* SCORING ENGINE */

const viralScore=viralWords.reduce((c,w)=>titleLower.includes(w)?c+1:c,0);
const problemScore=problemWords.reduce((c,w)=>titleLower.includes(w)?c+1:c,0);
const commissionScore=commissionWords.reduce((c,w)=>titleLower.includes(w)?c+1:c,0);
const newScore=newProductWords.reduce((c,w)=>titleLower.includes(w)?c+1:c,0);
const trendScore=asinCount[asin] || 1;
const tiktokScore=tiktokTrendWords.reduce((c,w)=>titleLower.includes(w)?c+1:c,0);

const score =
viralScore +
problemScore*2 +
commissionScore +
newScore +
trendScore +
tiktokScore*2;


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
.slice(0,60);


/* -------- CACHE MERGE -------- */

const existing=cache.data||[];
const merged=[...existing,...products];

const unique=[];
const seen=new Set();

for(const p of merged){

if(seen.has(p.asin)) continue;

seen.add(p.asin);
unique.push(p);

}

cache.data=unique.slice(-500);
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

const match=parsed.pathname.match(/\/(dp|gp\/product)\/([A-Z0-9]{10})/);

const asin=match?.[2];

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
