import { NavLink, useLocation } from 'react-router-dom'
import { useState } from 'react'
import {
  LayoutDashboard, BookOpen, Building2, MapPin, Users, Package,
  CalendarDays, ClipboardList, BarChart3, GraduationCap, AlertCircle,
  FileText, Wrench, CheckSquare, Shield, ListTodo, AlertTriangle,
  TrendingUp, Settings, HardDrive, ScrollText, ChevronDown, ChevronRight,
  Building, PlusCircle, Target, Layers, Link2, Coffee, ShoppingBag,
  Clock, Star, Briefcase
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useAppStore } from '../../store/app.store'

interface NavGroup {
  label: string
  items: NavItem[]
}

interface NavItem {
  to: string
  icon: React.ElementType
  label: string
  badge?: string
  badgeColor?: string
  highlight?: boolean
}

const navGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    ]
  },
  {
    label: 'UAE Assignment',
    items: [
      { to: '/daily-log', icon: PlusCircle, label: 'Daily Activity Log', highlight: true },
      { to: '/assignment/overview', icon: Target, label: 'Assignment Overview' },
      { to: '/visits', icon: Building, label: 'Institute Visits' },
    ]
  },
  {
    label: 'Master Data',
    items: [
      { to: '/master/institutes', icon: Building2, label: 'Institutes' },
      { to: '/master/locations', icon: MapPin, label: 'Locations / Branches' },
      { to: '/master/departments', icon: Layers, label: 'Departments' },
      { to: '/master/modules', icon: Package, label: 'Modules / Products' },
      { to: '/master/users', icon: Users, label: 'Users & Roles' },
    ]
  },
  {
    label: 'Benchmark Adoption',
    items: [
      { to: '/audits', icon: BarChart3, label: 'Usage Audit' },
      { to: '/audits/adoption', icon: TrendingUp, label: 'Adoption Dashboard' },
    ]
  },
  {
    label: 'Training',
    items: [
      { to: '/training', icon: GraduationCap, label: 'Training Sessions' },
      { to: '/pain-areas', icon: AlertCircle, label: 'Pain Areas' },
    ]
  },
  {
    label: 'Requirements & Issues',
    items: [
      { to: '/issues', icon: AlertTriangle, label: 'Issues' },
      { to: '/requirements', icon: FileText, label: 'Requirements' },
    ]
  },
  {
    label: 'Implementations',
    items: [
      { to: '/implementations', icon: Wrench, label: 'All Implementations' },
      { to: '/implementations/pending', icon: Clock, label: 'Pending Modules' },
    ]
  },
  {
    label: 'Leadership',
    items: [
      { to: '/meetings', icon: Briefcase, label: 'Leadership Meetings' },
    ]
  },
  {
    label: 'Actions & Risks',
    items: [
      { to: '/actions', icon: CheckSquare, label: 'Action Tracker' },
      { to: '/risks', icon: Shield, label: 'Risk Register' },
    ]
  },
  {
    label: 'Reports',
    items: [
      { to: '/reports', icon: ScrollText, label: 'Reports' },
    ]
  },
  {
    label: 'Administration',
    items: [
      { to: '/admin/settings', icon: Settings, label: 'Settings' },
      { to: '/admin/backup', icon: HardDrive, label: 'Backup & Restore' },
      { to: '/admin/audit-logs', icon: ListTodo, label: 'Audit Logs' },
    ]
  },
]

function NavGroupSection({ group, collapsed, defaultOpen = true }: { group: NavGroup; collapsed: boolean; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const location = useLocation()
  const isActive = group.items.some(i => i.to === '/' ? location.pathname === '/' : location.pathname.startsWith(i.to))

  if (collapsed) {
    return (
      <div className="py-1">
        {group.items.map(item => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'}
            className={({ isActive }) => cn('flex items-center justify-center w-10 h-10 mx-auto my-0.5 rounded-lg transition-colors',
              isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white',
              item.highlight && !isActive && 'bg-blue-950 text-blue-400 border border-blue-800'
            )}
            title={item.label}
          >
            <item.icon className="w-5 h-5" />
          </NavLink>
        ))}
      </div>
    )
  }

  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen(!open)}
        className={cn('flex items-center justify-between w-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors',
          isActive ? 'text-slate-200' : 'text-slate-500 hover:text-slate-300'
        )}
      >
        <span>{group.label}</span>
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>

      {open && (
        <div className="space-y-0.5">
          {group.items.map(item => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'}
              className={({ isActive }) => cn(
                'flex items-center gap-2.5 px-3 py-2 mx-2 rounded-md text-sm transition-colors',
                isActive ? 'bg-blue-600 text-white font-medium shadow-sm' :
                  item.highlight ? 'bg-blue-950 text-blue-300 border border-blue-800/60 hover:bg-blue-900 hover:text-blue-100 font-medium' :
                  'text-slate-400 hover:bg-slate-700 hover:text-slate-100'
              )}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{item.label}</span>
              {item.badge && (
                <span className={cn('ml-auto text-xs px-1.5 py-0.5 rounded-full font-medium', item.badgeColor ?? 'bg-red-500 text-white')}>
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useAppStore()

  return (
    <div
      className={cn('fixed top-0 left-0 h-screen flex flex-col bg-slate-900 border-r border-slate-700/50 z-40 transition-all duration-200 shadow-xl',
        sidebarCollapsed ? 'w-16' : 'w-[260px]'
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-slate-700/50 flex-shrink-0">
        {!sidebarCollapsed ? (
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-white font-bold text-sm truncate">CEIM Portal</p>
              <p className="text-slate-400 text-xs truncate">UAE Assignment</p>
            </div>
          </div>
        ) : (
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mx-auto">
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 scrollbar-thin">
        {navGroups.map((group, i) => (
          <NavGroupSection key={i} group={group} collapsed={sidebarCollapsed} defaultOpen={i < 3} />
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="flex items-center justify-center h-10 border-t border-slate-700/50 text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
        title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {sidebarCollapsed
          ? <ChevronRight className="w-4 h-4" />
          : <ChevronDown className="w-4 h-4 -rotate-90" />
        }
      </button>
    </div>
  )
}
