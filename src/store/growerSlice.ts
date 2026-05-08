import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { GrowerFormData } from '@/types/grower'

interface GrowerState {
  basicInfo: GrowerFormData | null
  isEditing: boolean
}

const initialState: GrowerState = {
  basicInfo: null,
  isEditing: false,
}

const growerSlice = createSlice({
  name: 'grower',
  initialState,
  reducers: {
    setBasicInfo(state, action: PayloadAction<GrowerFormData>) {
      state.basicInfo = action.payload
    },
    updateBasicInfo(state, action: PayloadAction<Partial<GrowerFormData>>) {
      if (state.basicInfo) {
        state.basicInfo = { ...state.basicInfo, ...action.payload }
      }
    },
    setEditing(state, action: PayloadAction<boolean>) {
      state.isEditing = action.payload
    },
    clearBasicInfo() {
      return initialState
    },
  },
})

export const { setBasicInfo, updateBasicInfo, setEditing, clearBasicInfo } =
  growerSlice.actions
export default growerSlice.reducer
