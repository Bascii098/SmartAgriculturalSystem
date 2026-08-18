import type { Identity } from '@/types/grower'
import { request } from './request'

export function getGrowersApi() {
  return request<{ username: string; identity: Identity }[]>('get', '/api/growers')
}

export function getGrowerApi(username: string) {
  return request<Record<string, unknown>>('get', `/api/growers/${username}`)
}

export function updateGrowerApi(
  username: string,
  data: Record<string, unknown>,
) {
  return request<null>('put', `/api/growers/${username}`, data)
}