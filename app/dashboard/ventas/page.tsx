'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Sale {
  id: number
  sale_date: string
  notes: string
  total_amount: number
  payment_method: string
  status: string
  persons?: { full_name: string }
  sale_items?: { quantity: number; unit_price: number; products: { name: string } }[]
}

function exportCSV(sales: Sale[]) {
  const rows = [['ID', 'Fecha', 'Socio', 'Total EUR', 'Metodo Pago', 'Estado', 'Notas']]
  sales.forEach(s => {
    rows.push([
      String(s.id),
      s.sale_date,
      s.persons?.full_name || '',
      s.total_amount?.toFixed(2) || '0',
      s.payment_method || '',
      s.status || '',
      s.notes || ''
    ])
  })
  const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ventas_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function VentasPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [products, setProducts] = useState<{id: number; name: string; unit: string; stock_actual: number; sale_price: number}[]>([])
  const [persons, setPersons] = useState<{id: number; full_name: string}[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ person_id: '', notes: '', sale_date: new Date().toISOString().split('T')[0], payment_method: 'efectivo' })
  const [items, setItems] = useState([{ product_id: '', quantity: '', unit_price: '' }])
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [filter, setFilter] = useState('')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [{ data: s }, { data: pr }, { data: pers }] = await Promise.all([
      supabase.from('sales').select('*, persons(full_name), sale_items(quantity, unit_price, products(name))').order('sale_date', { ascending: false }).limit(100),
      supabase.from('products').select('id, name, unit, stock_actual, sale_price').eq('active', true).order('name'),
      supabase.from('persons').select('id, full_name').eq('active', true).order('full_name')
    ])
    setSales(s || [])
    setProducts(pr || [])
    setPersons(pers || [])
    setLoading(false)
  }

  function addItem() { setItems([...items, { product_id: '', quantity: '', unit_price: '' }]) }
  function removeItem(i: number) { setItems(items.filter((_, idx) => idx !== i)) }
  function updateItem(i: number, field: string, value: string) {
    const newItems = [...items]
    if (field === 'product_id') {
      const prod = products.find(p => p.id === parseInt(value))
      newItems[i] = { ...newItems[i], product_id: value, unit_price: prod ? String(prod.sale_price) : '' }
    } else {
      newItems[i] = { ...newItems[i], [field]: value }
    }
    setItems(newItems)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.person_id) { setMsg('Selecciona un socio'); return }
    const validItems = items.filter(i => i.product_id && i.quantity && i.unit_price)
    if (!validItems.length) { setMsg('Agrega al menos un producto'); return }
    setSaving(true)
    setMsg('')
    const total_amount = validItems.reduce((s, i) => s + parseFloat(i.quantity) * parseFloat(i.unit_price), 0)
    const { data: sale, error } = await supabase.from('sales').insert({ 
      person_id: parseInt(form.person_id), 
      notes: form.notes, 
      sale_date: form.sale_date, 
      payment_method: form.payment_method,
      total_amount,
      status: 'completada'
    }).select().single()
    if (error || !sale) { setMsg('Error: ' + error?.message); setSaving(false); return }
    const saleItems = validItems.map(i => ({ 
      sale_id: sale.id, 
      product_id: parseInt(i.product_id), 
      quantity: parseFloat(i.quantity), 
      unit_price: parseFloat(i.unit_price),
      subtotal: parseFloat(i.quantity) * parseFloat(i.unit_price)
    }))
    await supabase.from('sale_items').insert(saleItems)
    for (const i of validItems) {
      const prod = products.find(p => p.id === parseInt(i.product_id))
      if (prod) await supabase.from('products').update({ stock_actual: prod.stock_actual - parseFloat(i.quantity) }).eq('id', prod.id)
    }
    setMsg('Venta registrada correctamente')
    setForm({ person_id: '', notes: '', sale_date: new Date().toISOString().split('T')[0], payment_method: 'efectivo' })
    setItems([{ product_id: '', quantity: '', unit_price: '' }])
    setShowForm(false)
    setSaving(false)
    loadAll()
  }

  const filtered = sales.filter(s =>
    !filter ||
    s.persons?.full_name?.toLowerCase().includes(filter.toLowerCase()) ||
    s.sale_date?.includes(filter)
  )

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Ventas</h1>
        <div className="flex gap-2">
          <button onClick={() => exportCSV(filtered)} className="bg-gray-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-700">Exportar CSV</button>
          <button onClick={() => setShowForm(!showForm)} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">
            {showForm ? 'Cancelar' : '+ Nueva Venta'}
          </button>
        </div>
      </div>

      {msg && <div className="mb-4 p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-sm">{msg}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 shadow mb-6">
          <h2 className="text-lg font-semibold mb-4">Nueva Venta</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Socio *</label>
              <select value={form.person_id} onChange={e => setForm({...form, person_id: e.target.value})} className="w-full border rounded-lg p-2 text-sm" required>
                <option value="">Seleccionar...</option>
                {persons.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
              <input type="date" value={form.sale_date} onChange={e => setForm({...form, sale_date: e.target.value})} className="w-full border rounded-lg p-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Metodo de pago</label>
              <select value={form.payment_method} onChange={e => setForm({...form, payment_method: e.target.value})} className="w-full border rounded-lg p-2 text-sm">
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="cuota">Cuota</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
              <input type="text" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="w-full border rounded-lg p-2 text-sm" placeholder="Opcional" />
            </div>
          </div>
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-gray-700">Productos</label>
              <button type="button" onClick={addItem} className="text-sm text-green-600 hover:underline">+ Agregar</button>
            </div>
            {items.map((item, i) => (
              <div key={i} className="grid grid-cols-4 gap-2 mb-2">
                <select value={item.product_id} onChange={e => updateItem(i, 'product_id', e.target.value)} className="border rounded-lg p-2 text-sm col-span-2">
                  <option value="">Producto...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} (stock: {p.stock_actual}{p.unit})</option>)}
                </select>
                <input type="number" placeholder="Cantidad" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} className="border rounded-lg p-2 text-sm" min="0" step="0.1" />
                <div className="flex gap-1">
                  <input type="number" placeholder="Precio" value={item.unit_price} onChange={e => updateItem(i, 'unit_price', e.target.value)} className="border rounded-lg p-2 text-sm w-full" min="0" step="0.01" />
                  {items.length > 1 && <button type="button" onClick={() => removeItem(i)} className="text-red-500 px-2">x</button>}
                </div>
              </div>
            ))}
            <p className="text-sm font-semibold text-right text-green-700">
              Total: {items.reduce((s, i) => s + (parseFloat(i.quantity)||0) * (parseFloat(i.unit_price)||0), 0).toFixed(2)} EUR
            </p>
          </div>
          <button type="submit" disabled={saving} className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50">
            {saving ? 'Guardando...' : 'Registrar Venta'}
          </button>
        </form>
      )}

      <div className="bg-white rounded-xl shadow">
        <div className="p-4 border-b">
          <input type="text" placeholder="Buscar por socio o fecha..." value={filter} onChange={e => setFilter(e.target.value)} className="border rounded-lg p-2 text-sm w-full max-w-sm" />
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-500">Cargando...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3 text-gray-600">Fecha</th>
                <th className="text-left p-3 text-gray-600">Socio</th>
                <th className="text-left p-3 text-gray-600">Productos</th>
                <th className="text-left p-3 text-gray-600">Pago</th>
                <th className="text-right p-3 text-gray-600">Total</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} className="border-t hover:bg-gray-50">
                  <td className="p-3 text-gray-700">{s.sale_date}</td>
                  <td className="p-3 text-gray-700">{s.persons?.full_name || '-'}</td>
                  <td className="p-3 text-gray-500 text-xs">{s.sale_items?.map(i => `${i.quantity}x ${i.products?.name}`).join(', ') || '-'}</td>
                  <td className="p-3 text-gray-500 text-xs capitalize">{s.payment_method || '-'}</td>
                  <td className="p-3 text-right font-semibold text-green-700">{s.total_amount?.toFixed(2)} EUR</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-gray-400">Sin ventas registradas</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
