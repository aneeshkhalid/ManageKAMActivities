import { Outlet } from 'react-router-dom'
import { Toaster } from 'sonner'
import Sidebar from './Sidebar'
import Header from './Header'
import { useAppStore } from '../../store/app.store'
import { useEffect } from 'react'

export default function AppLayout() {
  const { sidebarCollapsed, theme } = useAppStore()

  // Apply theme class on mount
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div
        className="flex flex-col flex-1 min-w-0 transition-all duration-200"
        style={{ marginLeft: sidebarCollapsed ? '64px' : '260px' }}
      >
        <Header />
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 scrollbar-thin">
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
