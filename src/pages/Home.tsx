import { Typography } from 'antd'

const { Title } = Typography

function Home() {
  return (
    <div>
      <Title level={2}>首页 / Dashboard</Title>
      <p>欢迎使用农业平台管理系统</p>
    </div>
  )
}

export default Home
