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
  const [lowProducts, setLowProducts] = useState<{name:string; stock_actual:number; stock_min:number; unit:string}[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadStats() }, [])

  async function loadStats() {
    setLoading(true)
    const today = new Date().toISOString().split('T')[0]
    const [{ data: products }, { data: ventas }, { data: compras }, { data: persons }] = await Promise.all([
      supabase.from('products').select('name, stock_actual, stock_min, unit, active'),
      supabase.from('sales').select('total_amount').gte('sale_date', today),
      supabase.from('purchases').select('total_cost').gte('purchase_date', today),
      supabase.from('persons').select('id').eq('active', true)
    ])
    const activeProducts = (products || []).filter(p => p.active)
    const low = activeProducts.filter(p => p.stock_actual <= (p.stock_min ?? 10))
    setLowProducts(low)
    setStats({
      totalProductos: activeProducts.length,
      stockTotal: activeProducts.reduce((s, p) => s + (p.stock_actual || 0), 0),
      ventasHoy: (ventas || []).reduce((s, v) => s + (v.total_amount || 0), 0),
      comprasHoy: (compras || []).reduce((s, c) => s + (c.total_cost || 0), 0),
      productosBajos: low.length,
      totalPersonas: (persons || []).length
    })
    setLoading(false)
  }

  const fecha = new Date().toLocaleDateString('es-ES', { weekday:'long', year:'numeric', month:'long', day:'numeric' })

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 capitalize">{fecha}</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Stock Total (g)</p>
              <p className="text-2xl font-bold text-gray-900">{stats.stockTotal.toFixed(1)}</p>
              <p className="text-xs text-gray-400">{stats.totalProductos} productos activos</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Ventas Hoy</p>
              <p className="text-2xl font-bold text-green-600">{stats.ventasHoy.toFixed(2)} €</p>
              <p className="text-xs text-gray-400">Total del día</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Compras Hoy</p>
              <p className="text-2xl font-bold text-blue-600">{stats.comprasHoy.toFixed(2)} €</p>
              <p className="text-xs text-gray-400">Total del día</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Socios Activos</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalPersonas}</p>
              <p className="text-xs text-gray-400">Personas registradas</p>
            </div>
          </div>

          {stats.productosBajos > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
              <p className="text-sm font-semibold text-red-700 mb-2">⚠️ Stock bajo en {stats.productosBajos} producto(s)</p>
              {lowProducts.map(p => (
                <div key={p.name} className="flex justify-between text-xs text-red-600 py-1 border-t border-red-100">
                  <span>{p.name}</span>
                  <span>{p.stock_actual}{p.unit} / mín {p.stock_min}{p.unit}</span>
                </div>
              ))}
            </div>
          )}

          {stats.productosBajos === 0 && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-4">
              <p className="text-sm text-green-700">✅ Todos los productos tienen stock suficiente</p>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
            <p className="text-sm font-semibold text-gray-700 mb-3">Acciones Rápidas</p>
            <div className="grid grid-cols-2 gap-2">
              <Link href="/dashboard/ventas" className="bg-green-600 text-white text-center py-3 rounded-xl text-sm font-medium">+ Nueva Venta</Link>
              <Link href="/dashboard/compras" className="bg-blue-600 text-white text-center py-3 rounded-xl text-sm font-medium">+ Nueva Compra</Link>
              <Link href="/dashboard/productos" className="bg-gray-700 text-white text-center py-3 rounded-xl text-sm font-medium">+ Nuevo Producto</Link>
              <Link href="/dashboard/personas" className="bg-purple-600 text-white text-center py-3 rounded-xl text-sm font-medium">+ Nueva Persona</Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
