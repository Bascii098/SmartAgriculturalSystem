import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Form, Input, InputNumber, Upload, Image, Typography, message, Space, Tooltip } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import type { UploadFile, UploadProps } from 'antd'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setEditing } from '@/store/growerSlice'
import { getGrowerApi, updateGrowerApi } from '@/services/api'
import type { GrowerFormData } from '@/types/grower'

const { Text } = Typography

/** 从 base64 URL 生成 Upload 组件所需的 fileList */
const toFileList = (url: string | undefined): UploadFile[] => {
  if (!url) return []
  return [{ uid: '-1', name: '图片', status: 'done', url }]
}

/**
 * 文本输入组件 — disabled 时若内容过长显示省略号 + hover tooltip
 */
function TextField({
  value,
  disabled,
  ...rest
}: {
  value?: string
  disabled?: boolean
  [key: string]: unknown
}) {
  const input = <Input {...rest} value={value} disabled={disabled} />
  if (disabled && value && value.length > 12) {
    return (
      <Tooltip title={value} placement="topLeft">
        {input}
      </Tooltip>
    )
  }
  return input
}

/**
 * 照片上传字段组件
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
  const [previewVisible, setPreviewVisible] = useState(false)

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
    <>
      <Upload
        listType="picture-card"
        maxCount={1}
        fileList={fileList}
        beforeUpload={handleBeforeUpload}
        onRemove={() => onChange?.('')}
        onPreview={() => {
          if (value) setPreviewVisible(true)
        }}
        showUploadList={
          disabled
            ? { showPreviewIcon: false, showRemoveIcon: false }
            : undefined
        }
      >
        {!disabled && !value && (
          <div>
            <PlusOutlined />
            <div className="upload-text">上传</div>
          </div>
        )}
      </Upload>
      {value && (
        <Image
          style={{ display: 'none' }}
          src={value}
          preview={{
            visible: previewVisible,
            onVisibleChange: (v) => setPreviewVisible(v),
          }}
        />
      )}
    </>
  )
}

/** 种植户表单字段 */
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
        name="name"
        label="姓名"
        rules={[{ required: true, message: '请输入姓名' }]}
      >
        <TextField disabled={disabled} />
      </Form.Item>
      <Form.Item
        name="contactPhone"
        label="联系电话"
        rules={[{ required: true, message: '请输入联系电话' }]}
      >
        <TextField disabled={disabled} />
      </Form.Item>
      <Form.Item
        name="contactAddress"
        label="联系地址"
        rules={[{ required: true, message: '请输入联系地址' }]}
      >
        <TextField disabled={disabled} />
      </Form.Item>
      <Form.Item
        name="idNumber"
        label="身份证号码"
        rules={[{ required: true, message: '请输入身份证号码' }]}
      >
        <TextField disabled={disabled} />
      </Form.Item>
      <Form.Item
        name="yearsOfExperience"
        label="从业年数"
        rules={[{ required: true, message: '请输入从业年数' }]}
      >
        <InputNumber
          min={0}
          disabled={disabled}
          className="full-width"
        />
      </Form.Item>
      <Form.Item
        name="agriculturalPosition"
        label="农业岗位"
        rules={[{ required: true, message: '请输入农业岗位' }]}
      >
        <TextField disabled={disabled} />
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

/** 种植合作社表单字段 */
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
        name="cooperativeName"
        label="合作社名称"
        rules={[{ required: true, message: '请输入合作社名称' }]}
      >
        <TextField disabled={disabled} />
      </Form.Item>
      <Form.Item
        name="contactPerson"
        label="联系人"
        rules={[{ required: true, message: '请输入联系人' }]}
      >
        <TextField disabled={disabled} />
      </Form.Item>
      <Form.Item
        name="contactAddress"
        label="联系地址"
        rules={[{ required: true, message: '请输入联系地址' }]}
      >
        <TextField disabled={disabled} />
      </Form.Item>
      <Form.Item
        name="contactPhone"
        label="联系电话"
        rules={[{ required: true, message: '请输入联系电话' }]}
      >
        <TextField disabled={disabled} />
      </Form.Item>
      <Form.Item
        name="contactIdNumber"
        label="联系人身份证号"
        rules={[{ required: true, message: '请输入联系人身份证号' }]}
      >
        <TextField disabled={disabled} />
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
  const username = useAppSelector((state) => state.auth.username)
  const isEditing = useAppSelector((state) => state.grower.isEditing)
  const [basicInfo, setBasicInfo] = useState<GrowerFormData | null>(null)

  const [form] = Form.useForm()
  const prevEditingRef = useRef(isEditing)

  // 从 API 获取初始数据
  useEffect(() => {
    if (!isLoggedIn || !username) return
    getGrowerApi(username)
      .then((data) => {
        setBasicInfo(data as unknown as GrowerFormData)
      })
      .catch(() => {})
  }, [isLoggedIn, username])

  // 监听 isEditing 从 true → false 时触发保存
  useEffect(() => {
    if (prevEditingRef.current && !isEditing) {
      form
        .validateFields()
        .then(async (values) => {
          try {
            if (username) {
              await updateGrowerApi(username, values as Record<string, unknown>)
            }
            // 从后端重新拉取，确保数据一致
            if (username) {
              const data = await getGrowerApi(username)
              setBasicInfo(data as unknown as GrowerFormData)
            }
            message.success('保存成功')
          } catch {
            message.error('保存失败')
          }
        })
        .catch(() => {
          message.error('请检查表单中的错误')
          dispatch(setEditing(true))
        })
    }
    prevEditingRef.current = isEditing
  }, [isEditing, form, dispatch, username])

  // 从 Redux 同步数据到表单
  useEffect(() => {
    if (basicInfo) {
      form.setFieldsValue(basicInfo)
    }
  }, [basicInfo, form])

  // 未登录状态
  if (!isLoggedIn || !identity) {
    return (
      <div className="empty-state">
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
    <div className="basic-info-card">
      <div className="basic-info-card__top-bar">
        <span className="basic-info-card__identity">
          {identity === 'grower' ? '种植户' : '种植合作社'}
        </span>
      </div>
      <Form
        form={form}
        layout="vertical"
        className="basic-info-form"
        initialValues={basicInfo ?? undefined}
        key={identity}
      >
        {identity === 'grower' ? (
          <GrowerFields disabled={!isEditing} />
        ) : (
          <CooperativeFields disabled={!isEditing} />
        )}
      </Form>
    </div>
  )
}

export default BasicInfo
