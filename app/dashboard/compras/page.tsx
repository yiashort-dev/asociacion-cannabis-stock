'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Purchase {
  id: number
  purchase_date: string
  supplier: string
  total_cost: number
  status: string
  notes: string
}

export default function ComprasPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [products, setProducts] = useState<{id:number; name:string}[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({supplier:'', notes:'', purchase_date: new Date().toISOString().split('T')[0]})
  const [items, setItems] = useState([{product_id:'', quantity:'', unit_price:''}])
  const [msg, setMsg] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{data:p}, {data:pr}] = await Promise.all([
      supabase.from('purchases').select('*').order('purchase_date', {ascending: false}).limit(50),
      supabase.from('products').select('id,name').eq('active', true).order('name')
    ])
    setPurchases(p || [])
    setProducts(pr || [])
    setLoading(false)
  }

  function exportCSV() {
    const rows=[['ID','Fecha','Proveedor','Total','Estado']]
    purchases.forEach(p=>rows.push([String(p.id), p.purchase_date, p.supplier, p.total_cost?.toFixed(2)||'0', p.status]))
    const csv=rows.map(r=>r.map(v=>`\"${v}\"`).join(',')).join('\n')
    const a=document.createElement('a')
    a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}))
    a.download=`compras_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.supplier) { setMsg('Ingresa proveedor'); return }
    const validItems = items.filter(i=> i.product_id && i.quantity && i.unit_price)
    if (!validItems.length) { setMsg('Agrega productos'); return }
    setMsg('')
    const total_cost = validItems.reduce((s,i)=>s+parseFloat(i.quantity)*parseFloat(i.unit_price),0)
    const {data:purchase,error} = await supabase.from('purchases').insert({
      supplier: form.supplier,
      notes: form.notes,
      purchase_date: form.purchase_date,
      total_cost,
      status: 'completada'
    }).select().single()
    if (error || !purchase) { setMsg('Error: '+error?.message); return }
    const pitems = validItems.map(i=>({purchase_id:purchase.id, product_id:parseInt(i.product_id), quantity:parseFloat(i.quantity), unit_price:parseFloat(i.unit_price)}))
    await supabase.from('purchase_items').insert(pitems)
    for (const i of validItems) {
      const p = products.find(pr=>pr.id===parseInt(i.product_id))
      if (p) await supabase.from('products').select('stock_actual').eq('id',p.id).single().then(({data})=>{
        if(data) supabase.from('products').update({stock_actual: (data.stock_actual||0)+parseFloat(i.quantity)}).eq('id',p.id)
      })
    }
    setMsg('Compra registrada OK')
    setForm({supplier:'', notes:'', purchase_date: new Date().toISOString().split('T')[0]})
    setItems([{product_id:'', quantity:'', unit_price:''}])
    setShowForm(false)
    load()
  }

  function addItem() { setItems([...items, {product_id:'', quantity:'', unit_price:''}]) }
  function updateItem(i:number,field:string,value:string) {
    const ni=[...items]
    ni[i]={...ni[i],[field]:value}
    setItems(ni)
  }

  const total = items.reduce((s,i)=>s+(parseFloat(i.quantity)||0)*(parseFloat(i.unit_price)||0),0)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Compras</h1>
            <p className="text-xs text-gray-500">{purchases.length} registros</p>
          </div>
          <div className="flex gap-2">
            <button onClick={exportCSV} className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            </button>
            <button onClick={()=>setShowForm(!showForm)} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${showForm?'bg-gray-200 text-gray-700':'bg-green-600 text-white'}`}>
              {showForm?'Cancelar':'+ Nueva'}
            </button>
          </div>
        </div>
      </div>

      {msg && <div className="mx-4 mt-3 p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl text-sm">{msg}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white mx-4 mt-3 rounded-2xl shadow-sm p-4">
          <h2 className="font-semibold mb-3">Nueva Compra</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Proveedor *</label>
              <input type="text" value={form.supplier} onChange={e=>setForm({...form, supplier:e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" required />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Fecha</label>
                <input type="date" value={form.purchase_date} onChange={e=>setForm({...form, purchase_date:e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notas</label>
                <input type="text" value={form.notes} onChange={e=>setForm({...form, notes:e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-medium text-gray-700">Productos</label>
                <button type="button" onClick={addItem} className="text-xs text-green-600">+ Agregar</button>
              </div>
              <div className="space-y-2">
                {items.map((item,i)=>(
                  <div key={i} className="grid grid-cols-3 gap-2">
                    <select value={item.product_id} onChange={e=>updateItem(i,'product_id',e.target.value)} className="border border-gray-200 rounded-xl p-2 text-xs">
                      <option value="">Producto</option>
                      {products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <input type="number" placeholder="Cant." value={item.quantity} onChange={e=>updateItem(i,'quantity',e.target.value)} className="border border-gray-200 rounded-xl p-2 text-xs" step="0.1" />
                    <input type="number" placeholder="Precio" value={item.unit_price} onChange={e=>updateItem(i,'unit_price',e.target.value)} className="border border-gray-200 rounded-xl p-2 text-xs" step="0.01" />
                  </div>
                ))}
              </div>
              <p className="text-sm font-semibold text-right text-green-700 mt-2">Total: {total.toFixed(2)} €</p>
            </div>
            <button type="submit" className="w-full bg-green-600 text-white py-2.5 rounded-xl font-medium">Registrar Compra</button>
          </div>
        </form>
      )}

      <div className="px-4 pt-3 pb-24 space-y-2">
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"/></div>
        ) : purchases.length===0 ? (
          <div className="text-center py-12 text-gray-400"><p className="text-sm">Sin compras</p></div>
        ) : purchases.map(p=>(
          <div key={p.id} className="bg-white rounded-2xl shadow-sm p-4 border-l-4 border-blue-400">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-gray-900">{p.supplier}</h3>
                <p className="text-xs text-gray-400">{p.purchase_date}</p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">{p.status}</span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-gray-500">{p.notes||'-'}</p>
              </div>
              <p className="text-lg font-bold text-blue-700">{p.total_cost?.toFixed(2)} €</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
