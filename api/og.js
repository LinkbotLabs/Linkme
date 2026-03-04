// pages/api/og.js

export const config = {
  runtime: "edge",
};

export default async function handler(req) {
  const { searchParams } = new URL(req.url);

  const title = searchParams.get("title") || "Trending Gadget";
  const image = searchParams.get("image") || "";
  const rating = searchParams.get("rating") || "4.8";
  const reviews = searchParams.get("reviews") || "500";

  return new Response(
    `
    <html>
      <head>
        <meta property="og:title" content="${title}" />
      </head>
      <body style="
        margin:0;
        width:1080px;
        height:1080px;
        display:flex;
        flex-direction:column;
        justify-content:center;
        align-items:center;
        font-family:sans-serif;
        background:white;
      ">
        <h1 style="font-size:60px;text-align:center;margin-bottom:40px;">
          ${title}
        </h1>

        <img src="${image}" style="width:70%;border-radius:20px;margin-bottom:40px;" />

        <div style="font-size:36px;margin-bottom:20px;">
          ⭐ ${rating} • ${reviews}+ reviews
        </div>

        <div style="font-size:48px;font-weight:700;">
          TAP TO SHOP
        </div>

        <div style="
          position:absolute;
          bottom:40px;
          font-size:28px;
          color:#9ca3af;
        ">
          Float Rising
        </div>
      </body>
    </html>
    `,
    {
      headers: { "Content-Type": "text/html" },
    }
  );
}
