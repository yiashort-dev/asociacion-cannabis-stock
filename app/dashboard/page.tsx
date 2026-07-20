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
    totalProductos: 0,
    stockTotal: 0,
    ventasHoy: 0,
    comprasHoy: 0,
    productosBajos: 0,
    totalPersonas: 0
  })
  const [lowProducts, setLowProducts] = useState<{name:string; stock_actual:number; stock_min:number; unit:string}[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadStats() }, [])

  async function loadStats() {
    setLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]

      const { data: products, error: prodError } = await supabase
        .from('products')
        .select('name, stock_actual, stock_min, unit, active')

      if (prodError) console.error('Error products:', prodError)

      const { data: ventas } = await supabase
        .from('sales')
        .select('total_amount')
        .gte('sale_date', today)

      const { data: compras } = await supabase
        .from('purchases')
        .select('total_cost')
        .gte('purchase_date', today)

      const { data: persons } = await supabase
        .from('persons')
        .select('id')
        .eq('active', true)

      const allProducts = (products || [])
      const activeProducts = allProducts.filter((p: any) => p.active === true || p.active === 'true')
      const low = activeProducts.filter((p: any) => (p.stock_actual ?? 0) <= (p.stock_min ?? 10))

      setLowProducts(low)
      setStats({
        totalProductos: activeProducts.length,
        stockTotal: activeProducts.reduce((s: number, p: any) => s + (Number(p.stock_actual) || 0), 0),
        ventasHoy: (ventas || []).reduce((s: number, v: any) => s + (Number(v.total_amount) || 0), 0),
        comprasHoy: (compras || []).reduce((s: number, c: any) => s + (Number(c.total_cost) || 0), 0),
        productosBajos: low.length,
        totalPersonas: (persons || []).length
      })
    } catch (err) {
      console.error('Error loadStats:', err)
    } finally {
      setLoading(false)
    }
  }

  const fecha = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 capitalize">{fecha}</p>
      </div>

      {loading ? (
        <p className="text-gray-400">Cargando...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-gray-800 rounded-xl p-5">
              <p className="text-gray-400 text-sm">Stock Total (g)</p>
              <p className="text-3xl font-bold text-white mt-1">{stats.stockTotal.toFixed(1)}</p>
              <p className="text-gray-500 text-sm mt-1">{stats.totalProductos} productos activos</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-5">
              <p className="text-gray-400 text-sm">Ventas Hoy</p>
              <p className="text-3xl font-bold text-green-400 mt-1">{stats.ventasHoy.toFixed(2)} EUR</p>
              <p className="text-gray-500 text-sm mt-1">Total del dia</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-5">
              <p className="text-gray-400 text-sm">Compras Hoy</p>
              <p className="text-3xl font-bold text-blue-400 mt-1">{stats.comprasHoy.toFixed(2)} EUR</p>
              <p className="text-gray-500 text-sm mt-1">Total del dia</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-5">
              <p className="text-gray-400 text-sm">Socios Activos</p>
              <p className="text-3xl font-bold text-white mt-1">{stats.totalPersonas}</p>
              <p className="text-gray-500 text-sm mt-1">Personas registradas</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-5">
              <p className="text-gray-400 text-sm">Stock Bajo</p>
              <p className="text-3xl font-bold text-white mt-1">{stats.productosBajos}</p>
              <p className="text-gray-500 text-sm mt-1">Productos bajo minimo</p>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-3">Acciones Rapidas</h2>
            <div className="flex flex-wrap gap-3">
              <Link href="/dashboard/ventas/nueva" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium">+ Nueva Venta</Link>
              <Link href="/dashboard/compras/nueva" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">+ Nueva Compra</Link>
              <Link href="/dashboard/productos/nuevo" className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium">+ Nuevo Producto</Link>
              <Link href="/dashboard/personas/nueva" className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium">+ Nueva Persona</Link>
            </div>
          </div>

          <div>
            {stats.productosBajos > 0 ? (
              <div className="bg-red-900/30 border border-red-700 rounded-xl p-4">
                <p className="text-red-400 font-medium">⚠️ Stock bajo en {stats.productosBajos} producto(s)</p>
                {lowProducts.map(p => (
                  <div key={p.name} className="text-sm text-gray-300 mt-1">
                    {p.name} - {p.stock_actual}{p.unit} / min {p.stock_min}{p.unit}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-green-900/30 border border-green-700 rounded-xl p-4">
                <p className="text-green-400">Todos los productos tienen stock suficiente</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
