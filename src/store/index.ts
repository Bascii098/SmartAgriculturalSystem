import { configureStore } from '@reduxjs/toolkit'
import authReducer from './authSlice'
import growerReducer from './growerSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    grower: growerReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
