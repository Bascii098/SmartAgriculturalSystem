import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Button } from 'antd'
import { EditOutlined, SaveOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setEditing } from '@/store/growerSlice'

const { Sider, Content } = Layout

const subMenuItems: MenuProps['items'] = [
  { key: '/growers/basic-info', label: '种植者基础信息' },
  { key: '/growers/handover', label: '交接管理' },
]

function Growers() {
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useAppDispatch()
  const isEditing = useAppSelector((state) => state.grower.isEditing)

  // 根据当前子路径选中菜单项，默认选中 basic-info
  const selectedKey = location.pathname.startsWith('/growers/handover')
    ? '/growers/handover'
    : '/growers/basic-info'

  const handleMenuClick: MenuProps['onClick'] = (info) => {
    navigate(info.key)
  }

  const handleEditToggle = () => {
    dispatch(setEditing(!isEditing))
  }

  return (
    <Layout className="growers-layout">
      <Sider width={200} theme="light" className="growers-sider">
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={subMenuItems}
          onClick={handleMenuClick}
          style={{ height: '100%', borderRight: 0 }}
        />
      </Sider>
      <Content className="growers-content">
        <div className="growers-toolbar">
          <Button
            type="primary"
            icon={isEditing ? <SaveOutlined /> : <EditOutlined />}
            onClick={handleEditToggle}
          >
            {isEditing ? '保存' : '修改'}
          </Button>
        </div>
        <Outlet />
      </Content>
    </Layout>
  )
}

export default Growers
