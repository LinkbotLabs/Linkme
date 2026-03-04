// pages/api/og.js
import { ImageResponse } from '@vercel/og';

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const { searchParams } = new URL(req.url);

  const title = searchParams.get('title') || 'Trending Gadget';
  const image = searchParams.get('image') || '';
  const rating = searchParams.get('rating') || '4.8';
  const reviews = searchParams.get('reviews') || '500';

  return new ImageResponse(
    (
      <div
        style={{
          background: 'white',
          width: '1080px',
          height: '1080px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '80px',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            fontSize: 60,
            fontWeight: 700,
            textAlign: 'center',
            marginBottom: 40,
          }}
        >
          {title}
        </div>

        <img
          src={image}
          style={{
            width: '70%',
            borderRadius: 20,
            marginBottom: 40,
          }}
        />

        <div
          style={{
            fontSize: 36,
            marginBottom: 20,
          }}
        >
          ⭐ {rating} • {reviews}+ reviews
        </div>

        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
          }}
        >
          TAP TO SHOP
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: 40,
            fontSize: 28,
            color: '#9ca3af',
          }}
        >
          Float Rising
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1080,
    }
  );
}
