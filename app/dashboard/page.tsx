'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface Stats {
  totalProductos: number
  stockTotal: number
  ventasHoy: number
  comprasHoy: number
  productosBajos: number
  totalPersonas: number
}

export default function Dashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats>({
    totalProductos: 0, stockTotal: 0, ventasHoy: 0,
    comprasHoy: 0, productosBajos: 0, totalPersonas: 0
  })
  const [lowProducts, setLowProducts] = useState<{name: string; stock_current: number; unit: string}[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{email: string} | null>(null)

  useEffect(() => {
    checkAuth()
    loadStats()
  }, [])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    setUser({ email: user.email || '' })
  }

  async function loadStats() {
    setLoading(true)
    const today = new Date().toISOString().split('T')[0]
    const [{ data: products }, { data: ventas }, { data: compras }, { data: persons }] = await Promise.all([
      supabase.from('products').select('name, stock_current, unit, active'),
      supabase.from('sales').select('total').gte('date', today),
      supabase.from('purchases').select('total').gte('date', today),
      supabase.from('persons').select('id').eq('active', true)
    ])
    const activeProducts = (products || []).filter(p => p.active)
    const low = (products || []).filter(p => p.stock_current <= 10 && p.active)
    setLowProducts(low)
    setStats({
      totalProductos: activeProducts.length,
      stockTotal: activeProducts.reduce((s, p) => s + p.stock_current, 0),
      ventasHoy: (ventas || []).reduce((s, v) => s + (v.total || 0), 0),
      comprasHoy: (compras || []).reduce((s, c) => s + (c.total || 0), 0),
      productosBajos: low.length,
      totalPersonas: (persons || []).length
    })
    setLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const today = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-green-900 text-white flex flex-col">
        <div className="p-5 border-b border-green-700">
          <div className="text-xl font-bold">Asociacion</div>
          <div className="text-green-300 text-xs mt-1">Gestion Interna</div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2 rounded-lg bg-green-800 text-white text-sm font-medium">Dashboard</Link>
          <Link href="/dashboard/productos" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-green-800 text-green-100 text-sm">Productos</Link>
          <Link href="/dashboard/compras" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-green-800 text-green-100 text-sm">Compras</Link>
          <Link href="/dashboard/ventas" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-green-800 text-green-100 text-sm">Ventas</Link>
          <Link href="/dashboard/stock" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-green-800 text-green-100 text-sm">Stock</Link>
          <Link href="/dashboard/personas" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-green-800 text-green-100 text-sm">Personas</Link>
        </nav>
        <div className="p-4 border-t border-green-700">
          {user && <div className="text-green-300 text-xs mb-2 truncate">{user.email}</div>}
          <button onClick={handleLogout} className="w-full text-left text-sm text-green-200 hover:text-white py-1">Cerrar sesion</button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-6 overflow-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-500 capitalize">{today}</p>
        </div>

        {loading ? <div className="text-gray-500">Cargando...</div> : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow p-4">
                <div className="text-sm text-gray-500">Stock Total (g)</div>
                <div className="text-3xl font-bold text-green-700">{stats.stockTotal}</div>
                <div className="text-xs text-gray-400 mt-1">{stats.totalProductos} productos activos</div>
              </div>
              <div className="bg-white rounded-xl shadow p-4">
                <div className="text-sm text-gray-500">Ventas Hoy</div>
                <div className="text-3xl font-bold text-blue-700">{stats.ventasHoy.toFixed(2)} EUR</div>
                <div className="text-xs text-gray-400 mt-1">Total del dia</div>
              </div>
              <div className="bg-white rounded-xl shadow p-4">
                <div className="text-sm text-gray-500">Compras Hoy</div>
                <div className="text-3xl font-bold text-purple-700">{stats.comprasHoy.toFixed(2)} EUR</div>
                <div className="text-xs text-gray-400 mt-1">Total del dia</div>
              </div>
              <div className="bg-white rounded-xl shadow p-4">
                <div className="text-sm text-gray-500">Socios Activos</div>
                <div className="text-3xl font-bold text-gray-800">{stats.totalPersonas}</div>
                <div className="text-xs text-gray-400 mt-1">Personas registradas</div>
              </div>
              <div className={`bg-white rounded-xl shadow p-4 ${stats.productosBajos > 0 ? 'border-l-4 border-red-500' : ''}`}>
                <div className="text-sm text-gray-500">Stock Bajo</div>
                <div className={`text-3xl font-bold ${stats.productosBajos > 0 ? 'text-red-600' : 'text-gray-800'}`}>{stats.productosBajos}</div>
                <div className="text-xs text-gray-400 mt-1">Productos bajo minimo</div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow p-5 mb-6">
              <h2 className="font-semibold text-gray-700 mb-3">Acciones Rapidas</h2>
              <div className="flex gap-3 flex-wrap">
                <Link href="/dashboard/ventas" className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded font-semibold text-sm">+ Nueva Venta</Link>
                <Link href="/dashboard/compras" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded font-semibold text-sm">+ Nueva Compra</Link>
                <Link href="/dashboard/productos" className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded font-semibold text-sm">+ Nuevo Producto</Link>
                <Link href="/dashboard/personas" className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded font-semibold text-sm">+ Nueva Persona</Link>
              </div>
            </div>

            {/* Low Stock Warning */}
            {lowProducts.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                <h2 className="font-semibold text-red-700 mb-3">Productos Bajo Minimo</h2>
                <div className="space-y-2">
                  {lowProducts.map(p => (
                    <div key={p.name} className="flex items-center justify-between">
                      <span className="text-gray-800">{p.name}</span>
                      <span className="text-red-600 font-mono font-bold">{p.stock_current} {p.unit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {lowProducts.length === 0 && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                <p className="text-green-700">Todos los productos tienen stock suficiente</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
