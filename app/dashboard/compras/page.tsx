'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Purchase {
  id: string
  date: string
  notes: string
  total: number
  supplier: string
  purchase_items?: { quantity: number; unit_price: number; products: { name: string } }[]
}

function exportCSV(purchases: Purchase[]) {
  const rows = [['ID', 'Fecha', 'Proveedor', 'Total EUR', 'Notas']]
  purchases.forEach(p => {
    rows.push([
      p.id.slice(0,8),
      p.date,
      p.supplier || '',
      p.total?.toFixed(2) || '0',
      p.notes || ''
    ])
  })
  const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `compras_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function ComprasPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [products, setProducts] = useState<{id: string; name: string; unit: string; stock_current: number}[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ supplier: '', notes: '', date: new Date().toISOString().split('T')[0] })
  const [items, setItems] = useState([{ product_id: '', quantity: '', unit_price: '' }])
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [filter, setFilter] = useState('')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [{ data: p }, { data: pr }] = await Promise.all([
      supabase.from('purchases').select('*, purchase_items(quantity, unit_price, products(name))').order('date', { ascending: false }).limit(100),
      supabase.from('products').select('id, name, unit, stock_current').eq('active', true).order('name')
    ])
    setPurchases(p || [])
    setProducts(pr || [])
    setLoading(false)
  }

  function addItem() { setItems([...items, { product_id: '', quantity: '', unit_price: '' }]) }
  function removeItem(i: number) { setItems(items.filter((_, idx) => idx !== i)) }
  function updateItem(i: number, field: string, value: string) {
    const newItems = [...items]
    newItems[i] = { ...newItems[i], [field]: value }
    setItems(newItems)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validItems = items.filter(i => i.product_id && i.quantity && i.unit_price)
    if (!validItems.length) { setMsg('Agrega al menos un producto'); return }
    setSaving(true)
    setMsg('')
    const total = validItems.reduce((s, i) => s + parseFloat(i.quantity) * parseFloat(i.unit_price), 0)
    const { data: purchase, error } = await supabase.from('purchases').insert({ ...form, total }).select().single()
    if (error || !purchase) { setMsg('Error: ' + error?.message); setSaving(false); return }
    const purchaseItems = validItems.map(i => ({ purchase_id: purchase.id, product_id: i.product_id, quantity: parseFloat(i.quantity), unit_price: parseFloat(i.unit_price) }))
    await supabase.from('purchase_items').insert(purchaseItems)
    for (const i of validItems) {
      const prod = products.find(p => p.id === i.product_id)
      if (prod) await supabase.from('products').update({ stock_current: prod.stock_current + parseFloat(i.quantity) }).eq('id', i.product_id)
    }
    setMsg('Compra registrada correctamente')
    setForm({ supplier: '', notes: '', date: new Date().toISOString().split('T')[0] })
    setItems([{ product_id: '', quantity: '', unit_price: '' }])
    setShowForm(false)
    setSaving(false)
    loadAll()
  }

  const filtered = purchases.filter(p =>
    !filter ||
    p.supplier?.toLowerCase().includes(filter.toLowerCase()) ||
    p.date?.includes(filter)
  )

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Compras</h1>
        <div className="flex gap-2">
          <button onClick={() => exportCSV(filtered)} className="bg-gray-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-700">Exportar CSV</button>
          <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
            {showForm ? 'Cancelar' : '+ Nueva Compra'}
          </button>
        </div>
      </div>

      {msg && <div className="mb-4 p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-sm">{msg}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 shadow mb-6">
          <h2 className="text-lg font-semibold mb-4">Nueva Compra</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
              <input type="text" value={form.supplier} onChange={e => setForm({...form, supplier: e.target.value})} className="w-full border rounded-lg p-2 text-sm" placeholder="Nombre del proveedor" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
              <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full border rounded-lg p-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
              <input type="text" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="w-full border rounded-lg p-2 text-sm" placeholder="Opcional" />
            </div>
          </div>
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-gray-700">Productos</label>
              <button type="button" onClick={addItem} className="text-sm text-blue-600 hover:underline">+ Agregar</button>
            </div>
            {items.map((item, i) => (
              <div key={i} className="grid grid-cols-4 gap-2 mb-2">
                <select value={item.product_id} onChange={e => updateItem(i, 'product_id', e.target.value)} className="border rounded-lg p-2 text-sm col-span-2">
                  <option value="">Producto...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <input type="number" placeholder="Cantidad" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} className="border rounded-lg p-2 text-sm" min="0" step="0.1" />
                <div className="flex gap-1">
                  <input type="number" placeholder="Precio" value={item.unit_price} onChange={e => updateItem(i, 'unit_price', e.target.value)} className="border rounded-lg p-2 text-sm w-full" min="0" step="0.01" />
                  {items.length > 1 && <button type="button" onClick={() => removeItem(i)} className="text-red-500 px-2">x</button>}
                </div>
              </div>
            ))}
            <p className="text-sm font-semibold text-right text-blue-700">
              Total: {items.reduce((s, i) => s + (parseFloat(i.quantity)||0) * (parseFloat(i.unit_price)||0), 0).toFixed(2)} EUR
            </p>
          </div>
          <button type="submit" disabled={saving} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Guardando...' : 'Registrar Compra'}
          </button>
        </form>
      )}

      <div className="bg-white rounded-xl shadow">
        <div className="p-4 border-b">
          <input type="text" placeholder="Buscar por proveedor o fecha..." value={filter} onChange={e => setFilter(e.target.value)} className="border rounded-lg p-2 text-sm w-full max-w-sm" />
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-500">Cargando...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3 text-gray-600">Fecha</th>
                <th className="text-left p-3 text-gray-600">Proveedor</th>
                <th className="text-left p-3 text-gray-600">Productos</th>
                <th className="text-right p-3 text-gray-600">Total</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="border-t hover:bg-gray-50">
                  <td className="p-3 text-gray-700">{p.date}</td>
                  <td className="p-3 text-gray-700">{p.supplier || '-'}</td>
                  <td className="p-3 text-gray-500 text-xs">{p.purchase_items?.map(i => `${i.quantity}x ${i.products?.name}`).join(', ') || '-'}</td>
                  <td className="p-3 text-right font-semibold text-blue-700">{p.total?.toFixed(2)} EUR</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={4} className="p-8 text-center text-gray-400">Sin compras registradas</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
