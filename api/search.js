const CACHE_TIME = 1000 * 60 * 60 * 24;

let cache = {
  timestamp: 0,
  data: null,
  fetching: false
};

const COLLECTIONS = [
  {
    title: "Simple Ways To Enjoy Life More",
    description:
      "Small ideas, inspiring resources and everyday reminders to slow down, appreciate the moment and enjoy life a little more.",
    url: "https://benable.com/revup/simple-ways-to-enjoy-life-more"
  },

  {
    title: "Guided Buddhist Teachings & Meditation",
    description:
      "Timeless Buddhist wisdom, guided teachings and meditation resources to cultivate inner peace, clarity and compassion.",
    url: "https://benable.com/revup/guided-buddhist-teachings-meditation-for-inner-peace-09"
  },

  {
    title: "My Favorite Book Recs",
    description:
      "A growing collection of books that inspire new ideas, deeper thinking and personal growth.",
    url: "https://benable.com/revup/my-favorite-book-recs-4b"
  },

  {
    title: "Meditation",
    description:
      "Simple tools, resources and practices to help develop mindfulness, presence and a calmer state of mind.",
    url: "https://benable.com/revup/meditation-b3"
  },

  {
    title: "Fine Dining At Home",
    description:
      "Bring restaurant-quality experiences into your own kitchen with cooking inspiration and gourmet ideas.",
    url: "https://benable.com/revup/fine-dining-at-home-6f"
  },

  {
    title: "Remote Work Starter Kit",
    description:
      "Budget-friendly tools and productivity essentials to create an effective and comfortable remote workspace.",
    url: "https://benable.com/revup/remote-work-starter-kit-for-under-500-32"
  },

  {
    title: "Surreal Art Inspired By Salvador Dalí",
    description:
      "Explore dreamlike artwork, imaginative creations and surreal inspiration.",
    url: "https://benable.com/revup/surreal-art-inspired-by-salvador-dali-f6"
  },

  {
    title: "The 2026 World Cup Collection",
    description:
      "Football collectibles, gifts, memorabilia and fan inspiration for the 2026 World Cup.",
    url: "https://benable.com/revup/the-2026-world-cup-collection-5f"
  }
];

export default async function handler(req, res) {

  res.setHeader(
    "Cache-Control",
    "s-maxage=86400, stale-while-revalidate"
  );

  const now = Date.now();

  if (
    cache.data &&
    now - cache.timestamp < CACHE_TIME
  ) {
    return res.status(200).json({
      collections: cache.data
    });
  }

  if (cache.fetching) {
    return res.status(200).json({
      collections: cache.data || []
    });
  }

  try {

    cache.fetching = true;

    const results = [];

    for (const collection of COLLECTIONS) {

      let image =
        "https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=1200";

      try {

        const response =
          await fetch(collection.url, {
            headers: {
              "User-Agent":
                "Mozilla/5.0"
            }
          });

        const html =
          await response.text();

        const match =
          html.match(
            /property="og:image"\s+content="([^"]+)"/i
          );

        if (
          match &&
          match[1]
        ) {
          image = match[1];
        }

      } catch (err) {

        console.log(
          "Image fetch failed:",
          collection.title
        );
      }

      results.push({
        ...collection,
        image
      });
    }

    cache.timestamp = now;
    cache.data = results;
    cache.fetching = false;

    return res.status(200).json({
      collections: results
    });

  } catch (error) {

    cache.fetching = false;

    return res.status(500).json({
      error: error.message
    });
  }
}
