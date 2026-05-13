import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  Table,
  Tag,
  Select,
  Empty,
  Spin,
  Space,
  Button,
} from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { getTasksApi, getFarmsApi } from '@/services/api'
import type { PlanTask } from '@/types/production'
import { STATUS_COLOR } from '@/types/production'
import type { Farm } from '@/types/farm'

const STAGE_COLOR: Record<string, string> = {
  '整地': 'default',
  '播种': 'green',
  '施肥': 'gold',
  '植保': 'purple',
  '收获': 'orange',
}

const STAGE_OPTIONS = ['整地', '播种', '施肥', '植保', '收获']
const STATUS_OPTIONS = ['待执行', '进行中', '已完成', '已逾期']

function TaskList() {
  const navigate = useNavigate()
  const [tasks, setTasks] = useState<PlanTask[]>([])
  const [loading, setLoading] = useState(false)
  const [farms, setFarms] = useState<Farm[]>([])
  const [farmFilter, setFarmFilter] = useState<string | undefined>(undefined)
  const [stageFilter, setStageFilter] = useState<string | undefined>(undefined)
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)

  const loadTasks = useCallback(async () => {
    setLoading(true)
    try {
      const params: { farmId?: string; stage?: string; status?: string } = {}
      if (farmFilter !== undefined) params.farmId = farmFilter
      if (stageFilter) params.stage = stageFilter
      if (statusFilter) params.status = statusFilter
      const data = await getTasksApi(params)
      setTasks(data)
    } catch {
      setTasks([])
    } finally {
      setLoading(false)
    }
  }, [farmFilter, stageFilter, statusFilter])

  const loadFarms = async () => {
    try {
      const data = await getFarmsApi()
      setFarms(data)
    } catch {
      setFarms([])
    }
  }

  useEffect(() => {
    loadFarms()
  }, [])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  const farmOptions = farms.map((f) => ({ label: f.name, value: f.id }))

  const columns: ColumnsType<PlanTask> = [
    {
      title: '任务编号',
      dataIndex: 'planNo',
      key: 'planNo',
      width: 140,
      render: (planNo: string) => planNo || '-',
    },
    {
      title: '农场',
      dataIndex: 'farmName',
      key: 'farmName',
      width: 120,
    },
    {
      title: '地块',
      dataIndex: 'plotName',
      key: 'plotName',
      width: 100,
    },
    {
      title: '作物',
      dataIndex: 'cropType',
      key: 'cropType',
      width: 80,
      render: (cropType: string) => cropType || '-',
    },
    {
      title: '农事环节',
      dataIndex: 'stage',
      key: 'stage',
      width: 90,
      render: (stage: string) => (
        <Tag color={STAGE_COLOR[stage] || 'default'}>{stage}</Tag>
      ),
    },
    {
      title: '计划日期',
      dataIndex: 'plannedDate',
      key: 'plannedDate',
      width: 120,
      render: (date: string | null) => date || '未设定',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status: string) => (
        <Tag color={STATUS_COLOR[status] || 'default'}>{status}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Button type="link" size="small" onClick={() => navigate(`/production/tasks/${record.id}`)}>
          查看详情
        </Button>
      ),
    },
  ]

  return (
    <div>
      <div className="page-header">
        <div className="page-header__left">
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/production')}>返回</Button>
          <h2 style={{ margin: 0 }}>任务管理</h2>
        </div>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Space size="middle">
          <span>按农场筛选：</span>
          <Select
            placeholder="全部农场"
            allowClear
            style={{ width: 180 }}
            options={farmOptions}
            value={farmFilter}
            onChange={setFarmFilter}
          />
          <span>按环节筛选：</span>
          <Select
            placeholder="全部环节"
            allowClear
            style={{ width: 120 }}
            options={STAGE_OPTIONS.map((s) => ({ label: s, value: s }))}
            value={stageFilter}
            onChange={setStageFilter}
          />
          <span>按状态筛选：</span>
          <Select
            placeholder="全部状态"
            allowClear
            style={{ width: 120 }}
            options={STATUS_OPTIONS.map((s) => ({ label: s, value: s }))}
            value={statusFilter}
            onChange={setStatusFilter}
          />
        </Space>
      </Card>

      <Card>
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={tasks}
            rowKey="id"
            locale={{
              emptyText: <Empty description="暂无任务数据" />,
            }}
            pagination={{ pageSize: 10, showTotal: (total) => `共 ${total} 条` }}
          />
        </Spin>
      </Card>
    </div>
  )
}

export default TaskList
