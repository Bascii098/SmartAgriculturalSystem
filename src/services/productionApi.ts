import type {
  DisasterWarning,
  ImplementationFarmGroup,
  ImplementationFarmItem,
  ImplementationFarmItemImplemented,
  ImplementationFormData,
  ImplementationRecord,
  PlantingPlan,
  PlanTask,
  TaskConfigGrouped,
  TaskFieldConfig,
} from '@/types/production'
import { request } from './request'

export function getTaskConfigApi() {
  return request<TaskConfigGrouped>('get', '/api/task-config')
}

export function getTaskConfigByStageApi(stage: string) {
  return request<TaskFieldConfig[]>('get', `/api/task-config/${stage}`)
}

export function updateTaskConfigApi(stage: string, fields: TaskFieldConfig[]) {
  return request<null>('put', `/api/task-config/${stage}`, { fields })
}

export function getWeatherWarningsApi() {
  return request<DisasterWarning[]>('get', '/api/weather/warnings')
}

export function getPlansApi(farmId?: string) {
  return request<PlantingPlan[]>('get', '/api/plans', farmId ? { farmId } : undefined)
}

export function getPlanByIdApi(id: number) {
  return request<PlantingPlan>('get', `/api/plans/${id}`)
}

export function createPlanApi(data: Partial<PlantingPlan>) {
  return request<PlantingPlan>('post', '/api/plans', data)
}

export function updatePlanApi(id: number, data: Partial<PlantingPlan>) {
  return request<null>('put', `/api/plans/${id}`, data)
}

export function deletePlanApi(id: number) {
  return request<null>('post', `/api/plans/${id}/delete`)
}

export function getPlanTasksApi(planId: number) {
  return request<PlanTask[]>('get', `/api/plans/${planId}/tasks`)
}

export function updatePlanTaskApi(taskId: number, data: Partial<PlanTask>) {
  return request<null>('put', `/api/tasks/${taskId}`, data)
}

export function getImplementationApi() {
  return request<ImplementationFarmGroup[]>('get', '/api/implementation')
}

export function getImplementationByFarmApi(farmId: string) {
  return request<{
    unimplemented: ImplementationFarmItem[]
    implemented: ImplementationFarmItemImplemented[]
  }>('get', `/api/implementation/${farmId}`)
}

export function submitImplementationApi(data: ImplementationFormData) {
  return request<ImplementationRecord>('post', '/api/implementation/report', data)
}

export function getTasksApi(params?: {
  farmId?: string
  stage?: string
  status?: string
}) {
  return request<PlanTask[]>('get', '/api/tasks', params)
}

export function getTaskByIdApi(taskId: number) {
  return request<PlanTask>('get', `/api/tasks/${taskId}`)
}

export function getImplementationByTaskIdApi(taskId: number) {
  return request<ImplementationRecord | null>(
    'get',
    `/api/tasks/${taskId}/implementation`,
  )
}