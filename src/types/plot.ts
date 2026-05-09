/** 地块内的作物信息 */
export interface PlotCrop {
  name: string
  area: number
}

/** 土壤检测结果 */
export interface SoilTestResult {
  unit: string
  date: string
  result: string
}

/** 地块表单数据 */
export interface PlotFormData {
  name: string
  area: number
  coordinates: [number, number][]
  center: [number, number]
  soilType?: string
  plotShape?: string
  landNature?: string
  irrigationFacility?: boolean
  address?: string
  crops?: PlotCrop[]
  planter?: string
  plantingDate?: string
  landCertNumber?: string
  landCertArea?: number
  landCertStart?: string
  landCertEnd?: string
}

/** 地块 */
export interface PlotFeature {
  id: string
  name: string
  area: number
  crops: PlotCrop[]
  address: string
  owner: string
  /** 坐标格式: [lat, lng] */
  coordinates: [number, number][]
  center: [number, number]
  color?: string
  farmId: string
  soilType?: string
  plotShape?: string
  landNature?: string
  irrigationFacility?: boolean
  planter?: string
  planterName?: string
  plantingDate?: string
  landCertNumber?: string
  landCertArea?: number
  landCertStart?: string
  landCertEnd?: string
  soilTest?: SoilTestResult
}
