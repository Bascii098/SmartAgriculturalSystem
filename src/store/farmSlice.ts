import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import type { Farm, FarmFormData } from '@/types/farm'
import type { PlotFeature, PlotFormData } from '@/types/plot'
import {
  getFarmsApi,
  getFarmApi,
  createFarmApi,
  updateFarmApi,
  deleteFarmApi,
  getFarmPlotsApi,
  createPlotApi,
  updatePlotApi,
  deletePlotApi,
} from '@/services/api'

interface FarmState {
  farms: Farm[]
  currentFarm: Farm | null
  plots: PlotFeature[]
  loading: boolean
  plotsLoading: boolean
}

const initialState: FarmState = {
  farms: [],
  currentFarm: null,
  plots: [],
  loading: false,
  plotsLoading: false,
}

// ===== 农场 async thunks =====

export const fetchFarms = createAsyncThunk('farm/fetchFarms', async () => {
  return await getFarmsApi()
})

export const fetchFarm = createAsyncThunk('farm/fetchFarm', async (id: string) => {
  return await getFarmApi(id)
})

export const addFarm = createAsyncThunk('farm/addFarm', async (data: FarmFormData) => {
  await createFarmApi(data)
})

export const editFarm = createAsyncThunk(
  'farm/editFarm',
  async ({ id, data }: { id: string; data: Partial<FarmFormData> }) => {
    await updateFarmApi(id, data)
  },
)

export const removeFarm = createAsyncThunk('farm/removeFarm', async (id: string) => {
  await deleteFarmApi(id)
})

// ===== 地块 async thunks =====

export const fetchFarmPlots = createAsyncThunk(
  'farm/fetchFarmPlots',
  async (farmId: string) => {
    return await getFarmPlotsApi(farmId)
  },
)

export const addPlot = createAsyncThunk(
  'farm/addPlot',
  async ({ farmId, data }: { farmId: string; data: PlotFormData }) => {
    await createPlotApi(farmId, data)
  },
)

export const editPlot = createAsyncThunk(
  'farm/editPlot',
  async ({ id, data }: { id: string; data: Partial<PlotFormData> }) => {
    await updatePlotApi(id, data)
  },
)

export const removePlot = createAsyncThunk('farm/removePlot', async (id: string) => {
  await deletePlotApi(id)
})

const farmSlice = createSlice({
  name: 'farm',
  initialState,
  reducers: {
    clearCurrentFarm(state) {
      state.currentFarm = null
      state.plots = []
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchFarms
      .addCase(fetchFarms.pending, (state) => {
        state.loading = true
      })
      .addCase(fetchFarms.fulfilled, (state, action: PayloadAction<Farm[]>) => {
        state.farms = action.payload
        state.loading = false
      })
      .addCase(fetchFarms.rejected, (state) => {
        state.loading = false
      })
      // fetchFarm
      .addCase(fetchFarm.fulfilled, (state, action: PayloadAction<Farm>) => {
        state.currentFarm = action.payload
      })
      // fetchFarmPlots
      .addCase(fetchFarmPlots.pending, (state) => {
        state.plotsLoading = true
      })
      .addCase(fetchFarmPlots.fulfilled, (state, action: PayloadAction<PlotFeature[]>) => {
        state.plots = action.payload
        state.plotsLoading = false
      })
      .addCase(fetchFarmPlots.rejected, (state) => {
        state.plotsLoading = false
      })
  },
})

export const { clearCurrentFarm } = farmSlice.actions
export default farmSlice.reducer
