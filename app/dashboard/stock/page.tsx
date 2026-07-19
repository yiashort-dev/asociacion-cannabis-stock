'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Product {
  id: number
  name: string
  unit: string
  stock_actual: number
  stock_min: number
  cost_price: number
  sale_price: number
  active: boolean
}

function exportCSV(products: Product[]) {
  const rows = [['Producto', 'Unidad', 'Stock Actual', 'Stock Minimo', 'P. Compra', 'P. Venta', 'Estado']]
  products.forEach(p => {
    rows.push([
      p.name,
      p.unit,
      String(p.stock_actual),
      String(p.stock_min || 0),
      p.cost_price?.toFixed(2) || '0',
      p.sale_price?.toFixed(2) || '0',
      p.active ? 'Activo' : 'Inactivo'
    ])
  })
  const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `stock_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function StockPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [showLowStock, setShowLowStock] = useState(false)
  const [showInactive, setShowInactive] = useState(false)

  useEffect(() => { loadProducts() }, [])

  async function loadProducts() {
    setLoading(true)
    const { data } = await supabase.from('products').select('*').order('name')
    setProducts(data || [])
    setLoading(false)
  }

  const filtered = products.filter(p => {
    const matchFilter = !filter || p.name.toLowerCase().includes(filter.toLowerCase())
    const matchActive = showInactive ? true : p.active
    const matchLow = showLowStock ? p.stock_actual <= (p.stock_min || 10) : true
    return matchFilter && matchActive && matchLow
  })

  const totalStock = products.filter(p => p.active).reduce((s, p) => s + p.stock_actual, 0)
  const lowCount = products.filter(p => p.active && p.stock_actual <= (p.stock_min || 10)).length
  const totalValue = products.filter(p => p.active).reduce((s, p) => s + p.stock_actual * (p.sale_price || 0), 0)

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Stock</h1>
        <div className="flex gap-2">
          <button onClick={() => exportCSV(filtered)} className="bg-gray-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-700">Exportar CSV</button>
          <button onClick={loadProducts} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">Actualizar</button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow">
          <p className="text-sm text-gray-500">Stock Total</p>
          <p className="text-2xl font-bold text-gray-800">{totalStock}<span className="text-sm font-normal text-gray-400 ml-1">g</span></p>
        </div>
        <div className={`bg-white rounded-xl p-4 shadow ${lowCount > 0 ? 'border-l-4 border-red-500' : ''}`}>
          <p className="text-sm text-gray-500">Bajo Minimo</p>
          <p className={`text-2xl font-bold ${lowCount > 0 ? 'text-red-600' : 'text-gray-800'}`}>{lowCount}<span className="text-sm font-normal text-gray-400 ml-1">productos</span></p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow">
          <p className="text-sm text-gray-500">Valor de Venta</p>
          <p className="text-2xl font-bold text-green-700">{totalValue.toFixed(2)}<span className="text-sm font-normal text-gray-400 ml-1">EUR</span></p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow">
        <div className="p-4 border-b flex gap-4 items-center flex-wrap">
          <input type="text" placeholder="Buscar producto..." value={filter} onChange={e => setFilter(e.target.value)} className="border rounded-lg p-2 text-sm flex-1 min-w-48 max-w-sm" />
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={showLowStock} onChange={e => setShowLowStock(e.target.checked)} />
            Solo bajo minimo
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
            Mostrar inactivos
          </label>
          <span className="text-sm text-gray-500">{filtered.length} productos</span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-500">Cargando...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3 text-gray-600">Producto</th>
                <th className="text-center p-3 text-gray-600">Stock Actual</th>
                <th className="text-center p-3 text-gray-600">Minimo</th>
                <th className="text-center p-3 text-gray-600">Estado Stock</th>
                <th className="text-right p-3 text-gray-600">P. Venta</th>
                <th className="text-right p-3 text-gray-600">Valor</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const isLow = p.stock_actual <= (p.stock_min || 10)
                return (
                  <tr key={p.id} className={`border-t hover:bg-gray-50 ${!p.active ? 'opacity-50' : ''}`}>
                    <td className="p-3">
                      <div className="font-medium text-gray-800">{p.name}</div>
                      <div className="text-xs text-gray-400">{p.unit}</div>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`text-xl font-bold ${isLow ? 'text-red-600' : 'text-gray-800'}`}>
                        {p.stock_actual}
                      </span>
                      <span className="text-xs text-gray-400 ml-1">{p.unit}</span>
                    </td>
                    <td className="p-3 text-center text-gray-400 text-sm">{p.stock_min || 10}{p.unit}</td>
                    <td className="p-3 text-center">
                      {isLow ? (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Bajo minimo</span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">OK</span>
                      )}
                    </td>
                    <td className="p-3 text-right text-gray-600">{p.sale_price?.toFixed(2)} EUR</td>
                    <td className="p-3 text-right font-medium text-green-700">{(p.stock_actual * (p.sale_price || 0)).toFixed(2)} EUR</td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-gray-400">Sin productos</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
