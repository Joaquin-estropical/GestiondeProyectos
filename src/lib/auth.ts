// Simple localStorage-based user session for 3 fixed users.
// No passwords — just user selection persisted across reloads.

export interface AppUser {
  id:    string
  name:  string
  role:  string
  short: string
  email: string
}

export const APP_USERS: AppUser[] = [
  { id: 'joa', name: 'Joaquín Rivera',  role: 'Director Operaciones', short: 'Joaquín R.', email: 'joaquin@tropical.cl'  },
  { id: 'and', name: 'Andrea Mendoza',  role: 'Ops Manager',          short: 'Andrea M.',  email: 'andrea@tropical.cl'   },
  { id: 'car', name: 'Carlos Rojas',    role: 'Maintenance',          short: 'Carlos R.',  email: 'carlos@tropical.cl'   },
]

const KEY = 'ot_current_user'

export function getCurrentUser(): AppUser {
  const saved = localStorage.getItem(KEY)
  if (saved) {
    const found = APP_USERS.find(u => u.id === saved)
    if (found) return found
  }
  return APP_USERS[0]
}

export function setCurrentUser(id: string) {
  localStorage.setItem(KEY, id)
}

export function clearCurrentUser() {
  localStorage.removeItem(KEY)
}
