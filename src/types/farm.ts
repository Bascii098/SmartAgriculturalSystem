/** 农场 */
export interface Farm {
  id: string
  name: string
  address: string
  longitude: number
  latitude: number
  manager: string
  managerName?: string
  plotCount?: number
  totalArea?: number
  createdAt: number
}

/** 农场表单数据 */
export interface FarmFormData {
  name: string
  address: string
  longitude: number
  latitude: number
  manager: string
}
