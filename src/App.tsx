import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useAuthStore } from './store/auth.store'
import AppLayout from './components/layout/AppLayout'
import LoginPage from './pages/Login'
import Dashboard from './pages/Dashboard'
import DailyLog from './pages/DailyLog'
import Institutes from './pages/MasterData/Institutes'
import InstituteDetail from './pages/MasterData/Institutes/detail'
import LocationsPage from './pages/MasterData/Locations'
import DepartmentsPage from './pages/MasterData/Departments'
import ModulesPage from './pages/MasterData/Modules'
import UsersPage from './pages/MasterData/Users'
import VisitsPage from './pages/Visits'
import AuditsPage from './pages/Audits'
import AdoptionDashboard from './pages/Audits/AdoptionDashboard'
import TrainingPage from './pages/Training'
import TrainingDetail from './pages/Training/detail'
import PainAreasPage from './pages/PainAreas'
import IssuesPage from './pages/Issues'
import RequirementsPage from './pages/Requirements'
import RequirementDetail from './pages/Requirements/detail'
import ImplementationsPage from './pages/Implementations'
import ImplementationDetail from './pages/Implementations/detail'
import PendingModulesPage from './pages/Implementations/PendingModules'
import MeetingsPage from './pages/Meetings'
import ActionsPage from './pages/Actions'
import RisksPage from './pages/Risks'
import ReportsPage from './pages/Reports'
import SettingsPage from './pages/Administration/Settings'
import BackupPage from './pages/Administration/BackupRestore'
import AuditLogsPage from './pages/Administration/AuditLogs'
import AssignmentOverview from './pages/Assignment/Overview'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)

  return (
    <>
      <Toaster position="top-right" richColors closeButton duration={4000} />
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="/" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="daily-log" element={<DailyLog />} />
          <Route path="assignment/overview" element={<AssignmentOverview />} />
          <Route path="master/institutes" element={<Institutes />} />
          <Route path="master/institutes/:id" element={<InstituteDetail />} />
          <Route path="master/locations" element={<LocationsPage />} />
          <Route path="master/departments" element={<DepartmentsPage />} />
          <Route path="master/modules" element={<ModulesPage />} />
          <Route path="master/users" element={<UsersPage />} />
          <Route path="visits" element={<VisitsPage />} />
          <Route path="audits" element={<AuditsPage />} />
          <Route path="audits/adoption" element={<AdoptionDashboard />} />
          <Route path="training" element={<TrainingPage />} />
          <Route path="training/:id" element={<TrainingDetail />} />
          <Route path="pain-areas" element={<PainAreasPage />} />
          <Route path="issues" element={<IssuesPage />} />
          <Route path="requirements" element={<RequirementsPage />} />
          <Route path="requirements/:id" element={<RequirementDetail />} />
          <Route path="implementations" element={<ImplementationsPage />} />
          <Route path="implementations/:id" element={<ImplementationDetail />} />
          <Route path="implementations/pending" element={<PendingModulesPage />} />
          <Route path="meetings" element={<MeetingsPage />} />
          <Route path="actions" element={<ActionsPage />} />
          <Route path="risks" element={<RisksPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="admin/settings" element={<SettingsPage />} />
          <Route path="admin/backup" element={<BackupPage />} />
          <Route path="admin/audit-logs" element={<AuditLogsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </>
  )
}
