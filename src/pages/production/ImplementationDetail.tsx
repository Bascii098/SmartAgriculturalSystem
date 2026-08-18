import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card,
  Button,
  Table,
  Tabs,
  Tag,
  Modal,
  Form,
  Input,
  DatePicker,
  Descriptions,
  Empty,
  Spin,
  Space,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ArrowLeftOutlined } from '@ant-design/icons'
import {
  getImplementationByFarmApi,
  getFarmApi,
  submitImplementationApi,
} from '@/services/api'
import type {
  ImplementationFarmItem as UnimplementedItem,
  ImplementationFarmItemImplemented as ImplementedItem,
} from '@/types/production'
import { STATUS_COLOR } from '@/types/production'

function ImplementationDetail() {
  const { farmId } = useParams<{ farmId: string }>()
  const navigate = useNavigate()
  const [farmName, setFarmName] = useState('')
  const [unimplemented, setUnimplemented] = useState<UnimplementedItem[]>([])
  const [implemented, setImplemented] = useState<ImplementedItem[]>([])
  const [loading, setLoading] = useState(false)

  // 上报 Modal 状态
  const [reportModalVisible, setReportModalVisible] = useState(false)
  const [reportSubmitting, setReportSubmitting] = useState(false)
  const [currentItem, setCurrentItem] = useState<UnimplementedItem | null>(null)
  const [reportForm] = Form.useForm()

  // 详情 Modal 状态
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [detailItem, setDetailItem] = useState<ImplementedItem | null>(null)

  useEffect(() => {
    if (farmId) {
      loadData(farmId)
    }
  }, [farmId])

  const loadData = async (id: string) => {
    setLoading(true)
    try {
      const [farmData, implData] = await Promise.all([
        getFarmApi(id),
        getImplementationByFarmApi(id),
      ])
      setFarmName(farmData.name)
      setUnimplemented(implData.unimplemented || [])
      setImplemented(implData.implemented || [])
    } catch {
      setFarmName('')
      setUnimplemented([])
      setImplemented([])
    } finally {
      setLoading(false)
    }
  }

  // 打开上报 Modal
  const handleOpenReportModal = (item: UnimplementedItem) => {
    setCurrentItem(item)
    setReportModalVisible(true)
    reportForm.resetFields()
    reportForm.setFieldsValue({
      implementDate: undefined,
      method: '',
      seedUsed: '',
      inputAmount: '',
      equipment: '',
      remark: '',
    })
  }

  // 提交上报
  const handleReportSubmit = async () => {
    if (!currentItem) return
    try {
      const values = await reportForm.validateFields()
      setReportSubmitting(true)
      await submitImplementationApi({
        taskId: currentItem.planTask.id,
        plotId: currentItem.plot.id,
        implementDate: values.implementDate?.format('YYYY-MM-DD') || '',
        method: values.method || '',
        seedUsed: values.seedUsed || '',
        inputAmount: values.inputAmount || '',
        equipment: values.equipment || '',
        remark: values.remark || '',
      })
      message.success('实施上报成功')
      setReportModalVisible(false)
      // 刷新数据
      if (farmId) {
        const implData = await getImplementationByFarmApi(farmId)
        setUnimplemented(implData.unimplemented || [])
        setImplemented(implData.implemented || [])
      }
    } catch {
      // 表单校验失败或API错误
    } finally {
      setReportSubmitting(false)
    }
  }

  // 未实施表格列
  const unimplementedColumns: ColumnsType<UnimplementedItem> = [
    {
      title: '地块名称',
      dataIndex: ['plot', 'name'],
      key: 'plotName',
      width: 120,
    },
    {
      title: '作物',
      dataIndex: ['plan', 'cropType'],
      key: 'cropType',
      width: 100,
    },
    {
      title: '任务环节',
      dataIndex: ['planTask', 'stage'],
      key: 'stage',
      width: 100,
    },
    {
      title: '计划日期',
      dataIndex: ['planTask', 'plannedDate'],
      key: 'plannedDate',
      width: 120,
      render: (date: string | null) => date || '未设定',
    },
    {
      title: '任务状态',
      dataIndex: ['planTask', 'status'],
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={STATUS_COLOR[status] || 'default'}>{status}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Button type="link" size="small" onClick={() => handleOpenReportModal(record)}>
          上报
        </Button>
      ),
    },
  ]

  // 已实施表格列
  const implementedColumns: ColumnsType<ImplementedItem> = [
    {
      title: '地块名称',
      dataIndex: ['plot', 'name'],
      key: 'plotName',
      width: 120,
    },
    {
      title: '作物',
      dataIndex: ['plan', 'cropType'],
      key: 'cropType',
      width: 100,
    },
    {
      title: '任务环节',
      dataIndex: ['planTask', 'stage'],
      key: 'stage',
      width: 100,
    },
    {
      title: '实施日期',
      dataIndex: ['implementation', 'implementDate'],
      key: 'implementDate',
      width: 120,
    },
    {
      title: '实施方式',
      dataIndex: ['implementation', 'method'],
      key: 'method',
      width: 120,
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          onClick={() => {
            setDetailItem(record)
            setDetailModalVisible(true)
          }}
        >
          查看详情
        </Button>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/production/implementation')}>
            返回实施总览
          </Button>
          <h2 style={{ margin: 0 }}>实施详情：{farmName || '加载中...'}</h2>
        </Space>
      </div>

      <Spin spinning={loading}>
        <Card>
          <Tabs
            items={[
              {
                key: 'unimplemented',
                label: (
                  <span>
                    未实施
                    {unimplemented.length > 0 && (
                      <Tag color="orange" style={{ marginLeft: 4 }}>
                        {unimplemented.length}
                      </Tag>
                    )}
                  </span>
                ),
                children: (
                  <Table
                    columns={unimplementedColumns}
                    dataSource={unimplemented}
                    rowKey={(record) => record.planTask.id}
                    locale={{
                      emptyText: <Empty description="暂无未实施任务" />,
                    }}
                    pagination={{ pageSize: 10, showTotal: (total) => `共 ${total} 条` }}
                  />
                ),
              },
              {
                key: 'implemented',
                label: (
                  <span>
                    已实施
                    {implemented.length > 0 && (
                      <Tag color="green" style={{ marginLeft: 4 }}>
                        {implemented.length}
                      </Tag>
                    )}
                  </span>
                ),
                children: (
                  <Table
                    columns={implementedColumns}
                    dataSource={implemented}
                    rowKey={(record) => record.implementation.id}
                    locale={{
                      emptyText: <Empty description="暂无已实施记录" />,
                    }}
                    pagination={{ pageSize: 10, showTotal: (total) => `共 ${total} 条` }}
                  />
                ),
              },
            ]}
          />
        </Card>
      </Spin>

      {/* 上报 Modal */}
      <Modal
        title="实施上报"
        open={reportModalVisible}
        onCancel={() => {
          setReportModalVisible(false)
          reportForm.resetFields()
        }}
        onOk={handleReportSubmit}
        confirmLoading={reportSubmitting}
        okText="提交"
        cancelText="取消"
        width={600}
      >
        <Form form={reportForm} layout="vertical">
          <Form.Item
            name="implementDate"
            label="实施日期"
            rules={[{ required: true, message: '请选择实施日期' }]}
          >
            <DatePicker style={{ width: '100%' }} placeholder="请选择实施日期" />
          </Form.Item>
          <Form.Item
            name="method"
            label="实施方式"
            rules={[{ required: true, message: '请输入实施方式' }]}
          >
            <Input placeholder="如：机械作业、人工操作" />
          </Form.Item>
          <Form.Item name="seedUsed" label="用种量">
            <Input placeholder="如：50kg/亩" />
          </Form.Item>
          <Form.Item name="inputAmount" label="投入量">
            <Input placeholder="如：肥料100kg" />
          </Form.Item>
          <Form.Item name="equipment" label="设备">
            <Input placeholder="如：拖拉机、播种机" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} placeholder="其他备注信息" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 实施详情 Modal */}
      <Modal
        title="实施记录详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={600}
      >
        {detailItem && (
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="地块名称">{detailItem.plot.name}</Descriptions.Item>
            <Descriptions.Item label="作物">{detailItem.plan.cropType}</Descriptions.Item>
            <Descriptions.Item label="任务环节">{detailItem.planTask.stage}</Descriptions.Item>
            <Descriptions.Item label="计划日期">{detailItem.planTask.plannedDate || '未设定'}</Descriptions.Item>
            <Descriptions.Item label="实施日期">{detailItem.implementation.implementDate}</Descriptions.Item>
            <Descriptions.Item label="实施方式">{detailItem.implementation.method || '-'}</Descriptions.Item>
            <Descriptions.Item label="用种量">{detailItem.implementation.seedUsed || '-'}</Descriptions.Item>
            <Descriptions.Item label="投入量">{detailItem.implementation.inputAmount || '-'}</Descriptions.Item>
            <Descriptions.Item label="设备">{detailItem.implementation.equipment || '-'}</Descriptions.Item>
            <Descriptions.Item label="备注">{detailItem.implementation.remark || '-'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  )
}

export default ImplementationDetail
