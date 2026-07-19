'use client'
import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Link from 'next/link'

interface Product {
  id: string; name: string; unit: string; stock_current: number;
  price_purchase: number; price_sale: number; active: boolean;
}

export default function StockPage() {
  const supabase = createClientComponentClient()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [showLowStock, setShowLowStock] = useState(false)

  useEffect(() => { loadProducts() }, [])

  async function loadProducts() {
    setLoading(true)
    const { data } = await supabase.from('products').select('*').order('name')
    setProducts(data || [])
    setLoading(false)
  }

  function exportCSV() {
    const rows = [
      ['Producto', 'Unidad', 'Stock Actual', 'P. Compra', 'P. Venta', 'Valor Stock', 'Estado'],
      ...products.map(p => [
        p.name, p.unit, p.stock_current, p.price_purchase, p.price_sale,
        (p.stock_current * p.price_purchase).toFixed(2),
        p.active ? 'Activo' : 'Inactivo'
      ])
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `stock_${new Date().toISOString().split('T')[0]}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  const filtered = products.filter(p => {
    const matchName = p.name.toLowerCase().includes(filter.toLowerCase())
    const matchLow = !showLowStock || p.stock_current <= 10
    return matchName && matchLow
  })

  const totalValue = products.reduce((s, p) => s + p.stock_current * p.price_purchase, 0)
  const lowStockCount = products.filter(p => p.stock_current <= 10 && p.active).length

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-orange-800 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-orange-200 hover:text-white">← Dashboard</Link>
          <h1 className="text-xl font-bold">Control de Stock</h1>
        </div>
        <button onClick={exportCSV} className="bg-orange-600 hover:bg-orange-500 px-4 py-2 rounded font-semibold">
          ↓ Exportar CSV
        </button>
      </nav>

      <div className="max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow p-4">
            <div className="text-sm text-gray-500">Total productos activos</div>
            <div className="text-2xl font-bold">{products.filter(p => p.active).length}</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4">
            <div className="text-sm text-gray-500">Valor total en stock (compra)</div>
            <div className="text-2xl font-bold text-green-700">{totalValue.toFixed(2)}€</div>
          </div>
          <div className={`bg-white rounded-xl shadow p-4 ${lowStockCount > 0 ? 'border-l-4 border-red-500' : ''}`}>
            <div className="text-sm text-gray-500">Stock bajo (≤10 unidades)</div>
            <div className={`text-2xl font-bold ${lowStockCount > 0 ? 'text-red-600' : 'text-gray-800'}`}>{lowStockCount}</div>
          </div>
        </div>

        <div className="flex gap-4 mb-4">
          <input
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Buscar producto..."
            className="flex-1 border rounded px-3 py-2"
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={showLowStock} onChange={e => setShowLowStock(e.target.checked)} className="w-4 h-4" />
            <span className="text-sm font-medium text-red-600">Solo stock bajo</span>
          </label>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Cargando...</div>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left px-4 py-3">Producto</th>
                  <th className="text-center px-4 py-3">Unidad</th>
                  <th className="text-right px-4 py-3">Stock Actual</th>
                  <th className="text-right px-4 py-3">P. Compra</th>
                  <th className="text-right px-4 py-3">P. Venta</th>
                  <th className="text-right px-4 py-3">Valor Stock</th>
                  <th className="text-center px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className={`border-t hover:bg-gray-50 ${p.stock_current <= 10 && p.active ? 'bg-red-50' : ''}`}>
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="text-center px-4 py-3 text-gray-500">{p.unit}</td>
                    <td className={`text-right px-4 py-3 font-mono font-bold ${p.stock_current <= 10 ? 'text-red-600' : p.stock_current <= 50 ? 'text-yellow-600' : 'text-green-700'}`}>
                      {p.stock_current}
                      {p.stock_current <= 10 && p.active && <span className="ml-1 text-xs">⚠️</span>}
                    </td>
                    <td className="text-right px-4 py-3">{p.price_purchase?.toFixed(2)}€</td>
                    <td className="text-right px-4 py-3">{p.price_sale?.toFixed(2)}€</td>
                    <td className="text-right px-4 py-3 font-semibold">{(p.stock_current * p.price_purchase).toFixed(2)}€</td>
                    <td className="text-center px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        {p.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-8 text-gray-400">No hay productos</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
