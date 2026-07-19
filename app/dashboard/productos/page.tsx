'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Product {
  id: string
  name: string
  description: string
  unit: string
  price_purchase: number
  price_sale: number
  stock_current: number
  stock_min: number
  active: boolean
}

function exportCSV(products: Product[]) {
  const rows = [['Nombre', 'Descripcion', 'Unidad', 'Stock', 'Stock Min', 'Precio Compra', 'Precio Venta', 'Estado']]
  products.forEach(p => {
    rows.push([
      p.name,
      p.description || '',
      p.unit,
      String(p.stock_current),
      String(p.stock_min || 0),
      p.price_purchase?.toFixed(2) || '0',
      p.price_sale?.toFixed(2) || '0',
      p.active ? 'Activo' : 'Inactivo'
    ])
  })
  const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `productos_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function ProductosPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', description: '', unit: 'g', price_purchase: '', price_sale: '', stock_min: '10' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [filter, setFilter] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const { data } = await supabase.from('products').select('*').order('name')
    setProducts(data || [])
    setLoading(false)
  }

  function startEdit(p: Product) {
    setEditId(p.id)
    setForm({
      name: p.name,
      description: p.description || '',
      unit: p.unit,
      price_purchase: String(p.price_purchase || ''),
      price_sale: String(p.price_sale || ''),
      stock_min: String(p.stock_min || 10)
    })
    setShowForm(true)
  }

  function cancelForm() {
    setShowForm(false)
    setEditId(null)
    setForm({ name: '', description: '', unit: 'g', price_purchase: '', price_sale: '', stock_min: '10' })
    setMsg('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setMsg('El nombre es obligatorio'); return }
    setSaving(true)
    setMsg('')
    const payload = {
      name: form.name,
      description: form.description,
      unit: form.unit,
      price_purchase: parseFloat(form.price_purchase) || 0,
      price_sale: parseFloat(form.price_sale) || 0,
      stock_min: parseInt(form.stock_min) || 10
    }
    if (editId) {
      const { error } = await supabase.from('products').update(payload).eq('id', editId)
      if (error) { setMsg('Error: ' + error.message); setSaving(false); return }
      setMsg('Producto actualizado')
    } else {
      const { error } = await supabase.from('products').insert({ ...payload, stock_current: 0, active: true })
      if (error) { setMsg('Error: ' + error.message); setSaving(false); return }
      setMsg('Producto creado')
    }
    cancelForm()
    setSaving(false)
    loadAll()
  }

  async function toggleActive(p: Product) {
    await supabase.from('products').update({ active: !p.active }).eq('id', p.id)
    loadAll()
  }

  const filtered = products.filter(p => {
    const matchFilter = !filter || p.name.toLowerCase().includes(filter.toLowerCase())
    const matchActive = showInactive ? true : p.active
    return matchFilter && matchActive
  })

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Productos</h1>
        <div className="flex gap-2">
          <button onClick={() => exportCSV(filtered)} className="bg-gray-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-700">Exportar CSV</button>
          <button onClick={() => { cancelForm(); setShowForm(!showForm) }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700">
            {showForm && !editId ? 'Cancelar' : '+ Nuevo Producto'}
          </button>
        </div>
      </div>

      {msg && <div className="mb-4 p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-sm">{msg}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 shadow mb-6">
          <h2 className="text-lg font-semibold mb-4">{editId ? 'Editar Producto' : 'Nuevo Producto'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full border rounded-lg p-2 text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unidad</label>
              <select value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} className="w-full border rounded-lg p-2 text-sm">
                <option value="g">g (gramos)</option>
                <option value="kg">kg (kilogramos)</option>
                <option value="u">u (unidades)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio Compra (EUR)</label>
              <input type="number" value={form.price_purchase} onChange={e => setForm({...form, price_purchase: e.target.value})} className="w-full border rounded-lg p-2 text-sm" min="0" step="0.01" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio Venta (EUR)</label>
              <input type="number" value={form.price_sale} onChange={e => setForm({...form, price_sale: e.target.value})} className="w-full border rounded-lg p-2 text-sm" min="0" step="0.01" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock Minimo</label>
              <input type="number" value={form.stock_min} onChange={e => setForm({...form, stock_min: e.target.value})} className="w-full border rounded-lg p-2 text-sm" min="0" />
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripcion</label>
              <input type="text" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full border rounded-lg p-2 text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {saving ? 'Guardando...' : editId ? 'Actualizar' : 'Crear Producto'}
            </button>
            <button type="button" onClick={cancelForm} className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300">Cancelar</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl shadow">
        <div className="p-4 border-b flex gap-4 items-center">
          <input type="text" placeholder="Buscar producto..." value={filter} onChange={e => setFilter(e.target.value)} className="border rounded-lg p-2 text-sm flex-1 max-w-sm" />
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
            Mostrar inactivos
          </label>
          <span className="text-sm text-gray-500">{filtered.length} productos</span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-500">Cargando...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3 text-gray-600">Nombre</th>
                <th className="text-center p-3 text-gray-600">Stock</th>
                <th className="text-center p-3 text-gray-600">Min</th>
                <th className="text-right p-3 text-gray-600">P. Compra</th>
                <th className="text-right p-3 text-gray-600">P. Venta</th>
                <th className="text-center p-3 text-gray-600">Estado</th>
                <th className="text-center p-3 text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className={`border-t hover:bg-gray-50 ${!p.active ? 'opacity-50' : ''}`}>
                  <td className="p-3">
                    <div className="font-medium text-gray-800">{p.name}</div>
                    {p.description && <div className="text-xs text-gray-400">{p.description}</div>}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`font-bold ${p.stock_current <= (p.stock_min || 10) ? 'text-red-600' : 'text-gray-800'}`}>
                      {p.stock_current}{p.unit}
                    </span>
                  </td>
                  <td className="p-3 text-center text-gray-400">{p.stock_min || 10}{p.unit}</td>
                  <td className="p-3 text-right text-gray-600">{p.price_purchase?.toFixed(2)} EUR</td>
                  <td className="p-3 text-right text-green-700 font-medium">{p.price_sale?.toFixed(2)} EUR</td>
                  <td className="p-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${p.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {p.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex gap-2 justify-center">
                      <button onClick={() => startEdit(p)} className="text-blue-600 text-xs hover:underline">Editar</button>
                      <button onClick={() => toggleActive(p)} className={`text-xs hover:underline ${p.active ? 'text-red-500' : 'text-green-600'}`}>
                        {p.active ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-gray-400">Sin productos registrados</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
