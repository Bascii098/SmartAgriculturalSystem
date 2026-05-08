import { configureStore } from '@reduxjs/toolkit'
import authReducer from './authSlice'
import growerReducer from './growerSlice'
import handoverReducer from './handoverSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    grower: growerReducer,
    handover: handoverReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
