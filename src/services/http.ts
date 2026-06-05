import axios from 'axios'
import { message } from 'antd'
import { getToken, removeToken, removeIdentity } from '@/utils/cookie'

const http = axios.create({
  baseURL: 'http://localhost:3001',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

// 请求拦截器：自动附加 Token
http.interceptors.request.use(
  (config) => {
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// 响应拦截器：处理 401 + 全局错误提示
http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      removeToken()
      removeIdentity()
      window.location.href = '/login'
      return Promise.reject(error)
    }
    const msg = error.response?.data?.message || error.message || '请求失败'
    message.error(msg)
    return Promise.reject(error)
  },
)

export default http
