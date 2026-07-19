'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface Product { id: string; name: string; unit: string; stock_current: number }
interface Purchase {
  id: string; date: string; notes: string; total: number;
  persons?: { full_name: string };
  purchase_items?: { quantity: number; unit_price: number; products: { name: string } }[]
}

export default function ComprasPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [persons, setPersons] = useState<{id: string; full_name: string}[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ person_id: '', notes: '', date: new Date().toISOString().split('T')[0] })
  const [items, setItems] = useState([{ product_id: '', quantity: '', unit_price: '' }])
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [{ data: p }, { data: pr }, { data: pers }] = await Promise.all([
      supabase.from('purchases').select('*, persons(full_name), purchase_items(quantity, unit_price, products(name))').order('date', { ascending: false }).limit(50),
      supabase.from('products').select('id, name, unit, stock_current').eq('active', true).order('name'),
      supabase.from('persons').select('id, full_name').eq('active', true).order('full_name')
    ])
    setPurchases(p || [])
    setProducts(pr || [])
    setPersons(pers || [])
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
    setSaving(true)
    const validItems = items.filter(i => i.product_id && i.quantity)
    if (!validItems.length) { setMsg('Agrega al menos un producto'); setSaving(false); return }
    const total = validItems.reduce((s, i) => s + parseFloat(i.quantity) * (parseFloat(i.unit_price) || 0), 0)
    const { data: purchase, error } = await supabase.from('purchases')
      .insert([{ person_id: form.person_id || null, notes: form.notes, date: form.date, total }])
      .select().single()
    if (error) { setMsg('Error: ' + error.message); setSaving(false); return }
    await supabase.from('purchase_items').insert(
      validItems.map(i => ({ purchase_id: purchase.id, product_id: i.product_id, quantity: parseFloat(i.quantity), unit_price: parseFloat(i.unit_price) || 0 }))
    )
    for (const i of validItems) {
      const prod = products.find(p => p.id === i.product_id)
      if (prod) { await supabase.from('products').update({ stock_current: prod.stock_current + parseFloat(i.quantity) }).eq('id', i.product_id) }
    }
    setMsg('Compra registrada')
    setShowForm(false)
    setForm({ person_id: '', notes: '', date: new Date().toISOString().split('T')[0] })
    setItems([{ product_id: '', quantity: '', unit_price: '' }])
    loadAll()
    setSaving(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/dashboard" className="text-green-700 hover:underline text-sm">&larr; Dashboard</Link>
          <h1 className="text-2xl font-bold text-gray-800">Compras</h1>
          <button onClick={() => setShowForm(!showForm)} className="ml-auto bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded font-semibold">+ Nueva Compra</button>
        </div>
        {msg && <div className="mb-4 p-3 bg-blue-100 text-blue-800 rounded">{msg}</div>}
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Nueva Compra</h2>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Persona (opcional)</label>
                <select value={form.person_id} onChange={e => setForm({...form, person_id: e.target.value})} className="w-full border rounded px-3 py-2">
                  <option value="">-- Sin asignar --</option>
                  {persons.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="w-full border rounded px-3 py-2" placeholder="Opcional" />
              </div>
            </div>
            <table className="w-full text-sm mb-4">
              <thead><tr className="bg-gray-50"><th className="text-left px-2 py-1">Producto</th><th className="text-right px-2 py-1">Cantidad</th><th className="text-right px-2 py-1">Precio unit. (EUR)</th><th></th></tr></thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-2 py-1">
                      <select value={item.product_id} onChange={e => updateItem(i, 'product_id', e.target.value)} className="w-full border rounded px-2 py-1">
                        <option value="">-- Seleccionar --</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.stock_current}{p.unit})</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1"><input type="number" step="0.01" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} className="w-full border rounded px-2 py-1 text-right" placeholder="0" /></td>
                    <td className="px-2 py-1"><input type="number" step="0.01" value={item.unit_price} onChange={e => updateItem(i, 'unit_price', e.target.value)} className="w-full border rounded px-2 py-1 text-right" placeholder="0" /></td>
                    <td className="px-2 py-1">{items.length > 1 && <button type="button" onClick={() => removeItem(i)} className="text-red-500 hover:text-red-700">x</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="button" onClick={addItem} className="text-blue-600 hover:underline text-sm mb-4">+ Agregar linea</button>
            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="bg-blue-700 hover:bg-blue-600 text-white px-6 py-2 rounded font-semibold disabled:opacity-50">{saving ? 'Guardando...' : 'Registrar Compra'}</button>
              <button type="button" onClick={() => setShowForm(false)} className="border px-6 py-2 rounded">Cancelar</button>
            </div>
          </form>
        )}
        {loading ? <div className="text-center py-12 text-gray-500">Cargando...</div> : (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-100"><tr>
                <th className="text-left px-4 py-3">Fecha</th>
                <th className="text-left px-4 py-3">Persona</th>
                <th className="text-left px-4 py-3">Productos</th>
                <th className="text-right px-4 py-3">Total</th>
                <th className="text-left px-4 py-3">Notas</th>
              </tr></thead>
              <tbody>
                {purchases.map(p => (
                  <tr key={p.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">{new Date(p.date).toLocaleDateString('es-ES')}</td>
                    <td className="px-4 py-3">{p.persons?.full_name || '-'}</td>
                    <td className="px-4 py-3 text-xs">{p.purchase_items?.map(i => `${i.products?.name} x${i.quantity}`).join(', ')}</td>
                    <td className="text-right px-4 py-3 font-mono">{p.total?.toFixed(2)} EUR</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{p.notes}</td>
                  </tr>
                ))}
                {purchases.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-gray-400">No hay compras</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
