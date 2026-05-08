import http from './http'
import type { Identity } from '@/types/grower'
import type { PlotFeature } from '@/types/plot'
import type { HandoverRecord } from '@/types/grower'

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
      ? await http.get<ApiResponse<T>>(url)
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
