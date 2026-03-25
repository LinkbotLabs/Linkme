export function cleanTitle(title){
  if(!title) return "Trending Amazon Find";

  return title
    .replace(/Amazon\.com:?/gi,"")
    .replace(/\(.*?\)/g,"")
    .split(",")[0]
    .trim()
    .slice(0,60);
}

export function generateBullets(title){
  title = title.toLowerCase();

  if(title.includes("phone") || title.includes("holder") || title.includes("mount")){
    return `
    📸 Perfect for photos and video<br>
    📱 Hands-free viewing anywhere<br>
    ✈️ Great for flights, desks, and travel
    `;
  }

  if(title.includes("gundam") || title.includes("model")){
    return `
    🧩 Highly detailed collectible model<br>
    🎨 Fun and relaxing to build<br>
    ⚙️ Poseable parts for display
    `;
  }

  return `
  🔥 Trending product people love<br>
  ⭐ Highly rated by shoppers<br>
  ✨ Popular viral Amazon find
  `;
}

export function renderCard(p, theme = {}){

  return `
  <div style="
    background:${theme.card || "white"};
    border-radius:${theme.radius || 30}px;
    padding:30px 24px;
    box-shadow:0 30px 70px rgba(0,0,0,0.12);
    color:${theme.text || "#111"};
  ">

    <img src="${p.image}" style="
      width:100%;
      border-radius:18px;
      margin-bottom:20px;
    ">

    <div style="
      font-size:22px;
      text-align:center;
      margin-bottom:10px;
      font-weight:700;
    ">
      ${cleanTitle(p.title)}
    </div>

    <div style="
      font-size:14px;
      margin-bottom:20px;
      line-height:1.6;
    ">
      ${generateBullets(p.title)}
    </div>

    <a href="${p.link}" target="_blank"
      style="
        display:block;
        background:${theme.accent || "#111"};
        color:white;
        padding:16px;
        border-radius:18px;
        text-align:center;
        text-decoration:none;
        font-weight:700;
      ">
      🔥 See Why This Is Going Viral
    </a>

  </div>
  `;
}
