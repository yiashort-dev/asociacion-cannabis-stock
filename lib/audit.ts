import { supabase } from '@/lib/supabase'

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'ANULAR'

export interface AuditEntry {
  table_name: string
  record_id: number | string
  action: AuditAction
  old_data?: Record<string, unknown>
  new_data?: Record<string, unknown>
  user_email?: string
  notes?: string
}

export async function logAudit(entry: AuditEntry) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('audit_logs').insert({
      table_name: entry.table_name,
      record_id: String(entry.record_id),
      action: entry.action,
      old_data: entry.old_data || null,
      new_data: entry.new_data || null,
      user_email: entry.user_email || user?.email || 'unknown',
      notes: entry.notes || null,
      created_at: new Date().toISOString()
    })
  } catch (err) {
    console.warn('Audit log failed:', err)
  }
}
