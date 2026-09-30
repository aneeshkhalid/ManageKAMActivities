import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron'
import { join } from 'path'
import log from 'electron-log'
import { initDatabase } from './db'
import { registerAllHandlers } from './ipc'
import { startNotificationChecker } from './services/notifications.service'

// ─── Single instance lock ────────────────────────────────────
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
  process.exit(0)
}

log.initialize({ preload: true })
log.info('CEIM Portal starting...')

let mainWindow: BrowserWindow | null = null

// ─── Create Window ────────────────────────────────────────────
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    show: false,
    autoHideMenuBar: true,
    icon: join(__dirname, '../../resources/icon.ico'),
    title: 'CEIM – UAE Client Engagement & Implementation Management Portal',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: false
    }
  })

  // Dev vs Production loading
  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: '/' })
  }

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) return
    mainWindow.show()
    mainWindow.maximize()
    log.info('Main window shown')
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Open external links in system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

// ─── Second instance ─────────────────────────────────────────
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})

// ─── App Ready ────────────────────────────────────────────────
app.whenReady().then(async () => {
  try {
    log.info('Initialising database...')
    await initDatabase()
    log.info('Database initialised successfully')

    log.info('Registering IPC handlers...')
    registerAllHandlers()
    log.info('IPC handlers registered')

    createWindow()

    // Start background notification checker (every 5 minutes)
    startNotificationChecker(() => mainWindow)

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  } catch (error) {
    log.error('Failed to start application:', error)
    dialog.showErrorBox(
      'Startup Error',
      `CEIM Portal failed to start:\n\n${error instanceof Error ? error.message : String(error)}\n\nPlease contact your administrator.`
    )
    app.quit()
  }
})

// ─── Quit ──────────────────────────────────────────────────────
app.on('window-all-closed', () => {
  log.info('All windows closed, quitting...')
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  log.info('Application quitting')
})

// ─── Handle uncaught errors ───────────────────────────────────
process.on('uncaughtException', (error) => {
  log.error('Uncaught exception:', error)
})

process.on('unhandledRejection', (reason) => {
  log.error('Unhandled rejection:', reason)
})
