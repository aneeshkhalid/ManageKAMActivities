import { registerAuthHandlers } from './auth'
import { registerInstituteHandlers } from './institutes'
import { registerLocationHandlers, registerDepartmentHandlers, registerModuleHandlers } from './master'
import { registerActivityHandlers } from './activities'
import { registerRequirementHandlers } from './requirements'
import { registerDashboardHandlers, registerSettingsHandlers, registerNotificationHandlers, registerAuditLogHandlers } from './dashboard'
import {
  registerUserHandlers,
  registerMiscHandlers,
} from './all-handlers'

export function registerAllHandlers(): void {
  registerAuthHandlers()
  registerInstituteHandlers()
  registerLocationHandlers()
  registerDepartmentHandlers()
  registerModuleHandlers()
  registerActivityHandlers()
  registerRequirementHandlers()
  registerDashboardHandlers()
  registerSettingsHandlers()
  registerNotificationHandlers()
  registerAuditLogHandlers()
  registerUserHandlers()
  registerMiscHandlers()
}
