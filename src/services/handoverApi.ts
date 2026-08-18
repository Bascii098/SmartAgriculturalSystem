import type { HandoverRecord } from '@/types/grower'
import { request } from './request'

export function getHandoversApi() {
  return request<HandoverRecord[]>('get', '/api/handovers')
}

export function createHandoverApi(data: {
  fromUser: string
  toUser: string
  plotId: string
  plotName: string
}) {
  return request<{ id: string }>('post', '/api/handovers', data)
}

export function confirmHandoverApi(id: string) {
  return request<null>('post', `/api/handovers/${id}/confirm`)
}

export function rejectHandoverApi(id: string) {
  return request<null>('post', `/api/handovers/${id}/reject`)
}