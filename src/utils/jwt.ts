import type { Identity } from '@/types/grower'

export interface TokenPayload {
  sub: string       // username
  identity: Identity
  iat: number       // issued at (seconds)
  exp: number       // expiration (seconds)
}

const SECRET = 'agriculture-platform-secret-key'
const TOKEN_EXPIRY_SECONDS = 86400 // 24小时

// Base64URL 编码（JWT 标准，替换 +/ 为 -_，去除 =）
function base64urlEncode(str: string): string {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function base64urlDecode(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  while (str.length % 4) str += '='
  return decodeURIComponent(escape(atob(str)))
}

// 简单哈希（mock HMAC-SHA256）
function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0')
}

/** 生成 JWT Token */
export function generateToken(username: string, identity: Identity): string {
  const now = Math.floor(Date.now() / 1000)
  const payload: TokenPayload = {
    sub: username,
    identity,
    iat: now,
    exp: now + TOKEN_EXPIRY_SECONDS,
  }

  const header = base64urlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payloadStr = base64urlEncode(JSON.stringify(payload))
  const signature = simpleHash(`${header}.${payloadStr}.${SECRET}`)

  return `${header}.${payloadStr}.${signature}`
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
