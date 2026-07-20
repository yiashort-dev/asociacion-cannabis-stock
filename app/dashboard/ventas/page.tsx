'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface SaleItem {
  quantity: number
  unit_price: number
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
  const [products, setProducts] = useState<{id:number;name:string;unit:string;stock_actual:number;sale_price:number}[]>([])
  const [persons, setPersons] = useState<{id:number;full_name:string}[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({person_id:'', notes:'', sale_date:new Date().toISOString().split('T')[0], payment_method:'efectivo'})
  const [items, setItems] = useState([{product_id:'', quantity:'', unit_price:''}])
  const [msg, setMsg] = useState('')
  const [expanded, setExpanded] = useState<number|null>(null)

  useEffect(()=>{ load() },[])

  async function load() {
    setLoading(true)
    const [{data:s},{data:pr},{data:pers}] = await Promise.all([
      supabase.from('sales').select('id,sale_date,notes,total_amount,payment_method,status,persons(full_name),sale_items(quantity,unit_price,products(name,unit))').order('sale_date',{ascending:false}).limit(100),
      supabase.from('products').select('id,name,unit,stock_actual,sale_price').eq('active',true).order('name'),
      supabase.from('persons').select('id,full_name').eq('active',true).order('full_name')
    ])
    setSales(s||[])
    setProducts(pr||[])
    setPersons(pers||[])
    setLoading(false)
  }

  function exportCSV() {
    const rows=[['ID','Fecha','Socio','Total','Pago','Estado','Productos']]
    sales.forEach(s=>rows.push([String(s.id),s.sale_date,s.persons?.full_name||'',(s.total_amount||0).toFixed(2),s.payment_method||'',s.status||'',s.sale_items?.map(i=>`${i.quantity}x ${i.products?.name}`).join(', ')||'']))
    const csv=rows.map(r=>r.map(v=>`"${v}"`).join(',')).join('\n')
    const a=document.createElement('a')
    a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}))
    a.download=`ventas_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  function addItem(){setItems([...items,{product_id:'',quantity:'',unit_price:''}])}
  function removeItem(i:number){setItems(items.filter((_,idx)=>idx!==i))}
  function updateItem(i:number,field:string,value:string){
    const ni=[...items]
    if(field==='product_id'){const prod=products.find(p=>p.id===parseInt(value));ni[i]={...ni[i],product_id:value,unit_price:prod?String(prod.sale_price):''}}else{ni[i]={...ni[i],[field]:value}}
    setItems(ni)
  }

  async function handleSubmit(e:React.FormEvent){
    e.preventDefault()
    if(!form.person_id){setMsg('Selecciona un socio');return}
    const validItems=items.filter(i=>i.product_id&&i.quantity&&i.unit_price)
    if(!validItems.length){setMsg('Agrega al menos un producto');return}
    setMsg('')
    const total_amount=validItems.reduce((s,i)=>s+parseFloat(i.quantity)*parseFloat(i.unit_price),0)
    const {data:sale,error}=await supabase.from('sales').insert({person_id:parseInt(form.person_id),notes:form.notes,sale_date:form.sale_date,payment_method:form.payment_method,total_amount,status:'completada'}).select().single()
    if(error||!sale){setMsg('Error: '+error?.message);return}
    const saleItems=validItems.map(i=>({sale_id:sale.id,product_id:parseInt(i.product_id),quantity:parseFloat(i.quantity),unit_price:parseFloat(i.unit_price),subtotal:parseFloat(i.quantity)*parseFloat(i.unit_price)}))
    await supabase.from('sale_items').insert(saleItems)
    for(const i of validItems){const prod=products.find(p=>p.id===parseInt(i.product_id));if(prod)await supabase.from('products').update({stock_actual:prod.stock_actual-parseFloat(i.quantity)}).eq('id',prod.id)}
    setMsg('Venta registrada correctamente')
    setForm({person_id:'',notes:'',sale_date:new Date().toISOString().split('T')[0],payment_method:'efectivo'})
    setItems([{product_id:'',quantity:'',unit_price:''}])
    setShowForm(false)
    load()
  }

  const total=items.reduce((s,i)=>s+(parseFloat(i.quantity)||0)*(parseFloat(i.unit_price)||0),0)

  return(
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div><h1 className="text-2xl font-bold text-gray-900">Ventas</h1><p className="text-xs text-gray-400">{sales.length} ventas</p></div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="bg-gray-600 text-white px-3 py-2 rounded-xl text-sm">CSV</button>
          <button onClick={()=>setShowForm(!showForm)} className={`px-3 py-2 rounded-xl text-sm font-medium ${showForm?'bg-gray-200 text-gray-700':'bg-green-600 text-white'}`}>{showForm?'Cancelar':'+ Nueva'}</button>
        </div>
      </div>
      {msg&&<div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 mb-4 text-sm">{msg}</div>}
      {showForm&&(
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4 space-y-3">
          <h2 className="font-semibold text-gray-800">Nueva Venta</h2>
          <div><label className="text-xs text-gray-500 mb-1 block">Socio *</label>
            <select value={form.person_id} onChange={e=>setForm({...form,person_id:e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" required>
              <option value="">Seleccionar...</option>
              {persons.map(p=><option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-gray-500 mb-1 block">Fecha</label><input type="date" value={form.sale_date} onChange={e=>setForm({...form,sale_date:e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Pago</label>
              <select value={form.payment_method} onChange={e=>setForm({...form,payment_method:e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
                <option value="efectivo">Efectivo</option><option value="transferencia">Transferencia</option><option value="cuota">Cuota</option>
              </select>
            </div>
          </div>
          <div><label className="text-xs text-gray-500 mb-1 block">Notas</label><input type="text" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" placeholder="Opcional" /></div>
          <div>
            <div className="flex justify-between items-center mb-2"><label className="text-xs text-gray-500">Productos</label><button type="button" onClick={addItem} className="text-xs text-green-600 font-medium">+ Agregar</button></div>
            {items.map((item,i)=>(
              <div key={i} className="flex gap-2 mb-2 items-center">
                <select value={item.product_id} onChange={e=>updateItem(i,'product_id',e.target.value)} className="flex-1 border border-gray-200 rounded-xl p-2 text-xs">
                  <option value="">Producto</option>
                  {products.map(p=><option key={p.id} value={p.id}>{p.name} ({p.stock_actual}{p.unit})</option>)}
                </select>
                <input type="number" placeholder="Cant." value={item.quantity} onChange={e=>updateItem(i,'quantity',e.target.value)} className="w-16 border border-gray-200 rounded-xl p-2 text-xs" step="0.1" />
                <input type="number" placeholder="EUR" value={item.unit_price} onChange={e=>updateItem(i,'unit_price',e.target.value)} className="w-16 border border-gray-200 rounded-xl p-2 text-xs" step="0.01" />
                {items.length>1&&<button type="button" onClick={()=>removeItem(i)} className="text-red-400 text-lg">&times;</button>}
              </div>
            ))}
            <div className="text-right text-sm font-semibold text-gray-700">Total: {total.toFixed(2)} EUR</div>
          </div>
          <button type="submit" className="w-full bg-green-600 text-white py-3 rounded-xl font-medium">Registrar Venta</button>
        </form>
      )}
      {loading?(
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"/></div>
      ):sales.length===0?(
        <div className="text-center py-12 text-gray-400 text-sm">Sin ventas registradas</div>
      ):sales.map(s=>(
        <div key={s.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-3 overflow-hidden">
          <button onClick={()=>setExpanded(expanded===s.id?null:s.id)} className="w-full p-4 text-left">
            <div className="flex justify-between items-start">
              <div><p className="font-semibold text-gray-900">{s.persons?.full_name||'Sin socio'}</p><p className="text-xs text-gray-400">{s.sale_date} - {s.payment_method}</p></div>
              <div className="text-right"><p className="font-bold text-green-600">{(s.total_amount||0).toFixed(2)} EUR</p><span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{s.status}</span></div>
            </div>
          </button>
          {expanded===s.id&&(
            <div className="px-4 pb-4 border-t border-gray-100">
              {s.sale_items&&s.sale_items.length>0?(
                <div className="mt-3 space-y-2">
                  {s.sale_items.map((item,i)=>(
                    <div key={i} className="flex justify-between text-sm text-gray-700">
                      <span>{item.quantity} {item.products?.unit} x {item.products?.name}</span>
                      <span className="font-medium">{(item.quantity*item.unit_price).toFixed(2)} EUR</span>
                    </div>
                  ))}
                </div>
              ):(<p className="text-xs text-gray-400 mt-3">Sin detalle de productos</p>)}
              {s.notes&&<p className="text-xs text-gray-500 mt-2">Notas: {s.notes}</p>}
              <div className="flex justify-between text-sm font-bold text-gray-900 mt-3 pt-2 border-t border-gray-100"><span>Total</span><span>{(s.total_amount||0).toFixed(2)} EUR</span></div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
