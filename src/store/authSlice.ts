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
