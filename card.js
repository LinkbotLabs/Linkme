export function renderCard(p, theme = {}) {

  const cleanTitle = (title) => {
    if (!title) return "Trending Amazon Find";
    return title
      .replace(/Amazon\.com:?/gi, "")
      .replace(/\(.*?\)/g, "")
      .split(",")[0]
      .trim()
      .slice(0, 60);
  };

  const generateBullets = (title) => {
    title = title.toLowerCase();
    if (title.includes("phone") || title.includes("holder") || title.includes("mount")) {
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

  /* Stable trust signals */
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

  /* ==================== TEXTURE SUPPORT ==================== */
  let textureCSS = '';
  if (theme.texture && theme.texture !== 'none') {
    switch (theme.texture) {
      case 'paper':
        textureCSS = `background-image: 
          linear-gradient(rgba(0,0,0,0.035) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,0,0,0.035) 1px, transparent 1px);
          background-size: 32px 32px;`;
        break;
      case 'granite':
        textureCSS = `background-image: 
          url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='5'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.19'/%3E%3C/svg%3E");
          background-size: 210px 210px;`;
        break;
      case 'wood':
        textureCSS = `background-image: 
          linear-gradient(135deg, #8c6642 0%, #a07b5a 48%, #8c6642 100%);
          background-size: 300px 300px;`;
        break;
      case 'tiles':
        textureCSS = `background-image: 
          linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px);
          background-size: 58px 58px;`;
        break;
      case 'noise':
        textureCSS = `background-image: 
          url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.15'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.13'/%3E%3C/svg%3E");
          background-size: 140px 140px;`;
        break;
    }
  }

  return `
  <div style="
    background: ${theme.card || "#ffffff"};
    ${textureCSS}
    border-radius: ${theme.radius || 30}px;
    padding: 30px 24px;
    box-shadow: 0 30px 70px rgba(0,0,0,0.15);
    position: relative;
    overflow: hidden;
    color: ${theme.text || "#111"};
    font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  ">

    <!-- Logo -->
    <img src="/float-rising-logo.svg"
      style="position:absolute; top:16px; right:16px; width:46px; opacity:0.9;">

    <!-- Viral Badge -->
    <div style="
      position:absolute; top:16px; left:16px;
      background:rgba(0,0,0,0.8); color:white;
      padding:6px 12px; border-radius:999px;
      font-size:11px; font-weight:600;
    ">
      VIRAL FIND 🔥
    </div>

    <!-- Product Image Container -->
    <div style="
      background: linear-gradient(135deg, #f6f7ff, #eef6ff);
      padding: 18px;
      border-radius: 22px;
      margin-bottom: 24px;
    ">
      <img src="${p.image}"
        style="width:100%; border-radius:18px; box-shadow:0 20px 50px rgba(0,0,0,0.18);">
    </div>

    <!-- Title -->
    <div style="
      font-size: 24px;
      text-align: center;
      margin-bottom: 10px;
      font-weight: 700;
    ">
      ${cleanTitle(p.title)}
    </div>

    <!-- Hook -->
    <div style="
      text-align: center;
      color: #6b7280;
      margin-bottom: 18px;
    ">
      ${hook}
    </div>

    <!-- Rating -->
    <div style="
      text-align: center;
      margin-bottom: 14px;
    ">
      ⭐ ${rating} • ${reviews}+ reviews
    </div>

    <!-- Why You'll Love It -->
    <div style="
      font-size: 14px;
      line-height: 1.7;
      margin-bottom: 20px;
    ">
      ✨ Why You’ll Love It:<br><br>
      ${generateBullets(p.title)}
    </div>

    <!-- Main CTA -->
    <a href="${p.link}" target="_blank" rel="noopener noreferrer"
      style="
        display: block;
        background: ${theme.accent || "#111"};
        color: white;
        padding: 16px;
        border-radius: 18px;
        text-align: center;
        font-weight: 700;
        text-decoration: none;
        margin-top: 20px;
      ">
      🔥 See Why This Is Going Viral
    </a>

    <!-- Pinterest Button -->
    <button id="pinBtn"
      style="
        display: block;
        width: 100%;
        background: #E60023;
        color: white;
        padding: 14px;
        border-radius: 16px;
        text-align: center;
        font-weight: 700;
        border: none;
        cursor: pointer;
        margin-top: 12px;
      ">
      📌 Share This Viral Find
    </button>

  </div>
  `;
}
