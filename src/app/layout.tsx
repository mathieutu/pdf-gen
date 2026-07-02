import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import Script from 'next/script'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'PDF Generation API',
  description: 'A powerful, easy-to-use API for generating PDF documents from HTML content or URLs.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const analyticsEnabled = process.env.NODE_ENV === 'production'
    && (!process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NEXT_PUBLIC_VERCEL_ENV === 'production')

  /* eslint-disable react/dom-no-dangerously-set-innerhtml */
  return (
    <html lang="en">
      <body
        className={`
          ${geistSans.variable}
          ${geistMono.variable}
          antialiased
        `}
      >
        {children}
        {analyticsEnabled && <Script async src="https://e.mathieutu.dev/js/pa-kzhH-vdvwiWc_WXNid43B.js" />}
        {analyticsEnabled && (
          <Script
            id="next-plausible-init"
            dangerouslySetInnerHTML={{
              __html: `
                window.plausible=window.plausible||function()
                {(plausible.q = plausible.q || []).push(arguments)}
                ,plausible.init=plausible.init||function(i)
                {plausible.o = i || {}}
                ;
                plausible.init()
        `,
            }}
          />
        )}
      </body>
    </html>
  )
}
