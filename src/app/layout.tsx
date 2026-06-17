import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Studio UGC IA',
  description: 'Plateforme de production créative assistée par IA',
}

// Applique le thème persisté avant le 1er paint (anti-FOUC).
// Lit le store zustand 'studio-settings' → { state: { theme } }. Défaut: dark.
const themeScript = `(function(){try{var t='dark';var r=localStorage.getItem('studio-settings');if(r){var p=JSON.parse(r);if(p&&p.state&&p.state.theme){t=p.state.theme}}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme='dark'}})();`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  )
}