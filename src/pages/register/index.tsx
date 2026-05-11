import { useState } from 'react'
import { Card, Form, Input, Button, Typography, message, Radio } from 'antd'
import { useNavigate } from 'react-router-dom'
import { registerApi } from '@/services/api'
import type { Identity } from '@/types/grower'

const { Title, Text } = Typography

function RegisterPage() {
  const [identity, setIdentity] = useState<Identity>('grower')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleFinish = async (values: { username: string; password: string }) => {
    setLoading(true)
    try {
      await registerApi(values.username, values.password, identity)
      message.success('注册成功，请登录')
      navigate('/login')
    } catch {
      message.error('注册失败，用户名可能已存在')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="register-page">
      <Card>
        <div className="register-page__header">
          <Title level={2} className="register-page__title">农业平台</Title>
          <Text type="secondary">注册</Text>
        </div>

        <Form
          onFinish={handleFinish}
          size="large"
          autoComplete="off"
          className="register-page__form"
        >
          <Form.Item label="身份">
            <Radio.Group
              value={identity}
              onChange={(e) => setIdentity(e.target.value)}
            >
              <Radio value="grower">种植户</Radio>
              <Radio value="cooperative">种植合作社</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="用户名" />
          </Form.Item>

          <Form.Item
            name="password"
            label="密码"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password placeholder="密码" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              注册
            </Button>
          </Form.Item>
        </Form>

        <div className="register-page__footer">
          <Text type="secondary">
            已有账号？
            <Button type="link" onClick={() => navigate('/login')}>
              立即登录
            </Button>
          </Text>
        </div>
      </Card>
    </div>
  )
}

export default RegisterPage
