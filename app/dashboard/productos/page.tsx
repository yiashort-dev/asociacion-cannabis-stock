'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Product {
  id: number
  name: string
  description: string
  unit: string
  cost_price: number
  sale_price: number
  stock_actual: number
  stock_min: number
  active: boolean
}

export default function ProductosPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number|null>(null)
  const [form, setForm] = useState({name:'', description:'', unit:'g', cost_price:'', sale_price:'', stock_min:'10'})
  const [msg, setMsg] = useState('')
  const [filter, setFilter] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const {data} = await supabase.from('products').select('*').order('name')
    setProducts(data||[])
    setLoading(false)
  }

  function exportCSV() {
    const rows=[['Nombre','Desc','Unidad','Stock','Min','P.Compra','P.Venta','Estado']]
    filtered.forEach(p=>rows.push([p.name, p.description||'', p.unit, String(p.stock_actual), String(p.stock_min||10), (p.cost_price||0).toFixed(2), (p.sale_price||0).toFixed(2), p.active?'Activo':'Inactivo']))
    const csv=rows.map(r=>r.map(v=>`\"${v}\"`).join(',')).join('\n')
    const a=document.createElement('a')
    a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}))
    a.download=`productos_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  function startEdit(p: Product) {
    setEditId(p.id)
    setForm({name:p.name, description:p.description||'', unit:p.unit, cost_price:String(p.cost_price||''), sale_price:String(p.sale_price||''), stock_min:String(p.stock_min||10)})
    setShowForm(true)
  }

  function cancelForm() {
    setShowForm(false)
    setEditId(null)
    setForm({name:'', description:'', unit:'g', cost_price:'', sale_price:'', stock_min:'10'})
    setMsg('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setMsg('Nombre requerido'); return }
    setMsg('')
    const payload = {name:form.name, description:form.description, unit:form.unit, cost_price:parseFloat(form.cost_price)||0, sale_price:parseFloat(form.sale_price)||0, stock_min:parseInt(form.stock_min)||10}
    if (editId) {
      const {error} = await supabase.from('products').update(payload).eq('id', editId)
      if (error) { setMsg('Error: '+error.message); return }
      setMsg('Producto actualizado')
    } else {
      const {error} = await supabase.from('products').insert({...payload, stock_actual:0, active:true})
      if (error) { setMsg('Error: '+error.message); return }
      setMsg('Producto creado')
    }
    cancelForm()
    load()
  }

  async function toggleActive(p: Product) {
    await supabase.from('products').update({active:!p.active}).eq('id',p.id)
    load()
  }

  const filtered = products.filter(p => !filter || p.name.toLowerCase().includes(filter.toLowerCase()))

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Productos</h1>
            <p className="text-xs text-gray-500">{filtered.length} productos</p>
          </div>
          <div className="flex gap-2">
            <button onClick={exportCSV} className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            </button>
            <button onClick={()=>showForm?cancelForm():setShowForm(true)} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${showForm?'bg-gray-200 text-gray-700':'bg-indigo-600 text-white'}`}>
              {showForm&&!editId?'Cancelar':showForm?'Cancelar':'+ Nuevo'}
            </button>
          </div>
        </div>
      </div>

      {msg && <div className="mx-4 mt-3 p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl text-sm">{msg}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white mx-4 mt-3 rounded-2xl shadow-sm p-4">
          <h2 className="font-semibold mb-3">{editId?'Editar Producto':'Nuevo Producto'}</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Nombre *</label>
              <input type="text" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" required />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Unidad</label>
                <select value={form.unit} onChange={e=>setForm({...form, unit:e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm">
                  <option value="g">g (gramos)</option>
                  <option value="kg">kg</option>
                  <option value="u">u (unidades)</option>
                  <option value="ml">ml</option>
                  <option value="l">l</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Stock Mínimo</label>
                <input type="number" value={form.stock_min} onChange={e=>setForm({...form, stock_min:e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" min="0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Precio Compra</label>
                <input type="number" value={form.cost_price} onChange={e=>setForm({...form, cost_price:e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" min="0" step="0.01" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Precio Venta</label>
                <input type="number" value={form.sale_price} onChange={e=>setForm({...form, sale_price:e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" min="0" step="0.01" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Descripción</label>
              <input type="text" value={form.description} onChange={e=>setForm({...form, description:e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl font-medium">{editId?'Actualizar':'Crear'}</button>
              <button type="button" onClick={cancelForm} className="px-6 bg-gray-200 text-gray-700 py-2.5 rounded-xl font-medium">Cancelar</button>
            </div>
          </div>
        </form>
      )}

      <div className="px-4 pt-3 pb-3">
        <input type="text" placeholder="Buscar producto..." value={filter} onChange={e=>setFilter(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm shadow-sm" />
      </div>

      <div className="px-4 pb-24 space-y-2">
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"/></div>
        ) : filtered.length===0 ? (
          <div className="text-center py-12 text-gray-400"><p className="text-sm">Sin productos</p></div>
        ) : filtered.map(p => {
          const isLow = p.stock_actual <= (p.stock_min||10)
          return (
            <div key={p.id} className={`bg-white rounded-2xl shadow-sm border-l-4 overflow-hidden ${p.active?isLow?'border-orange-400':'border-indigo-400':'border-gray-300 opacity-60'}`}>
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{p.name}</h3>
                    <p className="text-xs text-gray-400">{p.description||'-'}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.active?'bg-green-100 text-green-700':'bg-gray-100 text-gray-500'}`}>
                    {p.active?'Activo':'Inactivo'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <p className="text-xs text-gray-400">Stock</p>
                    <p className={`text-lg font-bold ${isLow?'text-orange-600':'text-gray-800'}`}>{p.stock_actual}<span className="text-xs font-normal ml-0.5">{p.unit}</span></p>
                    <p className="text-xs text-gray-400">Min: {p.stock_min||10}{p.unit}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Compra</p>
                    <p className="text-base font-semibold text-gray-700">{(p.cost_price||0).toFixed(2)} €</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Venta</p>
                    <p className="text-base font-semibold text-green-700">{(p.sale_price||0).toFixed(2)} €</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={()=>startEdit(p)} className="flex-1 bg-indigo-50 text-indigo-700 py-2 rounded-xl text-sm font-medium">✏️ Editar</button>
                  <button onClick={()=>toggleActive(p)} className={`flex-1 py-2 rounded-xl text-sm font-medium ${p.active?'bg-red-50 text-red-700':'bg-green-50 text-green-700'}`}>
                    {p.active?'❌ Desactivar':'✅ Activar'}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
