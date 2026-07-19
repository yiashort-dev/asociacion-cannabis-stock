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
  const [productos, setProductos] = useState<any[]>([])
  const [movimientos, setMovimientos] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkUser()
    loadData()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    setUser(user)
  }

  const loadData = async () => {
    const today = new Date().toISOString().split('T')[0]

    const [{ data: prods }, { data: ventas }, { data: compras }, { data: personas }, { data: movs }] = await Promise.all([
      supabase.from('products').select('*').eq('active', true),
      supabase.from('sales').select('total_amount').eq('sale_date', today).eq('status', 'active'),
      supabase.from('purchases').select('total_cost').eq('purchase_date', today).eq('status', 'active'),
      supabase.from('persons').select('id').eq('active', true),
      supabase.from('stock_movements').select('*, products(name)').order('created_at', { ascending: false }).limit(8)
    ])

    const prods_ = prods || []
    setProductos(prods_.filter((p: any) => p.stock_actual <= p.stock_min).slice(0, 5))
    setMovimientos(movs || [])
    setStats({
      totalProductos: prods_.length,
      stockTotal: prods_.reduce((a: number, p: any) => a + Number(p.stock_actual), 0),
      ventasHoy: (ventas || []).reduce((a: number, v: any) => a + Number(v.total_amount), 0),
      comprasHoy: (compras || []).reduce((a: number, c: any) => a + Number(c.total_cost), 0),
      productosBajos: prods_.filter((p: any) => p.stock_actual <= p.stock_min).length,
      totalPersonas: (personas || []).length
    })
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="text-green-600 text-lg font-medium">Cargando...</div></div>

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 shadow-sm z-10">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-xl">🌿</span>
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-sm">Asociacion Stock</h2>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
          </div>
        </div>
        <nav className="p-4 space-y-1">
          <Link href="/dashboard" className="sidebar-link active">🏠 Dashboard</Link>
          <Link href="/dashboard/productos" className="sidebar-link">🌿 Productos</Link>
          <Link href="/dashboard/personas" className="sidebar-link">👥 Personas</Link>
          <Link href="/dashboard/compras" className="sidebar-link">📦 Compras</Link>
          <Link href="/dashboard/ventas" className="sidebar-link">💰 Ventas</Link>
          <Link href="/dashboard/stock" className="sidebar-link">📊 Stock</Link>
          <Link href="/dashboard/movimientos" className="sidebar-link">🔄 Movimientos</Link>
        </nav>
        <div className="absolute bottom-4 left-4 right-4">
          <button onClick={handleLogout} className="btn-danger w-full text-sm">🚪 Cerrar sesion</button>
        </div>
      </div>

      {/* Main */}
      <div className="ml-64 p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm">{new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        {/* Metricas */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="card">
            <p className="text-sm text-gray-500">Stock Total (g)</p>
            <p className="text-3xl font-bold text-green-600 mt-1">{stats.stockTotal.toFixed(0)}</p>
            <p className="text-xs text-gray-400 mt-1">{stats.totalProductos} productos activos</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-500">Ventas Hoy</p>
            <p className="text-3xl font-bold text-blue-600 mt-1">{stats.ventasHoy.toFixed(2)} EUR</p>
            <p className="text-xs text-gray-400 mt-1">Total del dia</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-500">Compras Hoy</p>
            <p className="text-3xl font-bold text-purple-600 mt-1">{stats.comprasHoy.toFixed(2)} EUR</p>
            <p className="text-xs text-gray-400 mt-1">Total del dia</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-500">Socios Activos</p>
            <p className="text-3xl font-bold text-gray-700 mt-1">{stats.totalPersonas}</p>
            <p className="text-xs text-gray-400 mt-1">Personas registradas</p>
          </div>
          <div className="card border-l-4 border-l-red-400">
            <p className="text-sm text-red-500 font-medium">Stock Bajo</p>
            <p className="text-3xl font-bold text-red-600 mt-1">{stats.productosBajos}</p>
            <p className="text-xs text-gray-400 mt-1">Productos bajo minimo</p>
          </div>
          <div className="card bg-green-600 text-white">
            <p className="text-sm text-green-100">Acciones Rapidas</p>
            <div className="mt-3 space-y-2">
              <Link href="/dashboard/ventas/nueva" className="block text-sm bg-white text-green-700 rounded-lg px-3 py-2 font-medium text-center hover:bg-green-50">+ Nueva Venta</Link>
              <Link href="/dashboard/compras/nueva" className="block text-sm bg-green-700 text-white rounded-lg px-3 py-2 font-medium text-center hover:bg-green-800">+ Nueva Compra</Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Productos bajo stock */}
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span>⚠️</span> Productos Bajo Minimo
            </h3>
            {productos.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Todos los productos tienen stock suficiente</p>
            ) : (
              <div className="space-y-2">
                {productos.map((p: any) => (
                  <div key={p.id} className="flex justify-between items-center py-2 border-b border-gray-50">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.variety}</p>
                    </div>
                    <div className="text-right">
                      <span className="badge-red">{p.stock_actual}{p.unit}</span>
                      <p className="text-xs text-gray-400 mt-1">min: {p.stock_min}{p.unit}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ultimos movimientos */}
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span>🔄</span> Ultimos Movimientos
            </h3>
            {movimientos.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Sin movimientos registrados</p>
            ) : (
              <div className="space-y-2">
                {movimientos.map((m: any) => (
                  <div key={m.id} className="flex justify-between items-center py-2 border-b border-gray-50">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{m.products?.name}</p>
                      <p className="text-xs text-gray-400">{new Date(m.created_at).toLocaleDateString('es-ES')}</p>
                    </div>
                    <div className="text-right">
                      <span className={m.movement_type === 'entrada' ? 'badge-green' : m.movement_type === 'salida' ? 'badge-red' : 'badge-yellow'}>
                        {m.movement_type === 'entrada' ? '+' : '-'}{m.quantity}g
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
