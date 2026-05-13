import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  Button,
  Table,
  Tag,
  Select,
  Empty,
  Spin,
  Popconfirm,
  message,
  Space,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { PlusOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { getPlansApi, deletePlanApi } from '@/services/api'
import type { PlantingPlan } from '@/types/production'
import { STATUS_COLOR } from '@/types/production'

function PlanList() {
  const navigate = useNavigate()
  const [plans, setPlans] = useState<PlantingPlan[]>([])
  const [loading, setLoading] = useState(false)
  const [farmFilter, setFarmFilter] = useState<string | undefined>(undefined)
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)

  useEffect(() => {
    loadPlans()
  }, [])

  const loadPlans = async () => {
    setLoading(true)
    try {
      const data = await getPlansApi()
      setPlans(data)
    } catch {
      setPlans([])
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await deletePlanApi(id)
      message.success('删除成功')
      await loadPlans()
    } catch {
      message.error('删除失败')
    }
  }

  // 提取农场选项
  const farmOptions = Array.from(
    new Map(plans.filter((p) => p.farmName).map((p) => [p.farmId, p.farmName])).entries()
  ).map(([id, name]) => ({ label: name, value: id }))

  // 过滤数据
  const filteredPlans = plans.filter((p) => {
    if (farmFilter !== undefined && p.farmId !== farmFilter) return false
    if (statusFilter !== undefined && p.status !== statusFilter) return false
    return true
  })

  const columns: ColumnsType<PlantingPlan> = [
    {
      title: '计划编号',
      dataIndex: 'planNo',
      key: 'planNo',
      width: 140,
    },
    {
      title: '农场',
      dataIndex: 'farmName',
      key: 'farmName',
      width: 140,
    },
    {
      title: '地块',
      dataIndex: 'plotName',
      key: 'plotName',
      width: 120,
    },
    {
      title: '作物',
      dataIndex: 'cropType',
      key: 'cropType',
      width: 100,
    },
    {
      title: '种子品种',
      dataIndex: 'seedVariety',
      key: 'seedVariety',
      width: 120,
    },
    {
      title: '面积',
      dataIndex: 'area',
      key: 'area',
      width: 100,
      render: (area: number) => `${area} 亩`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={STATUS_COLOR[status] || 'default'}>{status}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            onClick={() => navigate(`/production/plans/${record.id}`)}
          >
            查看详情
          </Button>
          <Popconfirm
            title="确定删除该计划？"
            onConfirm={() => handleDelete(record.id)}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div className="page-header">
        <div className="page-header__left">
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/production')}>返回</Button>
          <h2 style={{ margin: 0 }}>种植计划管理</h2>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/production/plans/create')}
        >
          新建计划
        </Button>
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
          <span>按状态筛选：</span>
          <Select
            placeholder="全部状态"
            allowClear
            style={{ width: 140 }}
            options={[
              { label: '待执行', value: '待执行' },
              { label: '进行中', value: '进行中' },
              { label: '已完成', value: '已完成' },
              { label: '已逾期', value: '已逾期' },
            ]}
            value={statusFilter}
            onChange={setStatusFilter}
          />
        </Space>
      </Card>

      <Card>
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={filteredPlans}
            rowKey="id"
            locale={{
              emptyText: <Empty description="暂无种植计划数据" />,
            }}
            pagination={{ pageSize: 10, showTotal: (total) => `共 ${total} 条` }}
          />
        </Spin>
      </Card>
    </div>
  )
}

export default PlanList
