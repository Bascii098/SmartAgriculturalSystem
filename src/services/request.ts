import http from './http'

export interface ApiResponse<T> {
  code: number
  data: T
  message: string
}

export async function request<T>(
  method: 'get' | 'post' | 'put',
  url: string,
  body?: unknown,
): Promise<T> {
  const response =
    method === 'get'
      ? await http.get<ApiResponse<T>>(url, { params: body })
      : method === 'post'
        ? await http.post<ApiResponse<T>>(url, body)
        : await http.put<ApiResponse<T>>(url, body)

  if (response.data.code !== 0) {
    throw new Error(response.data.message || '请求失败')
  }

  return response.data.data
}