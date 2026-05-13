import { Form, Input, InputNumber, Select, DatePicker, Upload, Button } from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import type { TaskFieldConfig } from '@/types/production'

export function renderConfigFormField(field: TaskFieldConfig) {
  switch (field.fieldType) {
    case 'number':
      return (
        <Form.Item
          key={field.fieldKey}
          name={field.fieldKey}
          label={field.fieldLabel}
          rules={field.required ? [{ required: true, message: `请输入${field.fieldLabel}` }] : []}
        >
          <InputNumber style={{ width: '100%' }} placeholder={`请输入${field.fieldLabel}`} />
        </Form.Item>
      )
    case 'select':
      return (
        <Form.Item
          key={field.fieldKey}
          name={field.fieldKey}
          label={field.fieldLabel}
          rules={field.required ? [{ required: true, message: `请选择${field.fieldLabel}` }] : []}
        >
          <Select
            placeholder={`请选择${field.fieldLabel}`}
            options={(field.options || []).map((opt) => ({ label: opt, value: opt }))}
          />
        </Form.Item>
      )
    case 'date':
      return (
        <Form.Item
          key={field.fieldKey}
          name={field.fieldKey}
          label={field.fieldLabel}
          rules={field.required ? [{ required: true, message: `请选择${field.fieldLabel}` }] : []}
        >
          <DatePicker style={{ width: '100%' }} placeholder={`请选择${field.fieldLabel}`} />
        </Form.Item>
      )
    case 'file':
      return (
        <Form.Item
          key={field.fieldKey}
          name={field.fieldKey}
          label={field.fieldLabel}
          rules={field.required ? [{ required: true, message: `请上传${field.fieldLabel}` }] : []}
        >
          <Upload beforeUpload={() => false} maxCount={1}>
            <Button icon={<UploadOutlined />}>上传文件</Button>
          </Upload>
        </Form.Item>
      )
    default:
      return (
        <Form.Item
          key={field.fieldKey}
          name={field.fieldKey}
          label={field.fieldLabel}
          rules={field.required ? [{ required: true, message: `请输入${field.fieldLabel}` }] : []}
        >
          <Input.TextArea rows={2} placeholder={`请输入${field.fieldLabel}`} />
        </Form.Item>
      )
  }
}
