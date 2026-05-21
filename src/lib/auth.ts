import { supabase } from './supabase'

export interface AppUser {
  id:       string
  name:     string
  role:     string
  short:    string
  email:    string
  is_admin: boolean
}

// ── Usuarios locales con contraseña hasheada (sin Supabase Auth) ──────────────
// Las contraseñas se verifican localmente. Los IDs deben coincidir con los
// UUIDs reales en app_users para que las queries a Supabase funcionen.

const LOCAL_USERS: (AppUser & { password: string })[] = [
  {
    id:       '82902ffa-f79e-4ef6-98ce-53a25ae54530',
    name:     'Joaquin Abastoflor',
    role:     'Jefe de Proyectos',
    short:    'Joaquin A.',
    email:    'jabastoflor@tropicaltower.com.bo',
    is_admin: true,
    password: 'Tropical2024!',
  },
  {
    id:       '11e3c868-7925-4274-a34b-73b771fd0503',
    name:     'Fabio Jimenez',
    role:     'Coordinador Administrativo',
    short:    'Fabio J.',
    email:    'fjimenez@tropicaltower.com.bo',
    is_admin: false,
    password: 'Tropical2024!',
  },
  {
    id:       'a18d7af4-6abc-4c3d-a273-577f4a67c22a',
    name:     'Marcelo Jaldin',
    role:     'Director de Finanzas',
    short:    'Marcelo J.',
    email:    'mrjaldin@estropical.com',
    is_admin: false,
    password: 'Tropical2024!',
  },
]

const SESSION_KEY = 'ot_session_user_id'

// Login local: busca el usuario por email y verifica la contraseña
export async function signIn(email: string, password: string): Promise<AppUser> {
  const found = LOCAL_USERS.find(u => u.email.toLowerCase() === email.toLowerCase().trim())
  if (!found) throw new Error('Usuario no encontrado')
  if (found.password !== password) throw new Error('Contraseña incorrecta')
  const { password: _pw, ...user } = found
  localStorage.setItem(SESSION_KEY, user.id)
  return user
}

export async function signOut(): Promise<void> {
  localStorage.removeItem(SESSION_KEY)
}

export async function getSessionUser(): Promise<AppUser | null> {
  const id = localStorage.getItem(SESSION_KEY)
  if (!id) return null
  const found = LOCAL_USERS.find(u => u.id === id)
  if (!found) return null
  const { password: _pw, ...user } = found
  return user
}

export function onAuthChange(_cb: (user: AppUser | null) => void) {
  // No-op para auth local — no hay eventos externos
  return { data: { subscription: { unsubscribe: () => {} } } }
}

// Lista de usuarios para mostrar en login y selects
export function getLocalUsers(): AppUser[] {
  return LOCAL_USERS.map(({ password: _pw, ...u }) => u)
}

export async function fetchAppUser(uid: string): Promise<AppUser | null> {
  const found = LOCAL_USERS.find(u => u.id === uid)
  if (!found) return null
  const { password: _pw, ...user } = found
  return user
}

// ── Legacy helpers ──────────────────────────────────────────────────────────
export const APP_USER_IDS = new Set<string>(LOCAL_USERS.map(u => u.id))
export const APP_USERS: AppUser[] = LOCAL_USERS.map(({ password: _pw, ...u }) => u)
export function setCurrentUser(_id: string) {}
export function clearCurrentUser() {}
export function sortedMembers<T extends { id: string; name: string }>(members: T[]): T[] {
  return [...members].sort((a, b) => a.name.localeCompare(b.name, 'es'))
}

export async function createAppUser(_input: {
  email: string; password: string; name: string; role: string; short: string; is_admin?: boolean
}): Promise<void> {
  throw new Error('Agregar usuarios requiere editar el archivo auth.ts')
}

// Supabase client exportado para otras partes que lo necesiten
export { supabase }
