// 农事环节
export type FarmStage = '整地' | '播种' | '施肥' | '植保' | '收获'

// 任务状态
export type TaskStatus = '待执行' | '进行中' | '已完成' | '已逾期'

// 任务字段配置（后台自定义）
export interface TaskFieldConfig {
  id: number
  stage: FarmStage
  fieldKey: string
  fieldLabel: string
  fieldType: 'text' | 'number' | 'select' | 'date' | 'file'
  options: string[] | null
  required: boolean
  sortOrder: number
}

// 按环节分组的配置
export type TaskConfigGrouped = Record<FarmStage, TaskFieldConfig[]>

// 种植计划
export interface PlantingPlan {
  id: number
  planNo: string
  farmId: string
  plotId: string
  cropType: string
  seedVariety: string
  area: number
  status: TaskStatus
  createdAt: string
  updatedAt: string
  // 关联字段（列表查询时join返回）
  farmName?: string
  plotName?: string
}

// 计划任务
export interface PlanTask {
  id: number
  planId: number
  stage: FarmStage
  configData: Record<string, any> | null
  plannedDate: string | null
  status: TaskStatus
  createdAt: string
  updatedAt: string
  // 关联字段（任务列表/详情查询时join返回）
  planNo?: string
  cropType?: string
  seedVariety?: string
  farmId?: string
  plotId?: string
  farmName?: string
  plotName?: string
}

// 实施记录
export interface ImplementationRecord {
  id: number
  taskId: number
  plotId: string
  implementDate: string
  method: string
  seedUsed: string
  inputAmount: string
  equipment: string
  remark: string
  geoMarker: any | null
  createdAt: string
}

// 实施上报表单数据
export interface ImplementationFormData {
  taskId: number
  plotId: string
  implementDate: string
  method: string
  seedUsed: string
  inputAmount: string
  equipment: string
  remark: string
}

// 扩展气象数据
export interface WeatherExtended {
  recordDate: string
  temperature: number
  temperatureHigh: number
  temperatureLow: number
  condition: string
  humidity: number
  windSpeed: string
  rainfall: number
  sunshineHours: number
  soilMoisture: number
}

// 灾害预警
export interface DisasterWarning {
  id: number
  warningType: string
  warningLevel: '蓝色' | '黄色' | '橙色' | '红色'
  description: string
  startTime: string
  endTime: string
  status: '生效中' | '已解除'
}

// 种植计划列表（按农场分组）
export interface PlanFarmGroup {
  farmId: string
  farmName: string
  region: string
  totalPlots: number
  plannedCount: number
  unplannedCount: number
  totalArea: number
}

// 实施总览（按农场分组）
export interface ImplementationFarmGroup {
  farmId: string
  farmName: string
  todayTasks: number
  implemented: number
  unimplemented: number
}

// 任务状态对应颜色
export const STATUS_COLOR: Record<string, string> = {
  '待执行': 'blue',
  '进行中': 'orange',
  '已完成': 'green',
  '已逾期': 'red',
}
