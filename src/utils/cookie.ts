import Cookies from 'js-cookie'

const TOKEN_KEY = 'auth_token'

export function getToken(): string | undefined {
  return Cookies.get(TOKEN_KEY)
}

export function setToken(token: string, expiresInSeconds: number): void {
  // js-cookie 的 expires 接受天数，需要转换
  Cookies.set(TOKEN_KEY, token, { expires: expiresInSeconds / 86400, path: '/' })
}

export function removeToken(): void {
  Cookies.remove(TOKEN_KEY, { path: '/' })
}
