'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface SaleItem {
  quantity: number
  unit_price: number
  subtotal: number
  products: { name: string; unit: string }
}

interface Sale {
  id: number
  sale_date: string
  notes: string
  total_amount: number
  payment_method: string
  status: string
  persons?: { full_name: string }
  sale_items?: SaleItem[]
}

export default function VentasPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [products, setProducts] = useState<{id:number; name:string; unit:string; stock_actual:number; sale_price:number}[]>([])
  const [persons, setPersons] = useState<{id:number; full_name:string}[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({person_id:'', notes:'', sale_date: new Date().toISOString().split('T')[0], payment_method:'efectivo'})
  const [items, setItems] = useState([{product_id:'', quantity:'', unit_price:''}])
  const [msg, setMsg] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{data:s}, {data:pr}, {data:pers}] = await Promise.all([
      supabase.from('sales').select('id, sale_date, notes, total_amount, payment_method, status, persons(full_name), sale_items(quantity, unit_price, subtotal, products(name, unit))').order('sale_date', {ascending: false}).limit(100),
      supabase.from('products').select('id, name, unit, stock_actual, sale_price').eq('active', true).order('name'),
      supabase.from('persons').select('id, full_name').eq('active', true).order('full_name')
    ])
    setSales(s || [])
    setProducts(pr || [])
    setPersons(pers || [])
    setLoading(false)
  }

  function exportCSV() {
    const rows=[['ID','Fecha','Socio','Total','Pago','Estado','Productos']]
    sales.forEach(s=>rows.push([String(s.id), s.sale_date, s.persons?.full_name||'', (s.total_amount||0).toFixed(2), s.payment_method||'', s.status||'', s.sale_items?.map(i=>`${i.quantity}x ${i.products?.name}`).join(', ')||'']))
    const csv=rows.map(r=>r.map(v=>`\"${v}\"`).join(',')).join('\n')
    const a=document.createElement('a')
    a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}))
    a.download=`ventas_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  function addItem() { setItems([...items, {product_id:'', quantity:'', unit_price:''}]) }
  function removeItem(i:number) { setItems(items.filter((_,idx)=>idx!==i)) }
  function updateItem(i:number, field:string, value:string) {
    const ni=[...items]
    if (field==='product_id') {
      const prod = products.find(p=>p.id===parseInt(value))
      ni[i] = {...ni[i], product_id:value, unit_price: prod ? String(prod.sale_price) : ''}
    } else {
      ni[i] = {...ni[i], [field]:value}
    }
    setItems(ni)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.person_id) { setMsg('Selecciona un socio'); return }
    const validItems = items.filter(i=> i.product_id && i.quantity && i.unit_price)
    if (!validItems.length) { setMsg('Agrega al menos un producto'); return }
    setMsg('')
    const total_amount = validItems.reduce((s,i)=>s+parseFloat(i.quantity)*parseFloat(i.unit_price),0)
    
    const {data:sale,error} = await supabase.from('sales').insert({
      person_id: parseInt(form.person_id),
      notes: form.notes,
      sale_date: form.sale_date,
      payment_method: form.payment_method,
      total_amount,
      status: 'completada'
    }).select().single()
    
    if (error || !sale) { setMsg('Error: '+error?.message); return }
    
    const saleItems = validItems.map(i=>({sale_id:sale.id, product_id:parseInt(i.product_id), quantity:parseFloat(i.quantity), unit_price:parseFloat(i.unit_price),))
    await supabase.from('sale_items').insert(saleItems)
    
    for (const i of validItems) {
      const prod = products.find(p=>p.id===parseInt(i.product_id))
      if (prod) await supabase.from('products').update({stock_actual: prod.stock_actual - parseFloat(i.quantity)}).eq('id', prod.id)
    }
    
    setMsg('Venta registrada correctamente')
    setForm({person_id:'', notes:'', sale_date: new Date().toISOString().split('T')[0], payment_method:'efectivo'})
    setItems([{product_id:'', quantity:'', unit_price:''}])
    setShowForm(false)
    load()
  }

  const total = items.reduce((s,i)=>s+(parseFloat(i.quantity)||0)*(parseFloat(i.unit_price)||0),0)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Ventas</h1>
            <p className="text-xs text-gray-500">{sales.length} ventas</p>
          </div>
          <div className="flex gap-2">
            <button onClick={exportCSV} className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            </button>
            <button onClick={()=>setShowForm(!showForm)} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${showForm?'bg-gray-200 text-gray-700':'bg-purple-600 text-white'}`}>
              {showForm?'Cancelar':'+ Nueva'}
            </button>
          </div>
        </div>
      </div>

      {msg && <div className="mx-4 mt-3 p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl text-sm">{msg}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white mx-4 mt-3 rounded-2xl shadow-sm p-4">
          <h2 className="font-semibold mb-3">Nueva Venta</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Socio *</label>
              <select value={form.person_id} onChange={e=>setForm({...form, person_id:e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" required>
                <option value="">Seleccionar...</option>
                {persons.map(p=><option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Fecha</label>
                <input type="date" value={form.sale_date} onChange={e=>setForm({...form, sale_date:e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Método de pago</label>
                <select value={form.payment_method} onChange={e=>setForm({...form, payment_method:e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm">
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="cuota">Cuota</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Notas</label>
              <input type="text" value={form.notes} onChange={e=>setForm({...form, notes:e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" placeholder="Opcional" />
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-medium text-gray-700">Productos</label>
                <button type="button" onClick={addItem} className="text-xs text-purple-600">+ Agregar</button>
              </div>
              <div className="space-y-2">
                {items.map((item,i)=>(
                  <div key={i} className="grid grid-cols-3 gap-2">
                    <select value={item.product_id} onChange={e=>updateItem(i,'product_id',e.target.value)} className="border border-gray-200 rounded-xl p-2 text-xs">
                      <option value="">Producto</option>
                      {products.map(p=><option key={p.id} value={p.id}>{p.name} ({p.stock_actual}{p.unit})</option>)}
                    </select>
                    <input type="number" placeholder="Cant." value={item.quantity} onChange={e=>updateItem(i,'quantity',e.target.value)} className="border border-gray-200 rounded-xl p-2 text-xs" step="0.1" />
                    <div className="flex gap-1">
                      <input type="number" placeholder="Precio" value={item.unit_price} onChange={e=>updateItem(i,'unit_price',e.target.value)} className="border border-gray-200 rounded-xl p-2 text-xs w-full" step="0.01" />
                      {items.length>1 && <button type="button" onClick={()=>removeItem(i)} className="text-red-500 px-2">x</button>}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-sm font-semibold text-right text-purple-700 mt-2">Total: {total.toFixed(2)} €</p>
            </div>
            <button type="submit" className="w-full bg-purple-600 text-white py-2.5 rounded-xl font-medium">Registrar Venta</button>
          </div>
        </form>
      )}

      <div className="px-4 pt-3 pb-24 space-y-2">
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"/></div>
        ) : sales.length===0 ? (
          <div className="text-center py-12 text-gray-400"><p className="text-sm">Sin ventas</p></div>
        ) : sales.map(s=>(
          <div key={s.id} className="bg-white rounded-2xl shadow-sm p-4 border-l-4 border-purple-400">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-gray-900">{s.persons?.full_name||'Sin socio'}</h3>
                <p className="text-xs text-gray-400">{s.sale_date} • {s.payment_method}</p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">{s.status}</span>
            </div>
            <div className="mb-2">
              <p className="text-xs text-gray-500 font-medium mb-1">Productos:</p>
              {s.sale_items && s.sale_items.length > 0 ? (
                <div className="space-y-1">
                  {s.sale_items.map((item,i)=>(
                    <div key={i} className="flex justify-between text-xs">
                      <span className="text-gray-600">{item.quantity} {item.products?.unit} × {item.products?.name}</span>
                      <span className="text-gray-500">{item.subtotal?.toFixed(2)} €</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">Sin productos</p>
              )}
            </div>
            {s.notes && <p className="text-xs text-gray-500 mb-2">📝 {s.notes}</p>}
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-xs text-gray-500">Total</span>
              <span className="text-lg font-bold text-purple-700">{s.total_amount?.toFixed(2)} €</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
