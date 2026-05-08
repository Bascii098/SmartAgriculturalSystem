/** 地块内的作物信息 */
export interface PlotCrop {
  name: string      // 作物名称
  area: number      // 种植面积（亩）
}

/** 用户自定义地块 */
export interface PlotFeature {
  id: string
  name: string
  area: number             // 总面积（亩）
  crops: PlotCrop[]        // 主要作物
  address: string          // 地址描述
  owner: string            // 所属种植户
  coordinates: [number, number][]  // 多边形边界（GCJ-02，用户自定义划分）
  center: [number, number]         // 中心点，用于地图 flyTo
  color?: string            // 展示颜色
}
