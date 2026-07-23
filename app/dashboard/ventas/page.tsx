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

type PersonRow = { id: number; full_name: string }
type ProductRow = { id: number; name: string; unit: string; stock_actual: number; sale_price: number }

export default function VentasPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [products, setProducts] = useState<ProductRow[]>([])
  const [persons, setPersons] = useState<PersonRow[]>([])
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
      supabase.from('sales').select('id,sale_date,notes,total_amount,payment_method,status,persons(full_name),sale_items(quantity,unit_price,products(name,unit))').order('sale_date',{ascending:false}),
      supabase.from('products').select('id,name,unit,stock_actual,sale_price').eq('active',true).order('name'),
      supabase.from('persons').select('id,full_name').eq('active',true).order('full_name')
    ])
    setSales((s||[]) as unknown as Sale[])
    setProducts((pr||[]) as unknown as ProductRow[])
    setPersons((pers||[]) as unknown as PersonRow[])
    setLoading(false)
  }

  async function handleSubmit(e:React.FormEvent) {
    e.preventDefault()
    setMsg('')
    const validItems = items.filter(it=>it.product_id&&it.quantity&&it.unit_price)
    if(validItems.length === 0) {
      setMsg('❌ Debes añadir al menos un producto')
      return
    }
    
    const totalAmount = validItems.reduce((sum,it)=>sum+(Number(it.quantity)*Number(it.unit_price)),0)
    const {data:sale,error} = await supabase.from('sales').insert({person_id:Number(form.person_id)||null,notes:form.notes,sale_date:form.sale_date,payment_method:form.payment_method,total_amount:totalAmount,status:'completada'}).select().single()
    if(error||!sale){setMsg('❌ Error: '+error?.message);return}
    
    // FIX: NO incluir subtotal - se calcula automáticamente en BD
    const saleItems = validItems.map(it=>({
      sale_id:sale.id,
      product_id:Number(it.product_id),
      quantity:Number(it.quantity),
      unit_price:Number(it.unit_price)
      // subtotal se genera automáticamente: quantity * unit_price
    }))
    
    if(saleItems.length>0){
      const {error:e2} = await supabase.from('sale_items').insert(saleItems)
      if(e2){setMsg('❌ Error items: '+e2.message);return}
      
      for(const it of saleItems){
        await supabase.from('stock_movements').insert({product_id:it.product_id,movement_type:'salida',quantity:it.quantity,notes:'Venta #'+sale.id})
        const prod = products.find(p=>p.id===it.product_id)
        if(prod){
          await supabase.from('products').update({stock_actual:Math.max(0,(prod.stock_actual||0)-it.quantity)}).eq('id',it.product_id)
        }
      }
    }
    setMsg('✅ Venta registrada correctamente')
    setShowForm(false)
    setForm({person_id:'',notes:'',sale_date:new Date().toISOString().split('T')[0],payment_method:'efectivo'})
    setItems([{product_id:'',quantity:'',unit_price:''}])
    load()
  }

  function addItem(){setItems([...items,{product_id:'',quantity:'',unit_price:''}])}
  function removeItem(i:number){setItems(items.filter((_,idx)=>idx!==i))}
  function updateItem(i:number,field:string,val:string){
    const updated=[...items]
    updated[i]={...updated[i],[field]:val}
    if(field==='product_id'){
      const p=products.find(p=>p.id===Number(val))
      if(p)updated[i].unit_price=String(p.sale_price||0)
    }
    setItems(updated)
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Ventas</h1>
        <button onClick={()=>setShowForm(!showForm)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          {showForm?'Cancelar':'+ Nueva Venta'}
        </button>
      </div>

      {msg&&<div className={`border rounded-lg p-3 text-sm ${msg.includes('✅')?'bg-green-900/30 border-green-700 text-green-400':'bg-red-900/30 border-red-700 text-red-400'}`}>{msg}</div>}

      {showForm&&(
        <form onSubmit={handleSubmit} className="bg-gray-800 rounded-xl p-5 space-y-4">
          <h2 className="text-lg font-semibold text-white">Nueva Venta</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Socio</label>
              <select value={form.person_id} onChange={e=>setForm({...form,person_id:e.target.value})} className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm">
                <option value="">Sin socio</option>
                {persons.map(p=>(<option key={p.id} value={p.id}>{p.full_name}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Fecha</label>
              <input type="date" value={form.sale_date} onChange={e=>setForm({...form,sale_date:e.target.value})} className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Pago</label>
              <select value={form.payment_method} onChange={e=>setForm({...form,payment_method:e.target.value})} className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm">
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="cuota">Cuota</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Notas</label>
              <input type="text" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm" placeholder="Opcional"/>
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-300">Productos</h3>
            {items.map((it,i)=>(
              <div key={i} className="flex gap-2 flex-wrap">
                <select value={it.product_id} onChange={e=>updateItem(i,'product_id',e.target.value)} className="flex-1 bg-gray-700 text-white rounded-lg px-3 py-2 text-sm min-w-[120px]">
                  <option value="">Producto</option>
                  {products.map(p=>(<option key={p.id} value={p.id}>{p.name} ({p.stock_actual}{p.unit})</option>))}
                </select>
                <input type="number" placeholder="Cant" value={it.quantity} onChange={e=>updateItem(i,'quantity',e.target.value)} className="w-20 bg-gray-700 text-white rounded-lg px-3 py-2 text-sm" step="0.1"/>
                <input type="number" placeholder="Precio" value={it.unit_price} onChange={e=>updateItem(i,'unit_price',e.target.value)} className="w-24 bg-gray-700 text-white rounded-lg px-3 py-2 text-sm" step="0.01"/>
                {items.length>1&&<button type="button" onClick={()=>removeItem(i)} className="text-red-400 px-2 text-sm hover:text-red-300">X</button>}
              </div>
            ))}
            <button type="button" onClick={addItem} className="text-blue-400 text-sm hover:text-blue-300">+ Añadir producto</button>
          </div>
          <div className="flex gap-3">
            <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg text-sm font-medium">Guardar Venta</button>
          </div>
        </form>
      )}

      {loading?(
        <p className="text-gray-400">Cargando...</p>
      ):(
        <div className="space-y-2">
          {sales.length===0&&<p className="text-gray-500 text-sm">No hay ventas registradas</p>}
          {sales.map(sale=>(
            <div key={sale.id} className="bg-gray-800 rounded-xl p-4">
              <div className="flex items-start justify-between cursor-pointer hover:bg-gray-750 rounded-lg p-2 -mx-2" onClick={()=>setExpanded(expanded===sale.id?null:sale.id)}>
                <div>
                  <p className="text-white font-medium">{sale.persons?.full_name||'Sin socio'}</p>
                  <p className="text-gray-400 text-sm">{sale.sale_date} · {sale.payment_method}</p>
                </div>
                <div className="text-right">
                  <p className="text-green-400 font-bold">{Number(sale.total_amount).toFixed(2)} EUR</p>
                  <p className="text-gray-500 text-xs">{sale.status}</p>
                </div>
              </div>
              {expanded===sale.id&&sale.sale_items&&(
                <div className="mt-3 pt-3 border-t border-gray-700 space-y-1">
                  {sale.sale_items.map((it,i)=>(
                    <div key={i} className="flex justify-between text-sm text-gray-300">
                      <span>{it.products?.name} x{it.quantity}{it.products?.unit}</span>
                      <span>{Number(it.unit_price).toFixed(2)} EUR/u = {(it.quantity * it.unit_price).toFixed(2)} EUR</span>
                    </div>
                  ))}
                  {sale.notes&&<p className="text-gray-400 text-xs mt-1">Nota: {sale.notes}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
