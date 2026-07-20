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
  const rows=[['Num. Socio','Nombre','Email','Telefono','Notas','Estado','Fecha Alta']]
  persons.forEach(p=>rows.push([p.member_number||'', p.full_name, p.email||'', p.phone||'', p.notes||'', p.active?'Activo':'Inactivo', p.created_at?p.created_at.split('T')[0]:'' ]))
  const csv=rows.map(r=>r.map(v=>`"${v}"`).join(',')).join('\n')
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'})
  const url=URL.createObjectURL(blob)
  const a=document.createElement('a')
  a.href=url
  a.download=`socios_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function PersonasPage() {
  const [persons, setPersons] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string|null>(null)
  const [form, setForm] = useState({full_name:'', email:'', phone:'', member_number:'', notes:''})
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [filter, setFilter] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  useEffect(()=>{ loadAll() },[])

  async function loadAll() {
    setLoading(true)
    const {data}=await supabase.from('persons').select('*').order('full_name')
    setPersons(data||[])
    setLoading(false)
  }

  function startEdit(p:Person) {
    setEditId(p.id)
    setForm({full_name:p.full_name, email:p.email||'', phone:p.phone||'', member_number:p.member_number||'', notes:p.notes||''})
    setShowForm(true)
    window.scrollTo({top:0,behavior:'smooth'})
  }

  function cancelForm() {
    setShowForm(false)
    setEditId(null)
    setForm({full_name:'', email:'', phone:'', member_number:'', notes:''})
    setMsg('')
  }

  async function handleSubmit(e:React.FormEvent) {
    e.preventDefault()
    if(!form.full_name.trim()){setMsg('El nombre es obligatorio');return}
    setSaving(true)
    setMsg('')
    if(editId){
      const {error}=await supabase.from('persons').update(form).eq('id',editId)
      if(error){setMsg('Error: '+error.message);setSaving(false);return}
      setMsg('Socio actualizado')
    } else {
      const {error}=await supabase.from('persons').insert({...form, active:true})
      if(error){setMsg('Error: '+error.message);setSaving(false);return}
      setMsg('Socio registrado correctamente')
    }
    cancelForm()
    setSaving(false)
    loadAll()
  }

  async function toggleActive(p:Person) {
    await supabase.from('persons').update({active:!p.active}).eq('id',p.id)
    loadAll()
  }

  const filtered=persons.filter(p=>{
    const matchFilter=!filter||p.full_name.toLowerCase().includes(filter.toLowerCase())||p.member_number?.includes(filter)||p.email?.toLowerCase().includes(filter.toLowerCase())
    const matchActive=showInactive?true:p.active
    return matchFilter&&matchActive
  })

  return(
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div><h1 className="text-2xl font-bold text-gray-900">Socios</h1><p className="text-xs text-gray-400">{filtered.length} socios</p></div>
        <div className="flex gap-2">
          <button onClick={()=>exportCSV(filtered)} className="bg-gray-600 text-white px-3 py-2 rounded-xl text-sm">CSV</button>
          <button onClick={()=>{setShowForm(!showForm);setEditId(null)}} className={`px-3 py-2 rounded-xl text-sm font-medium ${showForm&&!editId?'bg-gray-200 text-gray-700':'bg-purple-600 text-white'}`}>{showForm&&!editId?'Cancelar':'+ Nuevo'}</button>
        </div>
      </div>

      {msg&&<div className="bg-purple-50 border border-purple-200 text-purple-700 rounded-xl px-4 py-3 mb-4 text-sm">{msg}</div>}

      {showForm&&(
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4 space-y-3">
          <h2 className="font-semibold text-gray-800">{editId?'Editar Socio':'Nuevo Socio'}</h2>
          <div><label className="text-xs text-gray-500 mb-1 block">Nombre completo *</label><input type="text" value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-gray-500 mb-1 block">Numero de socio</label><input type="text" value={form.member_number} onChange={e=>setForm({...form,member_number:e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" placeholder="Ej: S-001" /></div>
            <div><label className="text-xs text-gray-500 mb-1 block">Telefono</label><input type="tel" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" /></div>
          </div>
          <div><label className="text-xs text-gray-500 mb-1 block">Email</label><input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" /></div>
          <div><label className="text-xs text-gray-500 mb-1 block">Notas</label><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" rows={2} /></div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="flex-1 bg-purple-600 text-white py-3 rounded-xl font-medium disabled:opacity-50">{saving?'Guardando...':(editId?'Actualizar':'Registrar Socio')}</button>
            <button type="button" onClick={cancelForm} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-medium">Cancelar</button>
          </div>
        </form>
      )}

      <div className="flex gap-3 mb-4 items-center">
        <input type="text" placeholder="Buscar por nombre, numero o email..." value={filter} onChange={e=>setFilter(e.target.value)} className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm shadow-sm" />
        <label className="flex items-center gap-1.5 text-xs text-gray-600 whitespace-nowrap">
          <input type="checkbox" checked={showInactive} onChange={e=>setShowInactive(e.target.checked)} className="rounded" />
          Inactivos
        </label>
      </div>

      {loading?(
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"/></div>
      ):filtered.length===0?(
        <div className="text-center py-12 text-gray-400 text-sm">Sin socios registrados</div>
      ):filtered.map(p=>(
        <div key={p.id} className={`bg-white rounded-2xl shadow-sm border border-gray-100 mb-3 overflow-hidden ${!p.active?'opacity-60':''}`}>
          <div className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold text-gray-900">{p.full_name}</p>
                <p className="text-xs text-gray-400">{p.member_number||'Sin numero'}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.active?'bg-green-100 text-green-700':'bg-gray-100 text-gray-500'}`}>{p.active?'Activo':'Inactivo'}</span>
            </div>
            {(p.email||p.phone)&&(
              <div className="mt-2 space-y-0.5">
                {p.email&&<p className="text-xs text-gray-500">Email: {p.email}</p>}
                {p.phone&&<p className="text-xs text-gray-500">Tel: {p.phone}</p>}
              </div>
            )}
          </div>
          <div className="flex border-t border-gray-100">
            <button onClick={()=>startEdit(p)} className="flex-1 py-3 text-sm font-medium text-blue-600 bg-blue-50">Editar</button>
            <button onClick={()=>toggleActive(p)} className={`flex-1 py-3 text-sm font-medium ${p.active?'text-red-600 bg-red-50':'text-green-600 bg-green-50'}`}>{p.active?'Desactivar':'Activar'}</button>
          </div>
        </div>
      ))}
    </div>
  )
}
