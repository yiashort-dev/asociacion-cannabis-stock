'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { href: '/dashboard/productos', label: 'Productos', icon: '📦' },
  { href: '/dashboard/compras', label: 'Compras', icon: '🛒' },
  { href: '/dashboard/ventas', label: 'Ventas', icon: '💰' },
  { href: '/dashboard/stock', label: 'Stock', icon: '📊' },
  { href: '/dashboard/personas', label: 'Personas', icon: '👥' },
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
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-lg font-bold text-green-400">Asociacion</h1>
          <p className="text-xs text-gray-400">Gestion Interna</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                pathname === item.href
                  ? 'bg-green-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-700">
          {user && <p className="text-xs text-gray-400 mb-2 truncate">{user.email}</p>}
          <button
            onClick={handleLogout}
            className="w-full text-sm bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg"
          >
            Cerrar sesion
          </button>
        </div>
      </aside>
      {/* Main */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
