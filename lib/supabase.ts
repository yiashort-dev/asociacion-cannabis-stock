import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type UserRole = 'admin' | 'gestor' | 'operator' | 'readonly'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  active: boolean
  created_at: string
}

export interface Product {
  id: number
  name: string
  category_id: number | null
  variety: string | null
  unit: string
  sale_price: number
  cost_price: number
  stock_min: number
  stock_actual: number
  active: boolean
}

export interface Person {
  id: number
  full_name: string
  alias: string | null
  phone: string | null
  email: string | null
  member_number: string | null
  active: boolean
}

export interface Purchase {
  id: number
  person_id: number | null
  purchase_date: string
  total_cost: number
  supplier: string | null
  notes: string | null
  status: string
  created_at: string
}

export interface Sale {
  id: number
  person_id: number | null
  sale_date: string
  total_amount: number
  payment_method: string
  notes: string | null
  status: string
  created_at: string
}

export interface StockMovement {
  id: number
  product_id: number
  person_id: number | null
  movement_type: string
  quantity: number
  stock_before: number | null
  stock_after: number | null
  notes: string | null
  created_at: string
}
