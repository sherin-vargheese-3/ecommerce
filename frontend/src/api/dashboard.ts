import type { DashboardSummary } from '../types/dashboard'
import { apiFetch } from './client'

export const adminDashboardApi = {
  summary: () => apiFetch<DashboardSummary>('/admin/dashboard/summary'),
}
