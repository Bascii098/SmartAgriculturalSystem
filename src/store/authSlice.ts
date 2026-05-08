import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { Identity } from '@/types/grower'

interface AuthState {
  isLoggedIn: boolean
  identity: Identity | null
  username: string
}

const initialState: AuthState = {
  isLoggedIn: false,
  identity: null,
  username: '',
}

// 模拟后端数据库：存储注册用户
interface UserRecord {
  password: string
  identity: Identity
}

const userDatabase = new Map<string, UserRecord>()

// 预置一个测试账号
userDatabase.set('admin', { password: 'admin123', identity: 'grower' })

/**
 * 校验用户名密码，成功返回身份类型，失败返回 null
 */
export function checkCredentials(username: string, password: string): Identity | null {
  const record = userDatabase.get(username)
  if (!record || record.password !== password) {
    return null
  }
  return record.identity
}

/**
 * 注册新用户，成功返回 true，用户名已存在返回 false
 */
export function registerUser(username: string, password: string, identity: Identity): boolean {
  if (userDatabase.has(username)) {
    return false
  }
  userDatabase.set(username, { password, identity })
  return true
}

/** 获取所有已注册用户列表 */
export function getAllUsers(): { username: string; identity: Identity }[] {
  const users: { username: string; identity: Identity }[] = []
  userDatabase.forEach((record, username) => {
    users.push({ username, identity: record.identity })
  })
  return users
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    login(
      state,
      action: PayloadAction<{ username: string; identity: Identity }>,
    ) {
      state.isLoggedIn = true
      state.username = action.payload.username
      state.identity = action.payload.identity
    },
    logout() {
      return initialState
    },
  },
})

export const { login, logout } = authSlice.actions
export default authSlice.reducer
