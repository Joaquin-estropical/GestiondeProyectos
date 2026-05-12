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
  { id: 'joa', name: 'Joaquin Abastoflor', role: 'Jefe de Proyectos',         short: 'Joaquin A.', email: 'joaquin@tropical.bo'  },
  { id: 'fab', name: 'Fabio Jimenez',      role: 'Coordinador Administrativo', short: 'Fabio J.',   email: 'fabio@tropical.bo'    },
  { id: 'mar', name: 'Marcelo Jaldin',     role: 'Director de Finanzas',       short: 'Marcelo J.', email: 'marcelo@tropical.bo'  },
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
