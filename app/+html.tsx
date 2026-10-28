import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <title>Trino — Fé em Constância</title>

        {/* PWA & iOS Safari Home Screen Meta Tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Trino" />
        <meta name="theme-color" content="#03192E" />

        {/* Favicon & Mobile Home Screen Launcher Icons */}
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon-precomposed" href="/apple-touch-icon-precomposed.png" />
        <link rel="manifest" href="/manifest.json" />

        {/* Google Fonts: Inter & Outfit com suporte de alta performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@500;600;700&display=swap" 
          rel="stylesheet" 
        />

        <style dangerouslySetInnerHTML={{ __html: `
          /* Mapeamento de Fontes do Design System Trino para Web */
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@500;600;700&display=swap');

          @font-face {
            font-family: 'Outfit_700Bold';
            src: local('Outfit Bold'), local('Outfit-Bold'), url('https://fonts.gstatic.com/s/outfit/v11/QxbgTeY83dFLTWqj2PYnvnEKbzg.woff2') format('woff2');
            font-weight: 700;
            font-display: swap;
          }
          @font-face {
            font-family: 'Outfit_600SemiBold';
            src: local('Outfit SemiBold'), local('Outfit-SemiBold'), url('https://fonts.gstatic.com/s/outfit/v11/QxbgTeY83dFLTWqj2PYnvnEKbzg.woff2') format('woff2');
            font-weight: 600;
            font-display: swap;
          }
          @font-face {
            font-family: 'Outfit_500Medium';
            src: local('Outfit Medium'), local('Outfit-Medium'), url('https://fonts.gstatic.com/s/outfit/v11/QxbgTeY83dFLTWqj2PYnvnEKbzg.woff2') format('woff2');
            font-weight: 500;
            font-display: swap;
          }
          @font-face {
            font-family: 'Inter_700Bold';
            src: local('Inter Bold'), local('Inter-Bold'), url('https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hiA.woff2') format('woff2');
            font-weight: 700;
            font-display: swap;
          }
          @font-face {
            font-family: 'Inter_600SemiBold';
            src: local('Inter SemiBold'), local('Inter-SemiBold'), url('https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hiA.woff2') format('woff2');
            font-weight: 600;
            font-display: swap;
          }
          @font-face {
            font-family: 'Inter_500Medium';
            src: local('Inter Medium'), local('Inter-Medium'), url('https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI6fAZ9hiA.woff2') format('woff2');
            font-weight: 500;
            font-display: swap;
          }
          @font-face {
            font-family: 'Inter_400Regular';
            src: local('Inter Regular'), local('Inter-Regular'), url('https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2') format('woff2');
            font-weight: 400;
            font-display: swap;
          }

          body, html, #root {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }
        `}} />

        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
