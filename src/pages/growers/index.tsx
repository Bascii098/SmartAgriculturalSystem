import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Button, Space } from 'antd'
import { EditOutlined, SaveOutlined, KeyOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setEditing } from '@/store/growerSlice'
import ChangePasswordModal from './ChangePasswordModal'

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
  const username = useAppSelector((state) => state.auth.username)
  const [pwdModalOpen, setPwdModalOpen] = useState(false)

  // 根据当前子路径选中菜单项，默认选中 basic-info
  const selectedKey = location.pathname.startsWith('/growers/handover')
    ? '/growers/handover'
    : '/growers/basic-info'

  const isBasicInfo = location.pathname.startsWith('/growers/basic-info')

  const handleMenuClick: MenuProps['onClick'] = (info) => {
    if (isEditing) dispatch(setEditing(false))
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
        />
      </Sider>
      <Content className="growers-content">
        {isBasicInfo && (
          <div className="growers-toolbar">
            <Space>
              <Button
                type="primary"
                icon={isEditing ? <SaveOutlined /> : <EditOutlined />}
                onClick={handleEditToggle}
              >
                {isEditing ? '保存' : '修改'}
              </Button>
              <Button
                icon={<KeyOutlined />}
                onClick={() => setPwdModalOpen(true)}
              >
                修改密码
              </Button>
            </Space>
            {username && (
              <ChangePasswordModal
                open={pwdModalOpen}
                onClose={() => setPwdModalOpen(false)}
                username={username}
              />
            )}
          </div>
        )}
        <Outlet />
      </Content>
    </Layout>
  )
}

export default Growers
