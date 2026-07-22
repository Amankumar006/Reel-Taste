import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Reel Taste - Movie Discovery',
    short_name: 'Reel Taste',
    description: 'Personalized movie, anime, and game discovery app',
    start_url: '/',
    display: 'standalone',
    background_color: '#080f1e',
    theme_color: '#080f1e',
    orientation: 'portrait',
    scope: '/',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
