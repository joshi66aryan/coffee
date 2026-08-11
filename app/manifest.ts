import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Sherpa Sips',
    short_name: 'Sherpa Sips',
    description: 'Guiding you to the perfect brew — café supply ordering',
    start_url: '/',
    display: 'standalone',
    background_color: '#e2ddc8',
    theme_color: '#5c2d11',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
