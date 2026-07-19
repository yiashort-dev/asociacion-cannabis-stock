'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface Person {
  id: string; full_name: string; email: string; phone: string;
  member_number: string; notes: string; active: boolean; created_at: string;
}

export default function PersonasPage() {
  const [persons, setPersons] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', member_number: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => { loadPersons() }, [])

  async function loadPersons() {
    setLoading(true)
    const { data } = await supabase.from('persons').select('*').order('full_name')
    setPersons(data || [])
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('persons').insert([{
      full_name: form.full_name,
      email: form.email,
      phone: form.phone,
      member_number: form.member_number,
      notes: form.notes,
      active: true
    }])
    if (error) { setMsg('Error: ' + error.message) }
    else { setMsg('Persona creada'); setShowForm(false); setForm({ full_name: '', email: '', phone: '', member_number: '', notes: '' }); loadPersons() }
    setSaving(false)
  }

  async function toggleActive(id: string, active: boolean) {
    await supabase.from('persons').update({ active: !active }).eq('id', id)
    loadPersons()
  }

  function exportCSV() {
    const rows = [
      ['Nombre', 'Email', 'Telefono', 'Num. Socio', 'Activo'],
      ...persons.map(p => [p.full_name, p.email, p.phone, p.member_number, p.active ? 'Si' : 'No'])
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `personas_${new Date().toISOString().split('T')[0]}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/dashboard" className="text-green-700 hover:underline text-sm">&larr; Dashboard</Link>
          <h1 className="text-2xl font-bold text-gray-800">Personas / Socios</h1>
          <button onClick={exportCSV} className="ml-auto bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm">Exportar CSV</button>
          <button onClick={() => setShowForm(!showForm)} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded font-semibold">+ Nueva Persona</button>
        </div>
        {msg && <div className="mb-4 p-3 bg-green-100 text-green-800 rounded">{msg}</div>}
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Nueva Persona</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo *</label>
                <input required value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
                <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Num. de Socio</label>
                <input value={form.member_number} onChange={e => setForm({...form, member_number: e.target.value})} className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="w-full border rounded px-3 py-2" />
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
        {loading ? <div className="text-center py-12 text-gray-500">Cargando...</div> : (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 text-sm text-gray-500">{persons.filter(p => p.active).length} socios activos / {persons.length} total</div>
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left px-4 py-3">Nombre</th>
                  <th className="text-left px-4 py-3">Email</th>
                  <th className="text-left px-4 py-3">Telefono</th>
                  <th className="text-left px-4 py-3">Num. Socio</th>
                  <th className="text-center px-4 py-3">Estado</th>
                  <th className="text-center px-4 py-3">Accion</th>
                </tr>
              </thead>
              <tbody>
                {persons.map(p => (
                  <tr key={p.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{p.full_name}</td>
                    <td className="px-4 py-3 text-gray-500">{p.email}</td>
                    <td className="px-4 py-3">{p.phone}</td>
                    <td className="px-4 py-3 font-mono">{p.member_number}</td>
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
                {persons.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-400">No hay personas registradas</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
