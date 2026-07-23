'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type PurchaseItem = {
  id: number
  product_id: number
  quantity: number
  unit_price: number
  subtotal: number
  products: { name: string; unit: string } | null
}

type Purchase = {
  id: number
  purchase_date: string
  supplier: string
  total_cost: number
  status: string
  notes: string
  purchase_items: PurchaseItem[]
}

export default function ComprasPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [products, setProducts] = useState<{id:number;name:string}[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({supplier:'', notes:'', purchase_date:new Date().toISOString().split('T')[0]})
  const [items, setItems] = useState([{product_id:'', quantity:'', unit_price:''}])
  const [msg, setMsg] = useState('')
  const [expanded, setExpanded] = useState<number|null>(null)

  useEffect(()=>{ load() },[])

  async function load() {
    setLoading(true)
    const [{data:p, error:e1},{data:pr}] = await Promise.all([
      supabase.from('purchases').select('id,purchase_date,supplier,total_cost,status,notes,purchase_items(id,product_id,quantity,unit_price,subtotal,products(name,unit))').order('purchase_date',{ascending:false}),
      supabase.from('products').select('id,name').eq('active',true).order('name')
    ])
    setPurchases((p as unknown as Purchase[]) || [])
    setProducts(pr || [])
    setLoading(false)
  }

  function exportCSV() {
    const rows=[['ID','Fecha','Proveedor','Total','Estado']]
    purchases.forEach(p=>rows.push([String(p.id),p.purchase_date,p.supplier,(p.total_cost||0).toFixed(2),p.status]))
    const csv=rows.map(r=>r.map(v=>`"${v}"`).join(',')).join('\n')
    const a=document.createElement('a')
    a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}))
    a.download=`compras_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  function addItem(){setItems([...items,{product_id:'',quantity:'',unit_price:''}])}
  function removeItem(i:number){setItems(items.filter((_,idx)=>idx!==i))}
  function updateItem(i:number,field:string,value:string){const ni=[...items];ni[i]={...ni[i],[field]:value};setItems(ni)}

  async function handleSubmit(e:React.FormEvent){
    e.preventDefault()
    if(!form.supplier.trim()){setMsg('El proveedor es obligatorio');return}
    const validItems=items.filter(i=>i.product_id&&i.quantity&&i.unit_price)
    setMsg('')
    const total_cost=validItems.reduce((s,i)=>s+parseFloat(i.quantity)*parseFloat(i.unit_price),0)
    const {data:purchase,error}=await supabase.from('purchases').insert({supplier:form.supplier,notes:form.notes,purchase_date:form.purchase_date,total_cost,status:'completada'}).select().single()
    if(error||!purchase){setMsg('Error: '+error?.message);return}
    if(validItems.length>0){
      // FIX: NO incluir subtotal - se calcula automáticamente en BD
      const purchaseItems=validItems.map(i=>({
        purchase_id:purchase.id,
        product_id:parseInt(i.product_id),
        quantity:parseFloat(i.quantity),
        unit_price:parseFloat(i.unit_price)
        // subtotal se genera automáticamente: quantity * unit_price
      }))
      const {error:itemsError} = await supabase.from('purchase_items').insert(purchaseItems)
      if(itemsError){
        setMsg('Error al registrar items: '+itemsError.message)
        return
      }
      for(const i of validItems){
        const {data:prod}=await supabase.from('products').select('stock_actual').eq('id',parseInt(i.product_id)).single()
        if(prod)await supabase.from('products').update({stock_actual:(prod.stock_actual||0)+parseFloat(i.quantity)}).eq('id',parseInt(i.product_id))
      }
    }
    setMsg('✅ Compra registrada correctamente')
    setForm({supplier:'',notes:'',purchase_date:new Date().toISOString().split('T')[0]})
    setItems([{product_id:'',quantity:'',unit_price:''}])
    setShowForm(false)
    load()
  }

  const total=items.reduce((s,i)=>s+(parseFloat(i.quantity)||0)*(parseFloat(i.unit_price)||0),0)

  return(
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div><h1 className="text-2xl font-bold text-gray-900">Compras</h1><p className="text-xs text-gray-400">{purchases.length} registros</p></div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="bg-gray-600 text-white px-3 py-2 rounded-xl text-sm">CSV</button>
          <button onClick={()=>setShowForm(!showForm)} className={`px-3 py-2 rounded-xl text-sm font-medium ${showForm?'bg-gray-200 text-gray-700':'bg-blue-600 text-white'}`}>{showForm?'Cancelar':'+ Nueva Compra'}</button>
        </div>
      </div>
      {msg&&<div className={`border rounded-xl px-4 py-3 mb-4 text-sm ${msg.includes('✅')?'bg-green-50 border-green-200 text-green-700':'bg-blue-50 border-blue-200 text-blue-700'}`}>{msg}</div>}
      {showForm&&(
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4 space-y-3">
          <h2 className="font-semibold text-gray-800">Nueva Compra</h2>
          <div><label className="text-xs text-gray-500 mb-1 block">Proveedor *</label><input type="text" value={form.supplier} onChange={e=>setForm({...form,supplier:e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" placeholder="Nombre del proveedor" required/></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-gray-500 mb-1 block">Fecha</label><input type="date" value={form.purchase_date} onChange={e=>setForm({...form,purchase_date:e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"/></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Notas</label><input type="text" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" placeholder="Opcional"/></div>
          </div>
          <div>
            <div className="flex justify-between items-center mb-2"><label className="text-xs text-gray-500">Productos</label><button type="button" onClick={addItem} className="text-xs text-blue-600 hover:text-blue-700">+ Añadir</button></div>
            {items.map((item,i)=>(
              <div key={i} className="flex gap-2 mb-2 items-center">
                <select value={item.product_id} onChange={e=>updateItem(i,'product_id',e.target.value)} className="flex-1 border border-gray-200 rounded-xl p-2 text-xs">
                  <option value="">Producto</option>
                  {products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <input type="number" placeholder="Cant." value={item.quantity} onChange={e=>updateItem(i,'quantity',e.target.value)} className="w-16 border border-gray-200 rounded-xl p-2 text-xs" step="0.1"/>
                <input type="number" placeholder="EUR" value={item.unit_price} onChange={e=>updateItem(i,'unit_price',e.target.value)} className="w-16 border border-gray-200 rounded-xl p-2 text-xs" step="0.01"/>
                {items.length>1&&<button type="button" onClick={()=>removeItem(i)} className="text-red-400 text-lg">&times;</button>}
              </div>
            ))}
            <div className="text-right text-sm font-semibold text-gray-700">Total: {total.toFixed(2)} EUR</div>
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700">Registrar Compra</button>
        </form>
      )}
      {loading?(
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"/></div>
      ):purchases.length===0?(
        <div className="text-center py-12 text-gray-400 text-sm">Sin compras registradas</div>
      ):purchases.map(p=>(
        <div key={p.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-3 overflow-hidden">
          <button onClick={()=>setExpanded(expanded===p.id?null:p.id)} className="w-full p-4 text-left hover:bg-gray-50">
            <div className="flex justify-between items-start">
              <div><p className="font-semibold text-gray-900">{p.supplier||'Sin proveedor'}</p><p className="text-xs text-gray-400">{p.purchase_date}{p.notes?` - ${p.notes}`:''}</p></div>
              <div className="text-right"><p className="font-bold text-blue-600">{(p.total_cost||0).toFixed(2)} EUR</p><span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{p.status}</span></div>
            </div>
          </button>
          {expanded===p.id&&(
            <div className="px-4 pb-4 border-t border-gray-100">
              {p.purchase_items&&p.purchase_items.length>0?(
                <div className="mt-3 space-y-2">
                  {p.purchase_items.map((item,i)=>(
                    <div key={i} className="flex justify-between text-sm text-gray-700">
                      <span>{item.quantity} {item.products?.unit} x {item.products?.name}</span>
                      <span className="font-medium">{(item.quantity*item.unit_price).toFixed(2)} EUR</span>
                    </div>
                  ))}
                </div>
              ):(<p className="text-xs text-gray-400 mt-3">Sin detalle de productos</p>)}
              <div className="flex justify-between text-sm font-bold text-gray-900 mt-3 pt-2 border-t border-gray-100"><span>Total</span><span>{(p.total_cost||0).toFixed(2)} EUR</span></div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
