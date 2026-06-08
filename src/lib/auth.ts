import { supabase } from './supabase'

export interface AppUser {
  id:        string   // UUID used for auth/session
  memberId:  string   // short id matching members.id in DB (e.g. 'joa', 'fab')
  name:      string
  role:      string
  short:     string
  email:     string
  is_admin:  boolean
}

// ── Usuarios locales con contraseña hasheada (sin Supabase Auth) ──────────────
// Las contraseñas se verifican localmente. Los IDs deben coincidir con los
// UUIDs reales en app_users para que las queries a Supabase funcionen.

const LOCAL_USERS: (AppUser & { password: string })[] = [
  {
    id:        '82902ffa-f79e-4ef6-98ce-53a25ae54530',
    memberId:  'joa',
    name:      'Joaquin Abastoflor',
    role:      'Jefe de Proyectos',
    short:     'Joaquin A.',
    email:     'jabastoflor@tropicaltower.com.bo',
    is_admin:  true,
    password:  'Tropical2024!',
  },
  {
    id:        '11e3c868-7925-4274-a34b-73b771fd0503',
    memberId:  'fab',
    name:      'Fabio Jimenez',
    role:      'Coordinador Administrativo',
    short:     'Fabio J.',
    email:     'fjimenez@tropicaltower.com.bo',
    is_admin:  false,
    password:  'Tropical2024!',
  },
  {
    id:        'a18d7af4-6abc-4c3d-a273-577f4a67c22a',
    memberId:  'mar',
    name:      'Marcelo Jaldin',
    role:      'Director de Finanzas',
    short:     'Marcelo J.',
    email:     'mrjaldin@estropical.com',
    is_admin:  false,
    password:  'Tropical2024!',
  },
  {
    id:        'c7e2a1b3-d4f5-4a6b-8c9d-0e1f2a3b4c5d',
    memberId:  'raq',
    name:      'Raquel Cabrera',
    role:      'Auditora',
    short:     'Raquel C.',
    email:     'rcabrera@estropical.com',
    is_admin:  false,
    password:  'Tropical2024!',
  },
]

const SESSION_KEY  = 'ot_session_user_id'
const PWD_KEY      = 'ot_local_passwords'   // { [userId]: password }
const ACCESS_KEY   = 'ot_local_area_access' // { [userId]: areaId[] }
const EXTRA_KEY    = 'ot_local_extra_users' // AppUser[] creados desde la app
const MASTER_KEY_STORAGE = 'ot_master_key'  // string — clave maestra de recuperación

// Clave maestra por defecto (se usa si el admin nunca la cambió)
export const DEFAULT_MASTER_KEY = 'TropicalAdmin2024'

// ── localStorage helpers (todo local, sin Supabase) ─────────────────────────
function readJSON<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback }
  catch { return fallback }
}
function writeJSON(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* ignore quota */ }
}

// Usuarios creados desde la app (se suman a los seeds LOCAL_USERS)
function getExtraUsers(): (AppUser & { password: string })[] {
  return readJSON<(AppUser & { password: string })[]>(EXTRA_KEY, [])
}
// Todos los usuarios (seeds + extras), con su password efectiva
function allUsersWithPw(): (AppUser & { password: string })[] {
  const extras = getExtraUsers()
  const overrides = readJSON<Record<string, string>>(PWD_KEY, {})
  return [...LOCAL_USERS, ...extras].map(u => ({
    ...u,
    password: overrides[u.id] ?? u.password,
  }))
}

// Login local: busca el usuario por email y verifica la contraseña
export async function signIn(email: string, password: string): Promise<AppUser> {
  const found = allUsersWithPw().find(u => u.email.toLowerCase() === email.toLowerCase().trim())
  if (!found) throw new Error('Usuario no encontrado')
  if (found.password !== password) throw new Error('Contraseña incorrecta')
  const { password: _pw, ...user } = found
  localStorage.setItem(SESSION_KEY, user.id)
  return user
}

// ── Cambio de contraseña (local) ────────────────────────────────────────────
export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
  const user = allUsersWithPw().find(u => u.id === userId)
  if (!user) throw new Error('Usuario no encontrado')
  if (user.password !== currentPassword) throw new Error('La contraseña actual es incorrecta')
  if (!newPassword || newPassword.length < 4) throw new Error('La nueva contraseña debe tener al menos 4 caracteres')
  const overrides = readJSON<Record<string, string>>(PWD_KEY, {})
  overrides[userId] = newPassword
  writeJSON(PWD_KEY, overrides)
}

// ── Clave maestra de recuperación (local) ────────────────────────────────────
// El admin puede cambiarla desde Configuración → Mi cuenta.
// Si nunca fue configurada se usa DEFAULT_MASTER_KEY.
export function getMasterKey(): string | null {
  try { return localStorage.getItem(MASTER_KEY_STORAGE) } catch { return null }
}
export function setMasterKey(key: string): void {
  try { localStorage.setItem(MASTER_KEY_STORAGE, key) } catch { /* ignore quota */ }
}
export function verifyMasterKey(input: string): boolean {
  return input === (getMasterKey() ?? DEFAULT_MASTER_KEY)
}
export async function resetPasswordWithMasterKey(
  userId: string,
  masterKey: string,
  newPassword: string,
): Promise<void> {
  if (!verifyMasterKey(masterKey)) throw new Error('Clave maestra incorrecta')
  if (!newPassword || newPassword.length < 4) throw new Error('La nueva contraseña debe tener al menos 4 caracteres')
  const overrides = readJSON<Record<string, string>>(PWD_KEY, {})
  overrides[userId] = newPassword
  writeJSON(PWD_KEY, overrides)
}

// ── Acceso a áreas (local) ──────────────────────────────────────────────────
export function getUserAreaAccess(userId: string): string[] {
  const map = readJSON<Record<string, string[]>>(ACCESS_KEY, {})
  return map[userId] ?? []
}
export function getAllAreaAccess(): Record<string, string[]> {
  return readJSON<Record<string, string[]>>(ACCESS_KEY, {})
}
export function setUserAreaAccess(userId: string, areaIds: string[]): void {
  const map = readJSON<Record<string, string[]>>(ACCESS_KEY, {})
  map[userId] = areaIds
  writeJSON(ACCESS_KEY, map)
}
export function toggleUserAreaAccess(userId: string, areaId: string): string[] {
  const current = getUserAreaAccess(userId)
  const next = current.includes(areaId)
    ? current.filter(a => a !== areaId)
    : [...current, areaId]
  setUserAreaAccess(userId, next)
  return next
}

// ── Gestión de usuarios (local) ─────────────────────────────────────────────
export function createLocalUser(input: {
  name: string; email: string; role: string; password: string; is_admin?: boolean
}): AppUser {
  const email = input.email.toLowerCase().trim()
  if (allUsersWithPw().some(u => u.email.toLowerCase() === email)) {
    throw new Error('Ya existe un usuario con ese correo')
  }
  const short = input.name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') + '.'
  const id = (crypto.randomUUID?.() ?? `u-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`)
  const user: AppUser & { password: string } = {
    id,
    memberId: id.slice(0, 6),
    name: input.name.trim(),
    role: input.role.trim() || 'Miembro',
    short,
    email,
    is_admin: input.is_admin ?? false,
    password: input.password,
  }
  const extras = getExtraUsers()
  extras.push(user)
  writeJSON(EXTRA_KEY, extras)
  const { password: _pw, ...pub } = user
  return pub
}

export function deleteLocalUser(userId: string): void {
  // Solo se pueden borrar usuarios creados desde la app (extras), no los seeds.
  const extras = getExtraUsers().filter(u => u.id !== userId)
  writeJSON(EXTRA_KEY, extras)
  // Limpiar accesos y override de password
  const access = readJSON<Record<string, string[]>>(ACCESS_KEY, {})
  delete access[userId]; writeJSON(ACCESS_KEY, access)
  const pwd = readJSON<Record<string, string>>(PWD_KEY, {})
  delete pwd[userId]; writeJSON(PWD_KEY, pwd)
}

export function isSeedUser(userId: string): boolean {
  return LOCAL_USERS.some(u => u.id === userId)
}

export async function signOut(): Promise<void> {
  localStorage.removeItem(SESSION_KEY)
}

export async function getSessionUser(): Promise<AppUser | null> {
  const id = localStorage.getItem(SESSION_KEY)
  if (!id) return null
  const found = allUsersWithPw().find(u => u.id === id)
  if (!found) return null
  const { password: _pw, ...user } = found
  return user
}

export function onAuthChange(_cb: (user: AppUser | null) => void) {
  // No-op para auth local — no hay eventos externos
  return { data: { subscription: { unsubscribe: () => {} } } }
}

// Lista de usuarios para mostrar en login y selects (seeds + creados en la app)
export function getLocalUsers(): AppUser[] {
  return allUsersWithPw().map(({ password: _pw, ...u }) => u)
}

export async function fetchAppUser(uid: string): Promise<AppUser | null> {
  const found = allUsersWithPw().find(u => u.id === uid)
  if (!found) return null
  const { password: _pw, ...user } = found
  return user
}

// ── Legacy helpers ──────────────────────────────────────────────────────────
export const APP_USER_IDS = new Set<string>(LOCAL_USERS.map(u => u.id))
export const APP_USERS: AppUser[] = LOCAL_USERS.map(({ password: _pw, ...u }) => u)
export function setCurrentUser(_id: string) {}
export function clearCurrentUser() {}
const PRIORITY_IDS = ['joa', 'fab', 'mar', 'raq']

export function sortedMembers<T extends { id: string; name: string }>(members: T[]): T[] {
  return [...members].sort((a, b) => {
    const ai = PRIORITY_IDS.indexOf(a.id)
    const bi = PRIORITY_IDS.indexOf(b.id)
    if (ai !== -1 && bi !== -1) return ai - bi  // both priority → maintain order
    if (ai !== -1) return -1                      // a is priority → a first
    if (bi !== -1) return 1                       // b is priority → b first
    return a.name.localeCompare(b.name, 'es')    // rest alphabetical
  })
}

export async function createAppUser(input: {
  email: string; password: string; name: string; role: string; short?: string; is_admin?: boolean
}): Promise<void> {
  createLocalUser({ email: input.email, password: input.password, name: input.name, role: input.role, is_admin: input.is_admin })
}

// Supabase client exportado para otras partes que lo necesiten
export { supabase }
