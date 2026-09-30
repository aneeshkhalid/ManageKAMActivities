import ReactDOM from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import App from './App'
import './styles/globals.css'

// Import web API client — patches window.api when not in Electron
import './lib/api'

// Apply saved theme on startup
const stored = localStorage.getItem('ceim-app')
if (stored) {
  try {
    const state = JSON.parse(stored)
    if (state?.state?.theme === 'dark') {
      document.documentElement.classList.add('dark')
    }
  } catch { /* ignore */ }
}

// Listen for notification updates from main process (Electron only)
if (window.api?.app && window.electron?.ipcRenderer) {
  window.electron?.ipcRenderer?.on?.('notifications:unread-count', (_e: unknown, count: number) => {
    window.dispatchEvent(new CustomEvent('notifications-update', { detail: count }))
  })
}

// Use BrowserRouter in web mode, HashRouter in Electron
const isElectron = typeof window !== 'undefined' && window.electron !== undefined

ReactDOM.createRoot(document.getElementById('root')!).render(
  isElectron ? (
    <HashRouter>
      <App />
    </HashRouter>
  ) : (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  )
)
