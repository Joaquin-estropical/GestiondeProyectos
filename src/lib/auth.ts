import { supabase } from './supabase'

export interface AppUser {
  id:       string   // UUID de auth.users (o legacy id como 'joa','fab','mar')
  name:     string
  role:     string
  short:    string
  email:    string
  is_admin: boolean
}

// Fetch profile from app_users table using auth UID
export async function fetchAppUser(uid: string): Promise<AppUser | null> {
  const { data, error } = await supabase
    .from('app_users')
    .select('id,name,role,short,email,is_admin')
    .eq('id', uid)
    .single()
  if (error || !data) return null
  return data as AppUser
}

// Login with email + password via Supabase Auth
export async function signIn(email: string, password: string): Promise<AppUser> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)
  if (!data.user) throw new Error('No se pudo iniciar sesión')
  const profile = await fetchAppUser(data.user.id)
  if (!profile) throw new Error('Perfil de usuario no encontrado')
  return profile
}

// Logout
export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
}

// Get current session user (returns null if not logged in)
export async function getSessionUser(): Promise<AppUser | null> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return null
  return fetchAppUser(session.user.id)
}

// Listen to auth state changes
export function onAuthChange(cb: (user: AppUser | null) => void) {
  return supabase.auth.onAuthStateChange(async (_event, session) => {
    if (!session?.user) { cb(null); return }
    const profile = await fetchAppUser(session.user.id)
    cb(profile)
  })
}

// Create a new user (admin only — uses service role via backend or admin dashboard)
// Returns the created user's profile
export async function createAppUser(input: {
  email: string; password: string; name: string; role: string; short: string; is_admin?: boolean
}): Promise<void> {
  // Note: creating auth.users requires service role key.
  // This is a placeholder — actual user creation is done via Supabase Dashboard
  // or a server-side function. Frontend shows the form, admin completes via dashboard.
  throw new Error('La creación de usuarios debe hacerse desde el panel de Supabase o usando la CLI.')
}

// ── Legacy helpers (kept for sortedMembers in TaskDetail/MemberPicker) ──────

export const APP_USER_IDS = new Set<string>() // populated after login

// Sort member list (app users first — will be updated once we know who's logged in)
export function sortedMembers<T extends { id: string; name: string }>(members: T[]): T[] {
  return [...members].sort((a, b) => a.name.localeCompare(b.name, 'es'))
}

// Deprecated — kept for LoginPage compatibility during transition
export const APP_USERS: AppUser[] = []
export function setCurrentUser(_id: string) {}
export function clearCurrentUser() {}
