import Cookies from 'js-cookie'

const TOKEN_KEY = 'auth_token'

export function getToken(): string | undefined {
  return Cookies.get(TOKEN_KEY)
}

export function setToken(token: string, expiresInSeconds: number): void {
  // js-cookie 的 expires 接受天数，需要转换
  Cookies.set(TOKEN_KEY, token, { expires: expiresInSeconds / 86400, path: '/', sameSite: 'strict' })
}

export function removeToken(): void {
  Cookies.remove(TOKEN_KEY, { path: '/' })
}

const IDENTITY_KEY = 'auth_identity'

export function getIdentity(): string | undefined {
  return Cookies.get(IDENTITY_KEY)
}

export function setIdentity(identity: string, expiresInSeconds: number): void {
  Cookies.set(IDENTITY_KEY, identity, { expires: expiresInSeconds / 86400, path: '/', sameSite: 'strict' })
}

export function removeIdentity(): void {
  Cookies.remove(IDENTITY_KEY, { path: '/' })
}
