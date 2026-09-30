// In-memory session management (no JWT needed for local desktop app)

interface SessionUser {
  id: number
  username: string
  fullName: string
  email: string | null
  role: 'admin' | 'portfolio_manager' | 'management' | 'user'
  status: 'active' | 'inactive'
  createdAt: string
  updatedAt: string
}

let currentUser: SessionUser | null = null

export function setCurrentSession(user: SessionUser | null): void {
  currentUser = user
}

export function getCurrentSession(): SessionUser | null {
  return currentUser
}

export function requireAuth(): SessionUser {
  if (!currentUser) throw new Error('Not authenticated')
  return currentUser
}

export function requireRole(role: string): SessionUser {
  const user = requireAuth()
  const hierarchy = ['user', 'management', 'portfolio_manager', 'admin']
  if (hierarchy.indexOf(user.role) < hierarchy.indexOf(role)) {
    throw new Error('Insufficient permissions')
  }
  return user
}
