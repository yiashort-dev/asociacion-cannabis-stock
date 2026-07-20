'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const navItems = [
  { href: '/dashboard', label: 'Inicio', icon: '🏠' },
  { href: '/dashboard/productos', label: 'Productos', icon: '📦' },
  { href: '/dashboard/compras', label: 'Compras', icon: '🛒' },
  { href: '/dashboard/ventas', label: 'Ventas', icon: '💰' },
  { href: '/dashboard/stock', label: 'Stock', icon: '📊' },
  { href: '/dashboard/personas', label: 'Socios', icon: '👥' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<{ email: string } | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push('/')
      else setUser({ email: user.email || '' })
    })
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gray-100">

      {/* Header mobile */}
      <header className="md:hidden bg-gray-900 text-white flex items-center justify-between px-4 py-3 sticky top-0 z-40">
        <div>
          <span className="text-green-400 font-bold text-lg">Asociacion</span>
          <span className="text-xs text-gray-400 ml-2">Gestion Interna</span>
        </div>
        <button onClick={()=>setMenuOpen(!menuOpen)} className="text-white text-2xl leading-none">
          {menuOpen ? '✕' : '☰'}
        </button>
      </header>

      {/* Menu desplegable mobile */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-black bg-opacity-50" onClick={()=>setMenuOpen(false)}>
          <div className="bg-gray-900 w-64 h-full p-4 flex flex-col" onClick={e=>e.stopPropagation()}>
            <div className="mb-6 mt-2">
              <h1 className="text-xl font-bold text-green-400">Asociacion</h1>
              <p className="text-xs text-gray-400">Gestion Interna</p>
            </div>
            <nav className="flex-1 space-y-1">
              {navItems.map(item => (
                <Link key={item.href} href={item.href} onClick={()=>setMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    pathname===item.href
                      ? 'bg-green-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800'
                  }`}>
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
            {user && <p className="text-xs text-gray-500 mt-4 mb-2">{user.email}</p>}
            <button onClick={handleLogout} className="bg-red-600 text-white py-2 rounded-xl text-sm font-medium">Cerrar sesion</button>
          </div>
        </div>
      )}

      <div className="flex">
        {/* Sidebar desktop */}
        <aside className="hidden md:flex w-64 bg-gray-900 text-white flex-col min-h-screen">
          <div className="p-4 border-b border-gray-700">
            <h1 className="text-lg font-bold text-green-400">Asociacion</h1>
            <p className="text-xs text-gray-400">Gestion Interna</p>
          </div>
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map(item => (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  pathname===item.href
                    ? 'bg-green-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800'
                }`}>
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
          {user && <p className="text-xs text-gray-500 px-4 mb-2">{user.email}</p>}
          <div className="p-4">
            <button onClick={handleLogout} className="w-full bg-red-600 text-white py-2 rounded-xl text-sm font-medium">Cerrar sesion</button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 pb-20 md:pb-0 min-h-screen">
          {children}
        </main>
      </div>

      {/* Bottom nav mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 flex">
        {navItems.map(item => (
          <Link key={item.href} href={item.href}
            className={`flex-1 flex flex-col items-center py-2 text-xs transition-colors ${
              pathname===item.href
                ? 'text-green-600'
                : 'text-gray-400'
            }`}>
            <span className="text-xl leading-tight">{item.icon}</span>
            <span className="text-[10px] mt-0.5 leading-tight">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
