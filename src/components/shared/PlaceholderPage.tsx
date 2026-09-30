import { type LucideIcon } from 'lucide-react'
import { cn } from '../../lib/utils'

interface PlaceholderPageProps {
  title: string
  description?: string
  icon?: LucideIcon
  children?: React.ReactNode
}

export default function PlaceholderPage({ title, description, icon: Icon, children }: PlaceholderPageProps) {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{title}</h1>
        {description && <p className="text-slate-500 text-sm mt-1">{description}</p>}
      </div>
      {children}
    </div>
  )
}
