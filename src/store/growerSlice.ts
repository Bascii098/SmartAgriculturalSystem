import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

interface GrowerState {
  isEditing: boolean
}

const initialState: GrowerState = {
  isEditing: false,
}

const growerSlice = createSlice({
  name: 'grower',
  initialState,
  reducers: {
    setEditing(state, action: PayloadAction<boolean>) {
      state.isEditing = action.payload
    },
  },
})

export const { setEditing } = growerSlice.actions
export default growerSlice.reducer
