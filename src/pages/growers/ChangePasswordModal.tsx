import { Form, Input, Modal, message } from 'antd'
import { changePasswordApi } from '@/services/api'

interface Props {
  open: boolean
  onClose: () => void
  username: string
}

function ChangePasswordModal({ open, onClose, username }: Props) {
  const [form] = Form.useForm()

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      await changePasswordApi(username, values.oldPassword, values.newPassword)
      message.success('密码修改成功')
      form.resetFields()
      onClose()
    } catch (e) {
      message.error((e as Error).message || '密码修改失败')
    }
  }

  return (
    <Modal
      title="修改密码"
      open={open}
      onOk={handleOk}
      onCancel={() => {
        form.resetFields()
        onClose()
      }}
      okText="确认修改"
      cancelText="取消"
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="oldPassword"
          label="旧密码"
          rules={[{ required: true, message: '请输入旧密码' }]}
        >
          <Input.Password />
        </Form.Item>
        <Form.Item
          name="newPassword"
          label="新密码"
          rules={[
            { required: true, message: '请输入新密码' },
            { min: 4, message: '密码至少4个字符' },
          ]}
        >
          <Input.Password />
        </Form.Item>
        <Form.Item
          name="confirmPassword"
          label="确认新密码"
          dependencies={['newPassword']}
          rules={[
            { required: true, message: '请确认新密码' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) {
                  return Promise.resolve()
                }
                return Promise.reject(new Error('两次输入的密码不一致'))
              },
            }),
          ]}
        >
          <Input.Password />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default ChangePasswordModal
