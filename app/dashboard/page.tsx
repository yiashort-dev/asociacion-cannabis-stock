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

  useEffect(() => { loadStats() }, [])

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

  const today = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500 capitalize">{today}</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Cargando...</div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 shadow">
              <p className="text-sm text-gray-500">Stock Total (g)</p>
              <p className="text-3xl font-bold text-gray-800">{stats.stockTotal}</p>
              <p className="text-xs text-gray-400 mt-1">{stats.totalProductos} productos activos</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow">
              <p className="text-sm text-gray-500">Ventas Hoy</p>
              <p className="text-3xl font-bold text-green-600">{stats.ventasHoy.toFixed(2)} EUR</p>
              <p className="text-xs text-gray-400 mt-1">Total del dia</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow">
              <p className="text-sm text-gray-500">Compras Hoy</p>
              <p className="text-3xl font-bold text-blue-600">{stats.comprasHoy.toFixed(2)} EUR</p>
              <p className="text-xs text-gray-400 mt-1">Total del dia</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow">
              <p className="text-sm text-gray-500">Socios Activos</p>
              <p className="text-3xl font-bold text-gray-800">{stats.totalPersonas}</p>
              <p className="text-xs text-gray-400 mt-1">Personas registradas</p>
            </div>
            <div className={`bg-white rounded-xl p-4 shadow ${stats.productosBajos > 0 ? 'border-l-4 border-red-500' : ''}`}>
              <p className="text-sm text-gray-500">Stock Bajo</p>
              <p className={`text-3xl font-bold ${stats.productosBajos > 0 ? 'text-red-600' : 'text-gray-800'}`}>{stats.productosBajos}</p>
              <p className="text-xs text-gray-400 mt-1">Productos bajo minimo</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl p-4 shadow mb-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-3">Acciones Rapidas</h2>
            <div className="flex flex-wrap gap-2">
              <Link href="/dashboard/ventas" className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">+ Nueva Venta</Link>
              <Link href="/dashboard/compras" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">+ Nueva Compra</Link>
              <Link href="/dashboard/productos" className="bg-gray-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-700">+ Nuevo Producto</Link>
              <Link href="/dashboard/personas" className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700">+ Nueva Persona</Link>
            </div>
          </div>

          {/* Low Stock Warning */}
          {lowProducts.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <h2 className="text-lg font-semibold text-red-700 mb-3">Productos Bajo Minimo</h2>
              <div className="space-y-2">
                {lowProducts.map(p => (
                  <div key={p.name} className="flex justify-between text-sm">
                    <span className="text-gray-700">{p.name}</span>
                    <span className="font-bold text-red-600">{p.stock_current} {p.unit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {lowProducts.length === 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-700 text-sm">
              Todos los productos tienen stock suficiente
            </div>
          )}
        </>
      )}
    </div>
  )
}
