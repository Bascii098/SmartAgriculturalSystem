import type { Identity } from '@/types/grower'
import { request } from './request'

export function loginApi(username: string, password: string) {
  return request<{ token: string; identity: Identity; username: string }>(
    'post',
    '/api/auth/login',
    { username, password },
  )
}

export function registerApi(
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

export function changePasswordApi(
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