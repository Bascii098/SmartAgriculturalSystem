import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import './styles/App.scss'

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <div className="app">
        <h1>农业平台</h1>
      </div>
    </ConfigProvider>
  )
}

export default App
