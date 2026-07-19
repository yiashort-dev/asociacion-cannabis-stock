'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface Product {
  id: string
  name: string
  description: string
  unit: string
  price_purchase: number
  price_sale: number
  stock_current: number
  active: boolean
}

export default function ProductosPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', unit: 'g', price_purchase: '', price_sale: '', stock_current: '0' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => { loadProducts() }, [])

  async function loadProducts() {
    setLoading(true)
    const { data } = await supabase.from('products').select('*').order('name')
    setProducts(data || [])
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('products').insert([{
      name: form.name,
      description: form.description,
      unit: form.unit,
      price_purchase: parseFloat(form.price_purchase) || 0,
      price_sale: parseFloat(form.price_sale) || 0,
      stock_current: parseFloat(form.stock_current) || 0,
    }])
    if (error) { setMsg('Error: ' + error.message) }
    else { setMsg('Producto creado'); setShowForm(false); setForm({ name: '', description: '', unit: 'g', price_purchase: '', price_sale: '', stock_current: '0' }); loadProducts() }
    setSaving(false)
  }

  async function toggleActive(id: string, active: boolean) {
    await supabase.from('products').update({ active: !active }).eq('id', id)
    loadProducts()
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/dashboard" className="text-green-700 hover:underline text-sm">&larr; Dashboard</Link>
          <h1 className="text-2xl font-bold text-gray-800">Productos</h1>
          <button onClick={() => setShowForm(!showForm)} className="ml-auto bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded font-semibold">
            + Nuevo Producto
          </button>
        </div>
        {msg && <div className="mb-4 p-3 bg-green-100 text-green-800 rounded">{msg}</div>}
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Nuevo Producto</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full border rounded px-3 py-2" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripcion</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full border rounded px-3 py-2" rows={2} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unidad</label>
                <select value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} className="w-full border rounded px-3 py-2">
                  <option value="g">Gramos (g)</option>
                  <option value="kg">Kilogramos (kg)</option>
                  <option value="ud">Unidades (ud)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock inicial</label>
                <input type="number" step="0.01" value={form.stock_current} onChange={e => setForm({...form, stock_current: e.target.value})} className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio compra (EUR)</label>
                <input type="number" step="0.01" value={form.price_purchase} onChange={e => setForm({...form, price_purchase: e.target.value})} className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio venta (EUR)</label>
                <input type="number" step="0.01" value={form.price_sale} onChange={e => setForm({...form, price_sale: e.target.value})} className="w-full border rounded px-3 py-2" />
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button type="submit" disabled={saving} className="bg-green-700 hover:bg-green-600 text-white px-6 py-2 rounded font-semibold disabled:opacity-50">
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="border px-6 py-2 rounded">Cancelar</button>
            </div>
          </form>
        )}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Cargando...</div>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left px-4 py-3">Producto</th>
                  <th className="text-right px-4 py-3">Stock</th>
                  <th className="text-right px-4 py-3">P. Compra</th>
                  <th className="text-right px-4 py-3">P. Venta</th>
                  <th className="text-center px-4 py-3">Estado</th>
                  <th className="text-center px-4 py-3">Accion</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{p.name}</div>
                      <div className="text-gray-500 text-xs">{p.description}</div>
                    </td>
                    <td className="text-right px-4 py-3 font-mono">{p.stock_current} {p.unit}</td>
                    <td className="text-right px-4 py-3">{p.price_purchase?.toFixed(2)} EUR</td>
                    <td className="text-right px-4 py-3">{p.price_sale?.toFixed(2)} EUR</td>
                    <td className="text-center px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        {p.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="text-center px-4 py-3">
                      <button onClick={() => toggleActive(p.id, p.active)} className="text-xs text-blue-600 hover:underline">
                        {p.active ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-400">No hay productos</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
