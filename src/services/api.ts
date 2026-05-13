import http from './http'
import type { Identity } from '@/types/grower'
import type { PlotFeature, PlotFormData } from '@/types/plot'
import type { HandoverRecord } from '@/types/grower'
import type { Farm, FarmFormData } from '@/types/farm'
import type {
  TaskConfigGrouped,
  TaskFieldConfig,
  WeatherExtended,
  DisasterWarning,
  PlantingPlan,
  PlanTask,
  ImplementationFormData,
  ImplementationRecord,
  ImplementationFarmGroup,
} from '@/types/production'

// 通用响应格式
interface ApiResponse<T> {
  code: number
  data: T
  message: string
}

/** 抽取 data，code !== 0 时抛错 */
async function request<T>(
  method: 'get' | 'post' | 'put',
  url: string,
  body?: unknown,
): Promise<T> {
  const res =
    method === 'get'
      ? await http.get<ApiResponse<T>>(url, { params: body })
      : method === 'post'
        ? await http.post<ApiResponse<T>>(url, body)
        : await http.put<ApiResponse<T>>(url, body)
  if (res.data.code !== 0) {
    throw new Error(res.data.message || '请求失败')
  }
  return res.data.data
}

// ===== Auth =====
export async function loginApi(username: string, password: string) {
  return request<{ token: string; identity: Identity; username: string }>(
    'post',
    '/api/auth/login',
    { username, password },
  )
}

export async function registerApi(
  username: string,
  password: string,
  identity: Identity,
) {
  return request<{ username: string; identity: Identity }>(
    'post',
    '/api/auth/register',
    { username, password, identity },
  )
}

// ===== Change Password =====
export async function changePasswordApi(
  username: string,
  oldPassword: string,
  newPassword: string,
) {
  return request<null>('put', '/api/auth/password', {
    username,
    oldPassword,
    newPassword,
  })
}

// ===== Growers =====
export async function getGrowersApi() {
  return request<{ username: string; identity: Identity }[]>('get', '/api/growers')
}

export async function getGrowerApi(username: string) {
  return request<Record<string, unknown>>('get', `/api/growers/${username}`)
}

export async function updateGrowerApi(
  username: string,
  data: Record<string, unknown>,
) {
  return request<null>('put', `/api/growers/${username}`, data)
}

// ===== Plots =====
export async function getPlotsApi() {
  return request<PlotFeature[]>('get', '/api/plots')
}

export async function getPlotApi(id: string) {
  return request<PlotFeature>('get', `/api/plots/${id}`)
}

// ===== Handovers =====
export async function getHandoversApi() {
  return request<HandoverRecord[]>('get', '/api/handovers')
}

export async function createHandoverApi(data: {
  fromUser: string
  toUser: string
  plotId: string
  plotName: string
}) {
  return request<{ id: string }>('post', '/api/handovers', data)
}

export async function confirmHandoverApi(id: string) {
  return request<null>('post', `/api/handovers/${id}/confirm`)
}

export async function rejectHandoverApi(id: string) {
  return request<null>('post', `/api/handovers/${id}/reject`)
}

// ===== Weather =====
export interface WeatherData {
  temperature: number
  condition: string
  humidity: number
  windSpeed: string
}

export async function getWeatherApi() {
  return request<WeatherData>('get', '/api/weather')
}

// ===== Farms =====
export async function getFarmsApi() {
  return request<Farm[]>('get', '/api/farms')
}

export async function getFarmApi(id: string) {
  return request<Farm>('get', `/api/farms/${id}`)
}

export async function createFarmApi(data: FarmFormData) {
  return request<{ id: string }>('post', '/api/farms', data)
}

export async function updateFarmApi(id: string, data: Partial<FarmFormData>) {
  return request<null>('put', `/api/farms/${id}`, data)
}

export async function deleteFarmApi(id: string) {
  return request<null>('post', `/api/farms/${id}/delete`)
}

// ===== Farm Plots =====
export async function getFarmPlotsApi(farmId: string) {
  return request<PlotFeature[]>('get', `/api/farms/${farmId}/plots`)
}

export async function createPlotApi(farmId: string, data: PlotFormData) {
  return request<{ id: string }>('post', `/api/farms/${farmId}/plots`, data)
}

export async function updatePlotApi(id: string, data: Partial<PlotFormData>) {
  return request<null>('put', `/api/plots/${id}`, data)
}

export async function deletePlotApi(id: string) {
  return request<null>('post', `/api/plots/${id}/delete`)
}

// ==================== Production ====================

// 任务配置
export const getTaskConfigApi = () => request<TaskConfigGrouped>('get', '/api/task-config')
export const getTaskConfigByStageApi = (stage: string) => request<TaskFieldConfig[]>('get', `/api/task-config/${stage}`)
export const updateTaskConfigApi = (stage: string, fields: TaskFieldConfig[]) => request<null>('put', `/api/task-config/${stage}`, { fields })

// 天气扩展
export const getWeatherExtendedApi = () => request<{ weather: WeatherExtended; warnings: DisasterWarning[] }>('get', '/api/weather/extended')
export const getWeatherWarningsApi = () => request<DisasterWarning[]>('get', '/api/weather/warnings')

// 种植计划（CRUD）
export const getPlansApi = (farmId?: string) => request<PlantingPlan[]>('get', '/api/plans', farmId ? { farmId } : undefined)
export const getPlanByIdApi = (id: number) => request<PlantingPlan>('get', `/api/plans/${id}`)
export const createPlanApi = (data: Partial<PlantingPlan>) => request<PlantingPlan>('post', '/api/plans', data)
export const updatePlanApi = (id: number, data: Partial<PlantingPlan>) => request<null>('put', `/api/plans/${id}`, data)
export const deletePlanApi = (id: number) => request<null>('post', `/api/plans/${id}/delete`)

// 计划任务
export const getPlanTasksApi = (planId: number) => request<PlanTask[]>('get', `/api/plans/${planId}/tasks`)
export const updatePlanTaskApi = (taskId: number, data: Partial<PlanTask>) => request<null>('put', `/api/tasks/${taskId}`, data)

// 实施记录
export const getImplementationApi = () => request<ImplementationFarmGroup[]>('get', '/api/implementation')
export const getImplementationByFarmApi = (farmId: string) => request<any>('get', `/api/implementation/${farmId}`)
export const submitImplementationApi = (data: ImplementationFormData) => request<ImplementationRecord>('post', '/api/implementation/report', data)

// 任务管理
export const getTasksApi = (params?: { farmId?: string; stage?: string; status?: string }) => request<PlanTask[]>('get', '/api/tasks', params)
export const getTaskByIdApi = (taskId: number) => request<PlanTask>('get', `/api/tasks/${taskId}`)
export const getImplementationByTaskIdApi = (taskId: number) => request<ImplementationRecord | null>('get', `/api/tasks/${taskId}/implementation`)
