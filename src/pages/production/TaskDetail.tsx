import { useEffect, useState, useCallback } from 'react'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card,
  Button,
  Descriptions,
  Empty,
  Spin,
  Tag,
  Space,
  Modal,
  Form,
  message,
  Popconfirm,
} from 'antd'
import {
  ArrowLeftOutlined,
  EditOutlined,
  CheckCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import {
  getTaskByIdApi,
  getImplementationByTaskIdApi,
  getTaskConfigByStageApi,
  updatePlanTaskApi,
} from '@/services/api'
import type { PlanTask, TaskFieldConfig, ImplementationRecord } from '@/types/production'
import { STATUS_COLOR } from '@/types/production'
import { renderConfigFormField } from '@/components/ConfigFormField'

function TaskDetail() {
  const { taskId } = useParams<{ taskId: string }>()
  const navigate = useNavigate()
  const [task, setTask] = useState<PlanTask | null>(null)
  const [implementation, setImplementation] = useState<ImplementationRecord | null>(null)
  const [loading, setLoading] = useState(false)

  // 编辑配置 Modal 状态
  const [configModalVisible, setConfigModalVisible] = useState(false)
  const [configFields, setConfigFields] = useState<TaskFieldConfig[]>([])
  const [configLoading, setConfigLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [configForm] = Form.useForm()

  const loadData = useCallback(async (id: number) => {
    setLoading(true)
    try {
      const [taskData, implData] = await Promise.all([
        getTaskByIdApi(id),
        getImplementationByTaskIdApi(id),
      ])
      setTask(taskData)
      setImplementation(implData)
    } catch {
      setTask(null)
      setImplementation(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (taskId) {
      loadData(Number(taskId))
    }
  }, [taskId, loadData])

  // 打开编辑配置 Modal
  const handleOpenConfigModal = async () => {
    if (!task) return
    setConfigModalVisible(true)
    setConfigLoading(true)
    try {
      const fields = await getTaskConfigByStageApi(task.stage)
      setConfigFields(fields)
      // 用已有 configData 填充表单
      const initialValues: Record<string, unknown> = {}
      if (task.configData) {
        fields.forEach((field) => {
          if (task.configData && task.configData[field.fieldKey] !== undefined) {
            const raw = task.configData[field.fieldKey]
            initialValues[field.fieldKey] =
              field.fieldType === 'date' && raw ? dayjs(raw as string) : raw
          }
        })
      }
      configForm.setFieldsValue(initialValues)
    } catch {
      setConfigFields([])
      message.error('加载配置字段失败')
    } finally {
      setConfigLoading(false)
    }
  }

  // 提交配置
  const handleSubmitConfig = async () => {
    if (!task) return
    try {
      const values = await configForm.validateFields()
      setSubmitting(true)
      const configData: Record<string, unknown> = { ...values }
      configFields.forEach((field) => {
        if (field.fieldType === 'date' && configData[field.fieldKey]) {
          configData[field.fieldKey] = (configData[field.fieldKey] as Dayjs).format('YYYY-MM-DD')
        }
      })
      await updatePlanTaskApi(task.id, { configData })
      message.success('配置保存成功')
      setConfigModalVisible(false)
      // 刷新任务数据
      if (taskId) {
        const taskData = await getTaskByIdApi(Number(taskId))
        setTask(taskData)
      }
    } catch {
      // 表单校验失败或API错误
    } finally {
      setSubmitting(false)
    }
  }

  // 标记完成
  const handleMarkComplete = async () => {
    if (!task) return
    try {
      await updatePlanTaskApi(task.id, { status: '已完成' })
      message.success('已标记完成')
      // 刷新数据
      if (taskId) {
        const taskData = await getTaskByIdApi(Number(taskId))
        setTask(taskData)
      }
    } catch {
      message.error('操作失败')
    }
  }

  // 标记逾期
  const handleMarkOverdue = async () => {
    if (!task) return
    try {
      await updatePlanTaskApi(task.id, { status: '已逾期' })
      message.success('已标记逾期')
      // 刷新数据
      if (taskId) {
        const taskData = await getTaskByIdApi(Number(taskId))
        setTask(taskData)
      }
    } catch {
      message.error('操作失败')
    }
  }

  // 渲染 configData
  const renderConfigData = (configData: Record<string, unknown> | null) => {
    if (!configData || Object.keys(configData).length === 0) {
      return <Empty description="暂未配置" image={Empty.PRESENTED_IMAGE_SIMPLE} />
    }
    return (
      <Descriptions bordered column={{ xs: 1, sm: 2 }} size="small">
        {Object.entries(configData).map(([key, value]) => (
          <Descriptions.Item key={key} label={key}>
            {value !== null && value !== undefined && value !== '' ? String(value) : '-'}
          </Descriptions.Item>
        ))}
      </Descriptions>
    )
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!task) {
    return (
      <div>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/production/tasks')}
        >
          返回任务列表
        </Button>
        <Empty description="任务不存在或加载失败" style={{ marginTop: 40 }} />
      </div>
    )
  }

  const canMarkComplete = task.status === '待执行' || task.status === '进行中'
  const canMarkOverdue = task.status === '待执行' || task.status === '进行中'

  return (
    <div>
      <div className="page-header">
        <Space>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/production/tasks')}>
            返回任务列表
          </Button>
          <h2 style={{ margin: 0 }}>任务详情</h2>
        </Space>
      </div>

      {/* 基本信息 */}
      <Card style={{ marginBottom: 16 }}>
        <Descriptions title="基本信息" bordered column={{ xs: 1, sm: 2, md: 3 }}>
          <Descriptions.Item label="任务编号">{task.planNo || '-'}</Descriptions.Item>
          <Descriptions.Item label="农场名称">{task.farmName || '-'}</Descriptions.Item>
          <Descriptions.Item label="地块名称">{task.plotName || '-'}</Descriptions.Item>
          <Descriptions.Item label="作物">{task.cropType || '-'}</Descriptions.Item>
          <Descriptions.Item label="农事环节">{task.stage}</Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color={STATUS_COLOR[task.status] || 'default'}>{task.status}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="计划日期">{task.plannedDate || '未设定'}</Descriptions.Item>
          <Descriptions.Item label="创建时间">{task.createdAt}</Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 任务配置 */}
      <Card title="任务配置" style={{ marginBottom: 16 }}>
        {renderConfigData(task.configData)}
      </Card>

      {/* 实施记录 */}
      <Card title="实施记录" style={{ marginBottom: 16 }}>
        {implementation ? (
          <Descriptions bordered column={{ xs: 1, sm: 2 }} size="small">
            <Descriptions.Item label="实施日期">{implementation.implementDate}</Descriptions.Item>
            <Descriptions.Item label="实施方式">{implementation.method || '-'}</Descriptions.Item>
            <Descriptions.Item label="用种">{implementation.seedUsed || '-'}</Descriptions.Item>
            <Descriptions.Item label="投入量">{implementation.inputAmount || '-'}</Descriptions.Item>
            <Descriptions.Item label="设备">{implementation.equipment || '-'}</Descriptions.Item>
            <Descriptions.Item label="备注">{implementation.remark || '-'}</Descriptions.Item>
          </Descriptions>
        ) : (
          <Empty description="暂未实施" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </Card>

      {/* 操作按钮 */}
      <Card>
        <div style={{ textAlign: 'right' }}>
          <Space>
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={handleOpenConfigModal}
            >
              编辑配置
            </Button>
            {canMarkComplete && (
              <Popconfirm
                title="确定将该任务标记为已完成？"
                onConfirm={handleMarkComplete}
                okText="确定"
                cancelText="取消"
              >
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                >
                  标记完成
                </Button>
              </Popconfirm>
            )}
            {canMarkOverdue && (
              <Popconfirm
                title="确定将该任务标记为已逾期？"
                onConfirm={handleMarkOverdue}
                okText="确定"
                cancelText="取消"
              >
                <Button
                  danger
                  icon={<WarningOutlined />}
                >
                  标记逾期
                </Button>
              </Popconfirm>
            )}
          </Space>
        </div>
      </Card>

      {/* 编辑配置 Modal */}
      <Modal
        title={`${task.stage}环节 - 编辑配置`}
        open={configModalVisible}
        onCancel={() => {
          setConfigModalVisible(false)
          configForm.resetFields()
        }}
        onOk={handleSubmitConfig}
        confirmLoading={submitting}
        okText="保存"
        cancelText="取消"
        width={600}
      >
        <Spin spinning={configLoading}>
          {configFields.length === 0 && !configLoading ? (
            <Empty description="该环节暂无配置字段" />
          ) : (
            <Form form={configForm} layout="vertical">
              {configFields
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((field) => renderConfigFormField(field))}
            </Form>
          )}
        </Spin>
      </Modal>
    </div>
  )
}

export default TaskDetail
