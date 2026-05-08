import axios from 'axios'
import { getToken, removeToken } from '@/utils/cookie'

const http = axios.create({
  baseURL: 'http://127.0.0.1:4523/m1/8236440-7997632-default',
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

// 响应拦截器：处理 401
http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      removeToken()
      // 全页跳转，强制清空 Redux 状态
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

export default http
