import { useEffect, useState, useCallback } from 'react'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card,
  Button,
  Descriptions,
  Tabs,
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
} from '@ant-design/icons'
import {
  getPlanByIdApi,
  getPlanTasksApi,
  getTaskConfigByStageApi,
  updatePlanTaskApi,
} from '@/services/api'
import type { PlantingPlan, PlanTask, TaskFieldConfig } from '@/types/production'
import { STATUS_COLOR } from '@/types/production'
import { renderConfigFormField } from '@/components/ConfigFormField'

const STAGES = ['整地', '播种', '施肥', '植保', '收获'] as const

function PlanDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [plan, setPlan] = useState<PlantingPlan | null>(null)
  const [tasks, setTasks] = useState<PlanTask[]>([])
  const [loading, setLoading] = useState(false)

  // 编辑配置 Modal 状态
  const [configModalVisible, setConfigModalVisible] = useState(false)
  const [configFields, setConfigFields] = useState<TaskFieldConfig[]>([])
  const [configLoading, setConfigLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [currentTask, setCurrentTask] = useState<PlanTask | null>(null)
  const [configForm] = Form.useForm()

  const loadPlan = useCallback(async (planId: number) => {
    setLoading(true)
    try {
      const [planData, tasksData] = await Promise.all([
        getPlanByIdApi(planId),
        getPlanTasksApi(planId),
      ])
      setPlan(planData)
      setTasks(tasksData)
    } catch {
      setPlan(null)
      setTasks([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (id) {
      loadPlan(Number(id))
    }
  }, [id, loadPlan])

  // 打开编辑配置 Modal
  const handleOpenConfigModal = async (task: PlanTask) => {
    setCurrentTask(task)
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
    if (!currentTask) return
    try {
      const values = await configForm.validateFields()
      setSubmitting(true)
      const configData: Record<string, unknown> = { ...values }
      configFields.forEach((field) => {
        if (field.fieldType === 'date' && configData[field.fieldKey]) {
          configData[field.fieldKey] = (configData[field.fieldKey] as Dayjs).format('YYYY-MM-DD')
        }
      })
      await updatePlanTaskApi(currentTask.id, { configData })
      message.success('配置保存成功')
      setConfigModalVisible(false)
      // 刷新任务数据
      if (id) {
        const tasksData = await getPlanTasksApi(Number(id))
        setTasks(tasksData)
      }
    } catch {
      // 表单校验失败或API错误
    } finally {
      setSubmitting(false)
    }
  }

  // 标记完成
  const handleMarkComplete = async (task: PlanTask) => {
    try {
      await updatePlanTaskApi(task.id, { status: '已完成' })
      message.success('已标记完成')
      // 刷新数据
      if (id) {
        const tasksData = await getPlanTasksApi(Number(id))
        setTasks(tasksData)
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

  if (!plan) {
    return (
      <div>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/production/plans')}
        >
          返回计划列表
        </Button>
        <Empty description="计划不存在或加载失败" style={{ marginTop: 40 }} />
      </div>
    )
  }

  const tabItems = STAGES.map((stage) => {
    const task = tasks.find((t) => t.stage === stage)
    return {
      key: stage,
      label: (
        <span>
          {stage}
          {task && (
            <Tag color={STATUS_COLOR[task.status] || 'default'} style={{ marginLeft: 4 }}>
              {task.status}
            </Tag>
          )}
        </span>
      ),
      children: task ? (
        <div>
          <Descriptions title={`${stage}环节任务`} bordered column={{ xs: 1, sm: 2, md: 3 }} style={{ marginBottom: 16 }}>
            <Descriptions.Item label="任务状态">
              <Tag color={STATUS_COLOR[task.status] || 'default'}>{task.status}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="计划日期">
              {task.plannedDate || '未设定'}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">{task.createdAt}</Descriptions.Item>
          </Descriptions>

          <Card title="配置数据" style={{ marginBottom: 16 }}>
            {renderConfigData(task.configData)}
          </Card>

          <div style={{ textAlign: 'right' }}>
            <Space>
              {task.status === '待执行' && (
                <Button
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={() => handleOpenConfigModal(task)}
                >
                  编辑配置
                </Button>
              )}
              {(task.status === '待执行' || task.status === '进行中') && (
                <Popconfirm
                  title="确定将该任务标记为已完成？"
                  onConfirm={() => handleMarkComplete(task)}
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
            </Space>
          </div>
        </div>
      ) : (
        <div style={{ padding: '40px 0', textAlign: 'center' }}>
          <Empty description={`${stage}环节 - 暂无任务`} />
        </div>
      ),
    }
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/production/plans')}>
            返回计划列表
          </Button>
          <h2 style={{ margin: 0 }}>计划详情：{plan.planNo}</h2>
        </Space>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Descriptions title="基本信息" bordered column={{ xs: 1, sm: 2, md: 3 }}>
          <Descriptions.Item label="计划编号">{plan.planNo}</Descriptions.Item>
          <Descriptions.Item label="农场">{plan.farmName || '-'}</Descriptions.Item>
          <Descriptions.Item label="地块">{plan.plotName || '-'}</Descriptions.Item>
          <Descriptions.Item label="作物种类">{plan.cropType}</Descriptions.Item>
          <Descriptions.Item label="种子品种">{plan.seedVariety}</Descriptions.Item>
          <Descriptions.Item label="种植面积">{plan.area} 亩</Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color={STATUS_COLOR[plan.status] || 'default'}>{plan.status}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">{plan.createdAt}</Descriptions.Item>
          <Descriptions.Item label="更新时间">{plan.updatedAt}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card>
        <Tabs items={tabItems} />
      </Card>

      {/* 编辑配置 Modal */}
      <Modal
        title={`${currentTask?.stage || ''}环节 - 编辑配置`}
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

export default PlanDetail
