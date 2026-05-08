import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu } from 'antd'
import {
  GlobalOutlined,
  TeamOutlined,
  EnvironmentOutlined,
  ExperimentOutlined,
} from '@ant-design/icons'
import type { MenuProps } from 'antd'
import HeaderInfo from '@/components/HeaderInfo'

const { Header, Content } = Layout

const menuItems: MenuProps['items'] = [
  { key: '/', icon: <GlobalOutlined />, label: 'GIS可视化' },
  { key: '/growers', icon: <TeamOutlined />, label: '种植者管理' },
  { key: '/farms', icon: <EnvironmentOutlined />, label: '农场管理' },
  { key: '/production', icon: <ExperimentOutlined />, label: '生产管理' },
]

function MainLayout() {
  const navigate = useNavigate()
  const location = useLocation()

  const handleMenuClick: MenuProps['onClick'] = (info) => {
    navigate(info.key)
  }

  return (
    <Layout className="main-layout">
      <Header className="main-header">
        <div className="logo">农业平台</div>
        <Menu
          className="main-menu"
          theme="dark"
          mode="horizontal"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
        />
        <HeaderInfo />
      </Header>
      <Content className="main-content">
        <Outlet />
      </Content>
    </Layout>
  )
}

export default MainLayout
