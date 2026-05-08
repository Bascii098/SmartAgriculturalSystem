import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Form, Input, InputNumber, Upload, Typography, message, Space } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import type { UploadFile, UploadProps } from 'antd'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { updateBasicInfo, setEditing } from '@/store/growerSlice'

const { Text } = Typography

/** 从 base64 URL 生成 Upload 组件所需的 fileList */
const toFileList = (url: string | undefined): UploadFile[] => {
  if (!url) return []
  return [{ uid: '-1', name: '图片', status: 'done', url }]
}

/**
 * 照片上传字段组件
 *
 * - 非编辑态 + 无图片 → 显示「暂无照片」
 * - 非编辑态 + 有图片 → 显示缩略图，无上传/删除按钮
 * - 编辑态 + 无图片 → 显示上传按钮
 * - 编辑态 + 有图片 → 显示缩略图 + 删除按钮
 */
function UploadField({
  value,
  onChange,
  disabled,
}: {
  value?: string
  onChange?: (value: string) => void
  disabled?: boolean
}) {
  if (disabled && !value) {
    return <Text type="secondary">暂无照片</Text>
  }

  const fileList = toFileList(value)

  const handleBeforeUpload: UploadProps['beforeUpload'] = (file) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      onChange?.(e.target?.result as string)
    }
    reader.readAsDataURL(file)
    return false
  }

  return (
    <Upload
      listType="picture-card"
      maxCount={1}
      fileList={fileList}
      beforeUpload={handleBeforeUpload}
      onRemove={() => onChange?.('')}
      showUploadList={
        disabled
          ? { showPreviewIcon: false, showRemoveIcon: false }
          : undefined
      }
    >
      {!disabled && !value && (
        <div>
          <PlusOutlined />
          <div style={{ marginTop: 8 }}>上传</div>
        </div>
      )}
    </Upload>
  )
}

/** 种植户表单字段（identity === 'grower'） */
function GrowerFields({ disabled }: { disabled: boolean }) {
  return (
    <>
      <Form.Item
        name="username"
        label="用户名"
        rules={[{ required: true, message: '请输入用户名' }]}
      >
        <Input disabled />
      </Form.Item>
      <Form.Item
        name="password"
        label="密码"
        rules={[{ required: true, message: '请输入密码' }]}
      >
        <Input.Password disabled={disabled} />
      </Form.Item>
      <Form.Item
        name="name"
        label="姓名"
        rules={[{ required: true, message: '请输入姓名' }]}
      >
        <Input disabled={disabled} />
      </Form.Item>
      <Form.Item
        name="contactPhone"
        label="联系电话"
        rules={[{ required: true, message: '请输入联系电话' }]}
      >
        <Input disabled={disabled} />
      </Form.Item>
      <Form.Item
        name="contactAddress"
        label="联系地址"
        rules={[{ required: true, message: '请输入联系地址' }]}
      >
        <Input disabled={disabled} />
      </Form.Item>
      <Form.Item
        name="idNumber"
        label="身份证号码"
        rules={[{ required: true, message: '请输入身份证号码' }]}
      >
        <Input disabled={disabled} />
      </Form.Item>
      <Form.Item
        name="yearsOfExperience"
        label="从业年数"
        rules={[{ required: true, message: '请输入从业年数' }]}
      >
        <InputNumber
          min={0}
          disabled={disabled}
          style={{ width: '100%' }}
        />
      </Form.Item>
      <Form.Item
        name="agriculturalPosition"
        label="农业岗位"
        rules={[{ required: true, message: '请输入农业岗位' }]}
      >
        <Input disabled={disabled} />
      </Form.Item>
      <Form.Item
        name="idCardFrontUrl"
        label="身份证正面"
        rules={[{ required: true, message: '请上传身份证正面' }]}
      >
        <UploadField disabled={disabled} />
      </Form.Item>
      <Form.Item
        name="idCardBackUrl"
        label="身份证反面"
        rules={[{ required: true, message: '请上传身份证反面' }]}
      >
        <UploadField disabled={disabled} />
      </Form.Item>
    </>
  )
}

/** 种植合作社表单字段（identity === 'cooperative'） */
function CooperativeFields({ disabled }: { disabled: boolean }) {
  return (
    <>
      <Form.Item
        name="username"
        label="用户名"
        rules={[{ required: true, message: '请输入用户名' }]}
      >
        <Input disabled />
      </Form.Item>
      <Form.Item
        name="password"
        label="密码"
        rules={[{ required: true, message: '请输入密码' }]}
      >
        <Input.Password disabled={disabled} />
      </Form.Item>
      <Form.Item
        name="cooperativeName"
        label="合作社名称"
        rules={[{ required: true, message: '请输入合作社名称' }]}
      >
        <Input disabled={disabled} />
      </Form.Item>
      <Form.Item
        name="contactPerson"
        label="联系人"
        rules={[{ required: true, message: '请输入联系人' }]}
      >
        <Input disabled={disabled} />
      </Form.Item>
      <Form.Item
        name="contactAddress"
        label="联系地址"
        rules={[{ required: true, message: '请输入联系地址' }]}
      >
        <Input disabled={disabled} />
      </Form.Item>
      <Form.Item
        name="contactPhone"
        label="联系电话"
        rules={[{ required: true, message: '请输入联系电话' }]}
      >
        <Input disabled={disabled} />
      </Form.Item>
      <Form.Item
        name="contactIdNumber"
        label="联系人身份证号"
        rules={[{ required: true, message: '请输入联系人身份证号' }]}
      >
        <Input disabled={disabled} />
      </Form.Item>
      <Form.Item
        name="businessLicenseUrl"
        label="营业执照照片"
        rules={[{ required: true, message: '请上传营业执照照片' }]}
      >
        <UploadField disabled={disabled} />
      </Form.Item>
      <Form.Item
        name="idCardFrontUrl"
        label="联系人身份证正面"
        rules={[{ required: true, message: '请上传身份证正面' }]}
      >
        <UploadField disabled={disabled} />
      </Form.Item>
      <Form.Item
        name="idCardBackUrl"
        label="联系人身份证反面"
        rules={[{ required: true, message: '请上传身份证反面' }]}
      >
        <UploadField disabled={disabled} />
      </Form.Item>
    </>
  )
}

function BasicInfo() {
  const dispatch = useAppDispatch()
  const identity = useAppSelector((state) => state.auth.identity)
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn)
  const isEditing = useAppSelector((state) => state.grower.isEditing)
  const basicInfo = useAppSelector((state) => state.grower.basicInfo)

  const [form] = Form.useForm()
  const prevEditingRef = useRef(isEditing)

  // 监听 isEditing 从 true → false 时触发保存
  useEffect(() => {
    if (prevEditingRef.current && !isEditing) {
      form
        .validateFields()
        .then((values) => {
          dispatch(updateBasicInfo(values as Record<string, unknown>))
          message.success('保存成功')
        })
        .catch(() => {
          message.error('请检查表单中的错误')
          dispatch(setEditing(true))
        })
    }
    prevEditingRef.current = isEditing
  }, [isEditing, form, dispatch])

  // 从 Redux 同步数据到表单
  useEffect(() => {
    if (basicInfo) {
      form.setFieldsValue(basicInfo)
    }
  }, [basicInfo, form])

  // 未登录状态
  if (!isLoggedIn || !identity) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Space>
          <Text type="secondary">请先</Text>
          <Link to="/login">登录</Link>
          <Text type="secondary">或</Text>
          <Link to="/register">注册</Link>
          <Text type="secondary">后查看种植者信息</Text>
        </Space>
      </div>
    )
  }

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={basicInfo ?? undefined}
      key={identity}
    >
      {identity === 'grower' ? (
        <GrowerFields disabled={!isEditing} />
      ) : (
        <CooperativeFields disabled={!isEditing} />
      )}
    </Form>
  )
}

export default BasicInfo
