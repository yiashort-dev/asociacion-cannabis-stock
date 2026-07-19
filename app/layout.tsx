import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Asociacion Stock - Gestion Interna',
  description: 'Sistema de gestion de stock, compras y ventas',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  )
}
