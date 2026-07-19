'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Person {
  id: string
  full_name: string
  email: string
  phone: string
  member_number: string
  notes: string
  active: boolean
  created_at: string
}

function exportCSV(persons: Person[]) {
  const rows = [['Num. Socio', 'Nombre', 'Email', 'Telefono', 'Notas', 'Estado', 'Fecha Alta']]
  persons.forEach(p => {
    rows.push([
      p.member_number || '',
      p.full_name,
      p.email || '',
      p.phone || '',
      p.notes || '',
      p.active ? 'Activo' : 'Inactivo',
      p.created_at ? p.created_at.split('T')[0] : ''
    ])
  })
  const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `socios_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function PersonasPage() {
  const [persons, setPersons] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', member_number: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [filter, setFilter] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const { data } = await supabase.from('persons').select('*').order('full_name')
    setPersons(data || [])
    setLoading(false)
  }

  function startEdit(p: Person) {
    setEditId(p.id)
    setForm({ full_name: p.full_name, email: p.email || '', phone: p.phone || '', member_number: p.member_number || '', notes: p.notes || '' })
    setShowForm(true)
  }

  function cancelForm() {
    setShowForm(false)
    setEditId(null)
    setForm({ full_name: '', email: '', phone: '', member_number: '', notes: '' })
    setMsg('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name.trim()) { setMsg('El nombre es obligatorio'); return }
    setSaving(true)
    setMsg('')
    if (editId) {
      const { error } = await supabase.from('persons').update(form).eq('id', editId)
      if (error) { setMsg('Error: ' + error.message); setSaving(false); return }
      setMsg('Socio actualizado')
    } else {
      const { error } = await supabase.from('persons').insert({ ...form, active: true })
      if (error) { setMsg('Error: ' + error.message); setSaving(false); return }
      setMsg('Socio registrado correctamente')
    }
    cancelForm()
    setSaving(false)
    loadAll()
  }

  async function toggleActive(p: Person) {
    await supabase.from('persons').update({ active: !p.active }).eq('id', p.id)
    loadAll()
  }

  const filtered = persons.filter(p => {
    const matchFilter = !filter || p.full_name.toLowerCase().includes(filter.toLowerCase()) || p.member_number?.includes(filter) || p.email?.toLowerCase().includes(filter.toLowerCase())
    const matchActive = showInactive ? true : p.active
    return matchFilter && matchActive
  })

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Socios / Personas</h1>
        <div className="flex gap-2">
          <button onClick={() => exportCSV(filtered)} className="bg-gray-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-700">Exportar CSV</button>
          <button onClick={() => { setShowForm(!showForm); setEditId(null) }} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700">
            {showForm && !editId ? 'Cancelar' : '+ Nuevo Socio'}
          </button>
        </div>
      </div>

      {msg && <div className="mb-4 p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-sm">{msg}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 shadow mb-6">
          <h2 className="text-lg font-semibold mb-4">{editId ? 'Editar Socio' : 'Nuevo Socio'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo *</label>
              <input type="text" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} className="w-full border rounded-lg p-2 text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Numero de socio</label>
              <input type="text" value={form.member_number} onChange={e => setForm({...form, member_number: e.target.value})} className="w-full border rounded-lg p-2 text-sm" placeholder="Ej: S-001" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full border rounded-lg p-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
              <input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full border rounded-lg p-2 text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
              <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="w-full border rounded-lg p-2 text-sm" rows={2} />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50">
              {saving ? 'Guardando...' : editId ? 'Actualizar' : 'Registrar Socio'}
            </button>
            <button type="button" onClick={cancelForm} className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300">Cancelar</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl shadow">
        <div className="p-4 border-b flex gap-4 items-center">
          <input type="text" placeholder="Buscar por nombre, numero o email..." value={filter} onChange={e => setFilter(e.target.value)} className="border rounded-lg p-2 text-sm flex-1 max-w-sm" />
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
            Mostrar inactivos
          </label>
          <span className="text-sm text-gray-500">{filtered.length} socios</span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-500">Cargando...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3 text-gray-600">Num.</th>
                <th className="text-left p-3 text-gray-600">Nombre</th>
                <th className="text-left p-3 text-gray-600">Email</th>
                <th className="text-left p-3 text-gray-600">Telefono</th>
                <th className="text-center p-3 text-gray-600">Estado</th>
                <th className="text-center p-3 text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className={`border-t hover:bg-gray-50 ${!p.active ? 'opacity-50' : ''}`}>
                  <td className="p-3 text-gray-500 text-xs">{p.member_number || '-'}</td>
                  <td className="p-3 font-medium text-gray-800">{p.full_name}</td>
                  <td className="p-3 text-gray-600">{p.email || '-'}</td>
                  <td className="p-3 text-gray-600">{p.phone || '-'}</td>
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
                <tr><td colSpan={6} className="p-8 text-center text-gray-400">Sin socios registrados</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
