import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { useAppDispatch } from '@/store/hooks'
import { login } from '@/store/authSlice'
import { getToken, removeToken } from '@/utils/cookie'
import { parseToken, isTokenExpired } from '@/utils/jwt'
import router from '@/router'
import './styles/App.scss'

function App() {
  const dispatch = useAppDispatch()

  // 应用启动时从 Cookie 恢复登录状态
  useEffect(() => {
    const token = getToken()
    if (!token) return

    if (isTokenExpired(token)) {
      removeToken()
      return
    }

    const payload = parseToken(token)
    if (!payload) {
      removeToken()
      return
    }

    dispatch(login({ username: payload.sub, identity: payload.identity }))
  }, [dispatch])

  return (
    <ConfigProvider locale={zhCN}>
      <RouterProvider router={router} />
    </ConfigProvider>
  )
}

export default App
