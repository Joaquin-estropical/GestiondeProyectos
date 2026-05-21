import { createClient } from '@supabase/supabase-js'

const url            = import.meta.env.VITE_SUPABASE_URL              as string
const anonKey        = import.meta.env.VITE_SUPABASE_ANON_KEY         as string
const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string

// Regular client for reads (RLS applies)
export const supabase = createClient(url, anonKey)

// Admin client — bypasses RLS for privileged writes (user/permission management)
export const supabaseAdmin = createClient(url, serviceRoleKey)

// Back-compat alias: pre-existing modules use `supabaseWriter` for all writes.
// RLS on most tables is permissive (USING true), so the anon client is fine
// for general writes. Only user/permission tables strictly need supabaseAdmin.
export const supabaseWriter = supabase
