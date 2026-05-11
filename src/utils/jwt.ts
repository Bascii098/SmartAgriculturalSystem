import type { Identity } from '@/types/grower'

export interface TokenPayload {
  sub: string       // username
  identity: Identity
  iat: number       // issued at (seconds)
  exp: number       // expiration (seconds)
}

// Base64URL 解码
function base64urlDecode(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  while (str.length % 4) str += '='
  return decodeURIComponent(escape(atob(str)))
}

/** 解析 JWT Token，失败返回 null */
export function parseToken(token: string): TokenPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(base64urlDecode(parts[1])) as TokenPayload
    return payload
  } catch {
    return null
  }
}

/** 检查 Token 是否过期 */
export function isTokenExpired(token: string): boolean {
  const payload = parseToken(token)
  if (!payload) return true
  return payload.exp * 1000 < Date.now()
}
