import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '—'
  try { return new Date(date).toLocaleDateString('en-AE', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return date }
}

export function formatDateTime(date: string | null | undefined): string {
  if (!date) return '—'
  try { return new Date(date).toLocaleString('en-AE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }
  catch { return date }
}

export function today(): string {
  return new Date().toISOString().split('T')[0]
}

export function isOverdue(dueDate: string | null | undefined): boolean {
  if (!dueDate) return false
  return dueDate < today()
}

export function ragColor(rag: string | null | undefined): string {
  const map: Record<string, string> = {
    green: 'text-green-700 bg-green-50 border-green-200',
    amber: 'text-amber-700 bg-amber-50 border-amber-200',
    red: 'text-red-700 bg-red-50 border-red-200',
    grey: 'text-gray-500 bg-gray-50 border-gray-200',
  }
  return map[rag ?? 'grey'] ?? map.grey
}

export function ragDot(rag: string | null | undefined): string {
  const map: Record<string, string> = {
    green: 'bg-green-500', amber: 'bg-amber-500', red: 'bg-red-500', grey: 'bg-gray-400',
  }
  return map[rag ?? 'grey'] ?? map.grey
}

export function priorityColor(priority: string | null | undefined): string {
  const map: Record<string, string> = {
    critical: 'bg-red-100 text-red-800 border-red-200',
    high: 'bg-orange-100 text-orange-800 border-orange-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    low: 'bg-blue-100 text-blue-800 border-blue-200',
  }
  return map[priority ?? 'medium'] ?? map.medium
}

export function statusColor(status: string | null | undefined): string {
  const s = (status ?? '').toLowerCase().replace(/[_\s]/g, '-')
  const map: Record<string, string> = {
    open: 'bg-blue-100 text-blue-800',
    'in-progress': 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-700',
    overdue: 'bg-red-100 text-red-800',
    blocked: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-600',
    closed: 'bg-gray-100 text-gray-600',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-800',
    deferred: 'bg-purple-100 text-purple-700',
    released: 'bg-emerald-100 text-emerald-700',
    identified: 'bg-sky-100 text-sky-800',
    documented: 'bg-indigo-100 text-indigo-700',
    'under-review': 'bg-yellow-100 text-yellow-800',
    'estimation-pending': 'bg-orange-100 text-orange-700',
    estimated: 'bg-teal-100 text-teal-700',
    'approval-pending': 'bg-amber-100 text-amber-800',
    'sprint-planned': 'bg-violet-100 text-violet-700',
    development: 'bg-purple-100 text-purple-700',
    qa: 'bg-cyan-100 text-cyan-800',
    uat: 'bg-blue-100 text-blue-800',
    live: 'bg-green-100 text-green-700',
    'not-started': 'bg-gray-100 text-gray-600',
    planning: 'bg-blue-100 text-blue-800',
    'on-hold': 'bg-gray-100 text-gray-600',
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-gray-100 text-gray-500',
    planned: 'bg-blue-100 text-blue-800',
  }
  return map[s] ?? 'bg-gray-100 text-gray-600'
}

export function capitalize(str: string): string {
  return str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export function truncate(str: string, n = 60): string {
  return str.length > n ? str.slice(0, n) + '…' : str
}

export function daysUntil(date: string | null | undefined): number | null {
  if (!date) return null
  const diff = new Date(date).getTime() - new Date(today()).getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function assignmentProgress(startDate: string, endDate: string): number {
  const start = new Date(startDate).getTime()
  const end = new Date(endDate).getTime()
  const now = new Date().getTime()
  if (now <= start) return 0
  if (now >= end) return 100
  return Math.round(((now - start) / (end - start)) * 100)
}
