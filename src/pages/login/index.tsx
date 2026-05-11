import { useState } from 'react'
import { Card, Form, Input, Button, Typography, message } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch } from '@/store/hooks'
import { login } from '@/store/authSlice'
import { setToken, setIdentity } from '@/utils/cookie'
import { loginApi } from '@/services/api'

const { Title, Text } = Typography

interface FormValues {
  username: string
  password: string
}

function LoginPage() {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const dispatch = useAppDispatch()

  const handleFinish = async (values: FormValues) => {
    setLoading(true)
    try {
      const result = await loginApi(values.username, values.password)
      setToken(result.token, 86400) // 24小时
      setIdentity(result.identity, 86400)
      dispatch(login({ username: result.username, identity: result.identity }))
      message.success('登录成功')
      navigate('/')
    } catch {
      message.error('用户名或密码错误')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <Card>
        <div className="login-page__header">
          <Title level={2} className="login-page__title">农业平台</Title>
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
        <div className="login-page__footer">
          <Text type="secondary">
            还没有账号？
            <Button type="link" onClick={() => navigate('/register')}>
              立即注册
            </Button>
          </Text>
        </div>
        <div className="login-page__test-hint">
          <Text>
            测试账号：admin / admin123（种植户）
          </Text>
        </div>
      </Card>
    </div>
  )
}

export default LoginPage
