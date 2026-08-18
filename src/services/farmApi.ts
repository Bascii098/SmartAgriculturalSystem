import type { Farm, FarmFormData } from '@/types/farm'
import { request } from './request'

export function getFarmsApi() {
  return request<Farm[]>('get', '/api/farms')
}

export function getFarmApi(id: string) {
  return request<Farm>('get', `/api/farms/${id}`)
}

export function createFarmApi(data: FarmFormData) {
  return request<{ id: string }>('post', '/api/farms', data)
}

export function updateFarmApi(id: string, data: Partial<FarmFormData>) {
  return request<null>('put', `/api/farms/${id}`, data)
}

export function deleteFarmApi(id: string) {
  return request<null>('post', `/api/farms/${id}/delete`)
}