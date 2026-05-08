import { useState } from 'react'
import { Card, Form, Input, Button, Typography, message } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch } from '@/store/hooks'
import { login, checkCredentials } from '@/store/authSlice'

const { Title, Text } = Typography

interface FormValues {
  username: string
  password: string
}

function LoginPage() {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const dispatch = useAppDispatch()

  const handleFinish = (values: FormValues) => {
    setLoading(true)
    try {
      const identity = checkCredentials(values.username, values.password)
      if (identity) {
        dispatch(login({ username: values.username, identity }))
        message.success('登录成功')
        navigate('/growers')
      } else {
        message.error('用户名或密码错误')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <Card>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={2} style={{ marginBottom: 4 }}>农业平台</Title>
          <Text type="secondary">登录</Text>
        </div>
        <Form<FormValues>
          onFinish={handleFinish}
          size="large"
          autoComplete="off"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="用户名" />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              登录
            </Button>
          </Form.Item>
        </Form>
        <div style={{ textAlign: 'center' }}>
          <Text type="secondary">
            还没有账号？
            <Button type="link" onClick={() => navigate('/register')}>
              立即注册
            </Button>
          </Text>
        </div>
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <Text style={{ fontSize: 12, color: '#999' }}>
            测试账号：admin / admin123（种植户）
          </Text>
        </div>
      </Card>
    </div>
  )
}

export default LoginPage
