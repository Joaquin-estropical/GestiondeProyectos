import { createClient } from '@supabase/supabase-js'

const url     = import.meta.env.VITE_SUPABASE_URL      as string
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
const svcKey  = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string | undefined

// Public read client (anon key — for SELECT queries)
export const supabase = createClient(url, anonKey)

// Write client — uses service_role if available (bypasses RLS for internal app writes)
// Falls back to anon key if service_role not configured
export const supabaseWriter = svcKey
  ? createClient(url, svcKey, { auth: { persistSession: false } })
  : supabase
