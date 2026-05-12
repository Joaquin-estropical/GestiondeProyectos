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

// IDs of app login users — they appear first and highlighted in member lists
export const APP_USER_IDS = new Set(APP_USERS.map(u => u.id))

// Sort a member list so app users come first, then alphabetically
export function sortedMembers<T extends { id: string; name: string }>(members: T[]): T[] {
  return [...members].sort((a, b) => {
    const aApp = APP_USER_IDS.has(a.id)
    const bApp = APP_USER_IDS.has(b.id)
    if (aApp !== bApp) return aApp ? -1 : 1
    return a.name.localeCompare(b.name, 'es')
  })
}

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
