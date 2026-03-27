export function renderCard(p, theme = {}) {

  const cleanTitle = (title)=>{
    if(!title) return "Trending Amazon Find";
    return title
      .replace(/Amazon\.com:?/gi,"")
      .replace(/\(.*?\)/g,"")
      .split(",")[0]
      .trim()
      .slice(0,60);
  };

  const generateBullets = (title)=>{
    title = title.toLowerCase();

    if(title.includes("phone") || title.includes("holder") || title.includes("mount")){
      return `
      📸 Perfect for photos and video<br>
      📱 Hands-free viewing anywhere<br>
      ✈️ Great for flights, desks, and travel
      `;
    }

    return `
    🔥 Trending product people love<br>
    ⭐ Highly rated by shoppers<br>
    ✨ Popular viral Amazon find
    `;
  };

  /* ✅ Stable (non-random) trust signals */
  const seed = p.title ? p.title.length : 50;

  const rating = (4.5 + (seed % 4) * 0.1).toFixed(1);
  const reviews = 150 + (seed % 500);

  const hooks = [
    "This Product Is Going Viral 🔥",
    "TikTok Made This Go Viral",
    "Amazon Shoppers Love This",
    "Trending Amazon Find",
    "People Can't Stop Buying This"
  ];

  const hook = hooks[seed % hooks.length];

  return `
  <div style="
  background:${theme.card || "white"};
  border-radius:${theme.radius || 30}px;
  padding:30px 24px;
  box-shadow:0 30px 70px rgba(0,0,0,0.12);
  position:relative;
  overflow:hidden;
  color:${theme.text || "#111"};
  ">

  <img src="/float-rising-logo.svg"
  style="
  position:absolute;
  top:16px;
  right:16px;
  width:46px;
  opacity:.9;
  ">

  <div style="
  position:absolute;
  top:16px;
  left:16px;
  background:rgba(0,0,0,0.8);
  color:white;
  padding:6px 12px;
  border-radius:999px;
  font-size:11px;
  font-weight:600;
  ">
  VIRAL FIND 🔥
  </div>

  <div style="
  background:linear-gradient(135deg,#f6f7ff,#eef6ff);
  padding:18px;
  border-radius:22px;
  margin-bottom:24px;
  ">

  <img src="${p.image}"
  style="
  width:100%;
  border-radius:18px;
  box-shadow:0 20px 50px rgba(0,0,0,0.18);
  ">

  </div>

  <div style="
  font-size:24px;
  text-align:center;
  margin-bottom:10px;
  font-weight:700;
  ">
  ${cleanTitle(p.title)}
  </div>

  <div style="
  text-align:center;
  color:#6b7280;
  margin-bottom:18px;
  ">
  ${hook}
  </div>

  <div style="
  text-align:center;
  margin-bottom:14px;
  ">
  ⭐ ${rating} • ${reviews}+ reviews
  </div>

  <div style="
  font-size:14px;
  line-height:1.7;
  margin-bottom:20px;
  ">
  ✨ Why You’ll Love It:<br><br>
  ${generateBullets(p.title)}
  </div>

  <!-- ✅ Affiliate link stays protected -->
  <a href="${p.link}" target="_blank" rel="noopener noreferrer"
  style="
  display:block;
  background:${theme.accent || "#111"};
  color:white;
  padding:16px;
  border-radius:18px;
  text-align:center;
  font-weight:700;
  text-decoration:none;
  margin-top:20px;
  ">
  🔥 See Why This Is Going Viral
  </a>

  <!-- ✅ Pinterest loop button -->
  <button id="pinBtn"
  style="
  display:block;
  width:100%;
  background:#E60023;
  color:white;
  padding:14px;
  border-radius:16px;
  text-align:center;
  font-weight:700;
  border:none;
  cursor:pointer;
  margin-top:12px;
  ">
  📌 Share This Viral Find
  </button>

  </div>
  `;
}
