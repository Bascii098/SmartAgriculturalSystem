import type { PlotFeature, PlotFormData } from '@/types/plot'
import { request } from './request'

export function getPlotsApi() {
  return request<PlotFeature[]>('get', '/api/plots')
}

export function getPlotApi(id: string) {
  return request<PlotFeature>('get', `/api/plots/${id}`)
}

export function getFarmPlotsApi(farmId: string) {
  return request<PlotFeature[]>('get', `/api/farms/${farmId}/plots`)
}

export function createPlotApi(farmId: string, data: PlotFormData) {
  return request<{ id: string }>('post', `/api/farms/${farmId}/plots`, data)
}

export function updatePlotApi(id: string, data: Partial<PlotFormData>) {
  return request<null>('put', `/api/plots/${id}`, data)
}

export function deletePlotApi(id: string) {
  return request<null>('post', `/api/plots/${id}/delete`)
}