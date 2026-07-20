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

  useEffect(()=>{ load() },[])

  async function load() {
    setLoading(true)
    const {data} = await supabase.from('products').select('*').order('name')
    setProducts(data||[])
    setLoading(false)
  }

  function exportCSV() {
    const rows=[['Nombre','Desc','Unidad','Stock','Min','P.Compra','P.Venta','Estado']]
    filtered.forEach(p=>rows.push([p.name, p.description||'', p.unit, String(p.stock_actual), String(p.stock_min||10), (p.cost_price||0).toFixed(2), (p.sale_price||0).toFixed(2), p.active?'Activo':'Inactivo']))
    const csv=rows.map(r=>r.map(v=>`"${v}"`).join(',')).join('\n')
    const a=document.createElement('a')
    a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}))
    a.download=`productos_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  function startEdit(p:Product) {
    setEditId(p.id)
    setForm({name:p.name, description:p.description||'', unit:p.unit, cost_price:String(p.cost_price||''), sale_price:String(p.sale_price||''), stock_min:String(p.stock_min||10)})
    setShowForm(true)
    window.scrollTo({top:0,behavior:'smooth'})
  }

  function cancelForm() {
    setShowForm(false)
    setEditId(null)
    setForm({name:'', description:'', unit:'g', cost_price:'', sale_price:'', stock_min:'10'})
    setMsg('')
  }

  async function handleSubmit(e:React.FormEvent) {
    e.preventDefault()
    if(!form.name.trim()){setMsg('Nombre requerido');return}
    setMsg('')
    const payload={name:form.name, description:form.description, unit:form.unit, cost_price:parseFloat(form.cost_price)||0, sale_price:parseFloat(form.sale_price)||0, stock_min:parseInt(form.stock_min)||10}
    if(editId){
      const {error}=await supabase.from('products').update(payload).eq('id',editId)
      if(error){setMsg('Error: '+error.message);return}
      setMsg('Producto actualizado')
    } else {
      const {error}=await supabase.from('products').insert({...payload, stock_actual:0, active:true})
      if(error){setMsg('Error: '+error.message);return}
      setMsg('Producto creado')
    }
    cancelForm()
    load()
  }

  async function toggleActive(p:Product) {
    await supabase.from('products').update({active:!p.active}).eq('id',p.id)
    load()
  }

  const filtered=products.filter(p=>!filter||p.name.toLowerCase().includes(filter.toLowerCase()))

  return(
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div><h1 className="text-2xl font-bold text-gray-900">Productos</h1><p className="text-xs text-gray-400">{filtered.length} productos</p></div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="bg-gray-600 text-white px-3 py-2 rounded-xl text-sm">CSV</button>
          <button onClick={()=>showForm?cancelForm():setShowForm(true)} className={`px-3 py-2 rounded-xl text-sm font-medium ${showForm?'bg-gray-200 text-gray-700':'bg-indigo-600 text-white'}`}>{showForm?'Cancelar':'+ Nuevo'}</button>
        </div>
      </div>

      {msg&&<div className="bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl px-4 py-3 mb-4 text-sm">{msg}</div>}

      {showForm&&(
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4 space-y-3">
          <h2 className="font-semibold text-gray-800">{editId?'Editar Producto':'Nuevo Producto'}</h2>
          <div><label className="text-xs text-gray-500 mb-1 block">Nombre *</label><input type="text" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-gray-500 mb-1 block">Unidad</label>
              <select value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
                <option value="g">g (gramos)</option><option value="kg">kg</option><option value="u">u (unidades)</option><option value="ml">ml</option>
              </select>
            </div>
            <div><label className="text-xs text-gray-500 mb-1 block">Stock Minimo</label><input type="number" value={form.stock_min} onChange={e=>setForm({...form,stock_min:e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" min="0" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-gray-500 mb-1 block">Precio Compra</label><input type="number" value={form.cost_price} onChange={e=>setForm({...form,cost_price:e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" min="0" step="0.01" /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Precio Venta</label><input type="number" value={form.sale_price} onChange={e=>setForm({...form,sale_price:e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" min="0" step="0.01" /></div>
          </div>
          <div><label className="text-xs text-gray-500 mb-1 block">Descripcion</label><input type="text" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" /></div>
          <div className="flex gap-2">
            <button type="submit" className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-medium">{editId?'Actualizar':'Crear'}</button>
            <button type="button" onClick={cancelForm} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-medium">Cancelar</button>
          </div>
        </form>
      )}

      <input type="text" placeholder="Buscar producto..." value={filter} onChange={e=>setFilter(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm shadow-sm mb-4" />

      {loading?(
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"/></div>
      ):filtered.length===0?(
        <div className="text-center py-12 text-gray-400 text-sm">Sin productos</div>
      ):filtered.map(p=>{
        const isLow=p.stock_actual<=(p.stock_min||10)
        return(
          <div key={p.id} className={`bg-white rounded-2xl shadow-sm border mb-3 overflow-hidden ${isLow?'border-red-200':'border-gray-100'}`}>
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div><p className="font-semibold text-gray-900">{p.name}</p><p className="text-xs text-gray-400">{p.description||'Sin descripcion'}</p></div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.active?'bg-green-100 text-green-700':'bg-gray-100 text-gray-500'}`}>{p.active?'Activo':'Inactivo'}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-gray-50 rounded-xl p-2">
                  <p className="text-xs text-gray-500">Stock</p>
                  <p className={`text-lg font-bold ${isLow?'text-red-600':'text-gray-900'}`}>{p.stock_actual}<span className="text-xs font-normal text-gray-400 ml-0.5">{p.unit}</span></p>
                  <p className="text-xs text-gray-400">Min: {p.stock_min||10}{p.unit}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-2">
                  <p className="text-xs text-gray-500">Compra</p>
                  <p className="text-lg font-bold text-gray-700">{(p.cost_price||0).toFixed(2)}<span className="text-xs font-normal text-gray-400"> EUR</span></p>
                </div>
                <div className="bg-gray-50 rounded-xl p-2">
                  <p className="text-xs text-gray-500">Venta</p>
                  <p className="text-lg font-bold text-green-600">{(p.sale_price||0).toFixed(2)}<span className="text-xs font-normal text-gray-400"> EUR</span></p>
                </div>
              </div>
            </div>
            <div className="flex border-t border-gray-100">
              <button onClick={()=>startEdit(p)} className="flex-1 py-3 text-sm font-medium text-indigo-600 bg-indigo-50">Editar</button>
              <button onClick={()=>toggleActive(p)} className={`flex-1 py-3 text-sm font-medium ${p.active?'text-red-600 bg-red-50':'text-green-600 bg-green-50'}`}>{p.active?'Desactivar':'Activar'}</button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
