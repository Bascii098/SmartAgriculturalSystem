import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { ConfigProvider, App as AntApp } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { useAppDispatch } from '@/store/hooks'
import { login } from '@/store/authSlice'
import { getToken, getIdentity, removeToken, removeIdentity } from '@/utils/cookie'
import { parseToken, isTokenExpired } from '@/utils/jwt'
import router from '@/router'
import './styles/global.scss'
import './styles/App.scss'

const themeConfig = {
  token: {
    colorPrimary: '#4caf50',
    colorSuccess: '#4caf50',
    colorWarning: '#ff9800',
    colorError: '#e53935',
    colorInfo: '#29b6f6',
    borderRadius: 8,
    colorBgContainer: '#ffffff',
    colorBgLayout: '#f5f7f0',
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif",
  },
}

function App() {
  const dispatch = useAppDispatch()

  useEffect(() => {
    const token = getToken()
    const identity = getIdentity()
    if (!token || !identity) {
      if (token) removeToken()
      if (identity) removeIdentity()
      return
    }

    if (isTokenExpired(token)) {
      removeToken()
      removeIdentity()
      return
    }

    const payload = parseToken(token)
    if (!payload) {
      removeToken()
      removeIdentity()
      return
    }

    dispatch(login({ username: payload.sub, identity: identity as 'grower' | 'cooperative' }))
  }, [dispatch])

  return (
    <ConfigProvider theme={themeConfig} locale={zhCN}>
      <AntApp>
        <RouterProvider router={router} />
      </AntApp>
    </ConfigProvider>
  )
}

export default App
