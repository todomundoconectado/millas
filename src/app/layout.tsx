import type { Metadata } from 'next'
import { Manrope, Inter } from 'next/font/google'
import './globals.css'

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-headline',
  weight: ['400', '600', '700', '800'],
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '500', '600'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Super Millas — Supermercado Online',
    template: '%s | Super Millas',
  },
  description: 'Compre no melhor supermercado online. Frutas, carnes, laticínios, bebidas e muito mais com entrega rápida.',
  keywords: ['supermercado', 'delivery', 'compras online', 'super millas'],
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'Super Millas',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${manrope.variable} ${inter.variable} h-full`}
    >
      <head>
        {/* Material Symbols */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body className="min-h-full flex flex-col bg-surface text-on-surface antialiased">
        {children}
      </body>
    </html>
  )
}
