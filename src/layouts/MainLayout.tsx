import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Dropdown, Avatar, Space } from 'antd'
import {
  HomeOutlined,
  GlobalOutlined,
  TeamOutlined,
  EnvironmentOutlined,
  ExperimentOutlined,
  UserOutlined,
  LogoutOutlined,
} from '@ant-design/icons'
import type { MenuProps } from 'antd'
import HeaderInfo from '@/components/HeaderInfo'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { logout } from '@/store/authSlice'
import { removeToken, removeIdentity } from '@/utils/cookie'

const { Header, Content } = Layout

const menuItems: MenuProps['items'] = [
  { key: '/', icon: <HomeOutlined />, label: '首页' },
  { key: '/gis', icon: <GlobalOutlined />, label: 'GIS可视化' },
  { key: '/growers', icon: <TeamOutlined />, label: '种植者管理' },
  { key: '/farms', icon: <EnvironmentOutlined />, label: '农场管理' },
  { key: '/production', icon: <ExperimentOutlined />, label: '生产管理' },
]

function MainLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useAppDispatch()
  const username = useAppSelector((state) => state.auth.username)

  const handleMenuClick: MenuProps['onClick'] = (info) => {
    navigate(info.key)
  }

  const handleLogout = () => {
    dispatch(logout())
    removeToken()
    removeIdentity()
    navigate('/login')
  }

  const userMenuItems: MenuProps['items'] = [
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true },
  ]

  const selectedKey = (() => {
    const path = location.pathname
    if (path === '/') return '/'
    const match = (menuItems ?? []).find(
      (item) => item && item.key !== '/' && path.startsWith(item.key as string),
    )
    return match ? (match.key as string) : '/'
  })()

  // GIS 页面需要撑满整个内容区，不加 padding
  const isFullPage = location.pathname === '/gis'

  return (
    <Layout className="main-layout">
      <Header className="main-header">
        <div className="logo">农业平台</div>
        <Menu
          className="main-menu"
          mode="horizontal"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={handleMenuClick}
        />
        <HeaderInfo />
        <Dropdown
          menu={{ items: userMenuItems, onClick: ({ key }) => key === 'logout' && handleLogout() }}
          placement="bottomRight"
          trigger={['click']}
        >
          <Space className="user-dropdown">
            <Avatar size="small" icon={<UserOutlined />} />
            <span>{username}</span>
          </Space>
        </Dropdown>
      </Header>
      <Content className={`main-content${isFullPage ? ' main-content--full' : ''}`}>
        <Outlet />
      </Content>
    </Layout>
  )
}

export default MainLayout
