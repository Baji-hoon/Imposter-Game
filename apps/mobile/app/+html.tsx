import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

/**
 * Custom root HTML for Web export.
 * Configured specifically for iPhone Safari & Neo-Brutalist design:
 * - Preloaded Abril Fatface & Archivo Google Fonts to avoid FOUT
 * - apple-mobile-web-app-capable and mobile web app status bar style
 * - viewport-fit=cover and 100dvh support
 * - touch-action and user-select protection
 * - Cream background (#F4F1EA)
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover, user-scalable=no"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Imposter" />
        <meta name="theme-color" content="#F4F1EA" />
        <link rel="apple-touch-icon" href="/favicon.ico" />
        <title>Imposter</title>

        {/* Preload Neo-Brutalist Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Abril+Fatface&family=Archivo:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />

        <ScrollViewStyleReset />

        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body {
                height: 100%;
                height: 100dvh;
                margin: 0;
                padding: 0;
                overflow-x: hidden;
                background-color: #F4F1EA;
                color: #111111;
                font-family: 'Archivo_500Medium', 'Archivo', system-ui, -apple-system, sans-serif;
                -webkit-touch-callout: none;
                -webkit-tap-highlight-color: transparent;
                -webkit-user-select: none;
                user-select: none;
              }
              #root {
                display: flex;
                height: 100%;
                min-height: 100dvh;
                width: 100%;
                flex: 1;
                background-color: #F4F1EA;
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
