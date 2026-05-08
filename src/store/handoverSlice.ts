import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { Plot, HandoverRecord } from '@/types/grower'

interface HandoverState {
  handovers: HandoverRecord[]
  plots: Plot[]
}

// 默认地块名称列表，用于给新用户初始化地块
const DEFAULT_PLOT_NAMES = ['地块一', '地块二', '地块三']

let nextHandoverId = 1
let nextPlotId = 1

const initialState: HandoverState = {
  handovers: [],
  plots: [],
}

const handoverSlice = createSlice({
  name: 'handover',
  initialState,
  reducers: {
    /** 为新用户创建默认地块 */
    initializePlotsForUser(state, action: PayloadAction<string>) {
      const username = action.payload
      const alreadyHasPlots = state.plots.some((p) => p.owner === username)
      if (alreadyHasPlots) return
      for (const name of DEFAULT_PLOT_NAMES) {
        state.plots.push({ id: String(nextPlotId++), name, owner: username })
      }
    },

    /** 发起交接 */
    createHandover(
      state,
      action: PayloadAction<{
        fromUser: string
        toUser: string
        plotId: string
        plotName: string
      }>,
    ) {
      const { fromUser, toUser, plotId, plotName } = action.payload
      state.handovers.push({
        id: String(nextHandoverId++),
        fromUser,
        toUser,
        plotId,
        plotName,
        status: 'pending',
        createdAt: Date.now(),
      })
    },

    /** 确认交接：地块 owner 变更 */
    confirmHandover(state, action: PayloadAction<string>) {
      const hid = action.payload
      const handover = state.handovers.find((h) => h.id === hid)
      if (handover && handover.status === 'pending') {
        handover.status = 'confirmed'
        const plot = state.plots.find((p) => p.id === handover.plotId)
        if (plot) {
          plot.owner = handover.toUser
        }
      }
    },

    /** 拒绝交接 */
    rejectHandover(state, action: PayloadAction<string>) {
      const hid = action.payload
      const handover = state.handovers.find((h) => h.id === hid)
      if (handover && handover.status === 'pending') {
        handover.status = 'rejected'
      }
    },
  },
})

export const {
  initializePlotsForUser,
  createHandover,
  confirmHandover,
  rejectHandover,
} = handoverSlice.actions
export default handoverSlice.reducer
