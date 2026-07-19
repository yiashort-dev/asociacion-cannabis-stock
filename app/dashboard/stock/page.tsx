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

export default function StockPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [showLow, setShowLow] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const {data} = await supabase.from('products').select('id,name,unit,stock_actual,stock_min,cost_price,sale_price,active').order('name')
    setProducts(data||[])
    setLoading(false)
  }

  function exportCSV() {
    const rows=[['Producto','Unidad','Stock','Min','P.Compra','P.Venta','Valor','Estado']]
    filtered.forEach(p=>rows.push([p.name, p.unit, String(p.stock_actual), String(p.stock_min||10), (p.cost_price||0).toFixed(2), (p.sale_price||0).toFixed(2), (p.stock_actual*(p.sale_price||0)).toFixed(2), p.active?'Activo':'Inactivo']))
    const csv=rows.map(r=>r.map(v=>`\"${v}\"`).join(',')).join('\n')
    const a=document.createElement('a')
    a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}))
    a.download=`stock_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const filtered = products.filter(p => {
    const ok = !filter || p.name.toLowerCase().includes(filter.toLowerCase())
    const low = !showLow || p.stock_actual <= (p.stock_min||10)
    return ok && low && p.active
  })

  const totalVal = products.filter(p=>p.active).reduce((s,p)=>s+p.stock_actual*(p.sale_price||0),0)
  const lowCount = products.filter(p=>p.active && p.stock_actual<=(p.stock_min||10)).length
  const totalGr = products.filter(p=>p.active).reduce((s,p)=>s+p.stock_actual,0)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Stock</h1>
            <p className="text-xs text-gray-500">{filtered.length} productos</p>
          </div>
          <div className="flex gap-2">
            <button onClick={exportCSV} className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            </button>
            <button onClick={load} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm">♻️</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 px-4 py-3">
        <div className="bg-white rounded-xl p-3 shadow-sm text-center">
          <p className="text-xs text-gray-500 mb-1">Total Stock</p>
          <p className="text-xl font-bold text-gray-800">{totalGr}<span className="text-xs font-normal text-gray-400">g</span></p>
        </div>
        <div className={`bg-white rounded-xl p-3 shadow-sm text-center ${lowCount>0?'border-l-4 border-red-500':''}`}>
          <p className="text-xs text-gray-500 mb-1">Bajo Min</p>
          <p className={`text-xl font-bold ${lowCount>0?'text-red-600':'text-gray-800'}`}>{lowCount}</p>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm text-center">
          <p className="text-xs text-gray-500 mb-1">Valor</p>
          <p className="text-xl font-bold text-green-700">{totalVal.toFixed(0)}<span className="text-xs font-normal text-gray-400">€</span></p>
        </div>
      </div>

      <div className="px-4 pb-3 flex gap-2">
        <input type="text" placeholder="Buscar producto..." value={filter} onChange={e=>setFilter(e.target.value)} className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm shadow-sm" />
        <button onClick={()=>setShowLow(!showLow)} className={`px-3 py-2.5 rounded-xl text-sm font-medium shadow-sm border transition-colors ${showLow?'bg-red-100 text-red-700 border-red-200':'bg-white text-gray-600 border-gray-200'}`}>
          {showLow?'🔴':'Todos'}
        </button>
      </div>

      <div className="px-4 pb-24 space-y-2">
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"/></div>
        ) : filtered.length===0 ? (
          <div className="text-center py-12 text-gray-400"><p className="text-sm">Sin productos</p></div>
        ) : filtered.map(p => {
          const isLow = p.stock_actual <= (p.stock_min||10)
          const valor = p.stock_actual * (p.sale_price||0)
          const pct = Math.min(100, Math.max(0, (p.stock_actual / Math.max(p.stock_min||10, 1)) * 100))
          return (
            <div key={p.id} className={`bg-white rounded-2xl shadow-sm border-l-4 overflow-hidden ${isLow?'border-red-400':'border-green-400'}`}>
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-base">{p.name}</h3>
                    <span className="text-xs text-gray-400">{p.unit}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isLow?'bg-red-100 text-red-700':'bg-green-100 text-green-700'}`}>
                    {isLow?'Bajo min.':'OK'}
                  </span>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <span className={`text-3xl font-bold ${isLow?'text-red-600':'text-gray-800'}`}>{p.stock_actual}</span>
                    <span className="text-sm text-gray-400 ml-1">{p.unit}</span>
                    <p className="text-xs text-gray-400 mt-0.5">Min: {p.stock_min||10}{p.unit}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-700">{valor.toFixed(2)} €</p>
                    <p className="text-xs text-gray-400">{(p.sale_price||0).toFixed(2)} €/{p.unit}</p>
                  </div>
                </div>
                <div className="mt-3 bg-gray-100 rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full transition-all ${isLow?'bg-red-400':'bg-green-400'}`} style={{width: `${pct}%`}} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
