import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Tabs,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Switch,
  Tag,
  Space,
  Popconfirm,
  message,
  Spin,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { getTaskConfigApi, updateTaskConfigApi } from '@/services/api'
import type { TaskFieldConfig, FarmStage } from '@/types/production'

const STAGES: { key: FarmStage; label: string }[] = [
  { key: '整地', label: '整地' },
  { key: '播种', label: '播种' },
  { key: '施肥', label: '施肥' },
  { key: '植保', label: '植保' },
  { key: '收获', label: '收获' },
]

const FIELD_TYPES = [
  { label: '文本', value: 'text' },
  { label: '数字', value: 'number' },
  { label: '下拉选择', value: 'select' },
  { label: '日期', value: 'date' },
  { label: '文件', value: 'file' },
]

const fieldTypeMap: Record<string, string> = {
  text: '文本',
  number: '数字',
  select: '下拉选择',
  date: '日期',
  file: '文件',
}

let tempIdCounter = 0

function OptionsEditor({
  value,
  onChange,
}: {
  value?: string[]
  onChange?: (value: string[]) => void
}) {
  const [input, setInput] = useState('')
  const list = value || []

  const addOption = () => {
    const trimmed = input.trim()
    if (trimmed && !list.includes(trimmed)) {
      onChange?.([...list, trimmed])
      setInput('')
    }
  }

  return (
    <div>
      <Space.Compact style={{ width: '100%' }}>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onPressEnter={addOption}
          placeholder="输入选项后点击加号添加"
        />
        <Button icon={<PlusOutlined />} onClick={addOption} />
      </Space.Compact>
      {list.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <Space wrap>
            {list.map((opt) => (
              <Tag
                key={opt}
                closable
                onClose={() => onChange?.(list.filter((o) => o !== opt))}
              >
                {opt}
              </Tag>
            ))}
          </Space>
        </div>
      )}
    </div>
  )
}

function TaskConfig() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<FarmStage>('整地')
  const [configData, setConfigData] = useState<Record<FarmStage, TaskFieldConfig[]>>({
    '整地': [], '播种': [], '施肥': [], '植保': [], '收获': [],
  })

  const [modalOpen, setModalOpen] = useState(false)
  const [editingField, setEditingField] = useState<TaskFieldConfig | null>(null)
  const [form] = Form.useForm()

  const showSelectOptions = Form.useWatch('fieldType', form) === 'select'

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await getTaskConfigApi()
      setConfigData(data)
    } catch {
      message.error('加载任务配置失败')
    } finally {
      setLoading(false)
    }
  }

  const currentFields = configData[activeTab] || []

  const handleAdd = () => {
    setEditingField(null)
    form.resetFields()
    form.setFieldsValue({ required: false, sortOrder: currentFields.length + 1 })
    setModalOpen(true)
  }

  const handleEdit = (record: TaskFieldConfig) => {
    setEditingField(record)
    form.setFieldsValue({
      fieldKey: record.fieldKey,
      fieldLabel: record.fieldLabel,
      fieldType: record.fieldType,
      options: record.options || [],
      required: record.required,
      sortOrder: record.sortOrder,
    })
    setModalOpen(true)
  }

  const handleDelete = (record: TaskFieldConfig) => {
    const updated = currentFields.filter((f) => f.fieldKey !== record.fieldKey)
    setConfigData({ ...configData, [activeTab]: updated })
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const newField: TaskFieldConfig = {
        id: editingField?.id ?? --tempIdCounter,
        stage: activeTab,
        fieldKey: values.fieldKey,
        fieldLabel: values.fieldLabel,
        fieldType: values.fieldType,
        options: values.fieldType === 'select' && values.options?.length
          ? values.options
          : null,
        required: values.required ?? false,
        sortOrder: values.sortOrder ?? 0,
      }

      let updated: TaskFieldConfig[]
      if (editingField) {
        updated = currentFields.map((f) =>
          f.fieldKey === editingField.fieldKey ? newField : f,
        )
      } else {
        updated = [...currentFields, newField]
      }

      setConfigData({ ...configData, [activeTab]: updated })
      setModalOpen(false)
      message.success(editingField ? '字段已更新（待保存）' : '字段已添加（待保存）')
    } catch {
      // form validation failed
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateTaskConfigApi(activeTab, currentFields)
      message.success(`${activeTab}环节配置已保存`)
    } catch {
      message.error('保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    {
      title: '字段标识',
      dataIndex: 'fieldKey',
      key: 'fieldKey',
      width: 140,
    },
    {
      title: '字段名称',
      dataIndex: 'fieldLabel',
      key: 'fieldLabel',
      width: 140,
    },
    {
      title: '字段类型',
      dataIndex: 'fieldType',
      key: 'fieldType',
      width: 100,
      render: (val: string) => fieldTypeMap[val] || val,
    },
    {
      title: '选项',
      dataIndex: 'options',
      key: 'options',
      width: 200,
      render: (val: string[] | null) =>
        val && val.length > 0
          ? val.map((opt) => <Tag key={opt}>{opt}</Tag>)
          : '-',
    },
    {
      title: '必填',
      dataIndex: 'required',
      key: 'required',
      width: 80,
      render: (val: boolean) => (val ? <Tag color="green">是</Tag> : <Tag>否</Tag>),
    },
    {
      title: '排序',
      dataIndex: 'sortOrder',
      key: 'sortOrder',
      width: 80,
      sorter: (a: TaskFieldConfig, b: TaskFieldConfig) => a.sortOrder - b.sortOrder,
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: TaskFieldConfig) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除该字段配置？"
            onConfirm={() => handleDelete(record)}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const tabItems = STAGES.map((stage) => ({
    key: stage.key,
    label: stage.label,
    children: (
      <Table
        dataSource={configData[stage.key] || []}
        columns={columns}
        rowKey="fieldKey"
        pagination={false}
        size="middle"
        locale={{ emptyText: '暂无字段配置，点击"新增字段"添加' }}
      />
    ),
  }))

  return (
    <div className="task-config-page">
      <div className="task-config-page__header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/production')}>返回</Button>
          <h2 style={{ margin: 0 }}>任务配置管理</h2>
        </div>
        <Space>
          <Button onClick={loadData} loading={loading}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增字段
          </Button>
          <Button type="primary" onClick={handleSave} loading={saving}>
            保存配置
          </Button>
        </Space>
      </div>

      <Spin spinning={loading}>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as FarmStage)}
          items={tabItems}
        />
      </Spin>

      <Modal
        title={editingField ? '编辑字段' : '新增字段'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        okText="确定"
        cancelText="取消"
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="fieldKey"
            label="字段标识"
            rules={[
              { required: true, message: '请输入字段标识' },
              { pattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/, message: '标识只能包含字母、数字和下划线' },
            ]}
          >
            <Input
              placeholder="例如: soilType"
              disabled={!!editingField}
            />
          </Form.Item>
          <Form.Item
            name="fieldLabel"
            label="字段名称"
            rules={[{ required: true, message: '请输入字段名称' }]}
          >
            <Input placeholder="例如: 土壤类型" />
          </Form.Item>
          <Form.Item
            name="fieldType"
            label="字段类型"
            rules={[{ required: true, message: '请选择字段类型' }]}
          >
            <Select placeholder="选择字段类型" options={FIELD_TYPES} />
          </Form.Item>
          {showSelectOptions && (
            <Form.Item
              name="options"
              label="选项"
              rules={[
                {
                  validator: (_, value) =>
                    Array.isArray(value) && value.length > 0
                      ? Promise.resolve()
                      : Promise.reject(new Error('请至少添加一个选项')),
                },
              ]}
            >
              <OptionsEditor />
            </Form.Item>
          )}
          <Form.Item name="required" label="是否必填" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="sortOrder" label="排序">
            <InputNumber min={0} max={999} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default TaskConfig
