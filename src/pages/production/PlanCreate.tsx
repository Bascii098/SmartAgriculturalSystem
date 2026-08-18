import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  Button,
  Steps,
  Table,
  Form,
  Input,
  InputNumber,
  Row,
  Col,
  Descriptions,
  Empty,
  Spin,
  Space,
  Alert,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { getPlotsApi, getFarmsApi, createPlanApi } from '@/services/api'
import type { PlotFeature } from '@/types/plot'
import type { Farm } from '@/types/farm'

interface CropConfig {
  cropType: string
  seedVariety: string
  area: number
}

function PlanCreate() {
  const navigate = useNavigate()
  const [current, setCurrent] = useState(0)
  const [plots, setPlots] = useState<PlotFeature[]>([])
  const [farms, setFarms] = useState<Farm[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectedPlotIds, setSelectedPlotIds] = useState<string[]>([])
  const [cropConfigs, setCropConfigs] = useState<Record<string, CropConfig>>({})

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [plotsData, farmsData] = await Promise.all([getPlotsApi(), getFarmsApi()])
      setPlots(plotsData)
      setFarms(farmsData)
    } catch {
      setPlots([])
      setFarms([])
    } finally {
      setLoading(false)
    }
  }

  const getFarmName = (farmId: string) => {
    const farm = farms.find((f) => f.id === farmId)
    return farm?.name || farmId
  }

  const selectedPlots = plots.filter((p) => selectedPlotIds.includes(p.id))

  // Step 1: 选择地块
  const step1Columns: ColumnsType<PlotFeature> = [
    {
      title: '地块名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '所属农场',
      dataIndex: 'farmId',
      key: 'farmId',
      render: (farmId: string) => getFarmName(farmId),
    },
    {
      title: '面积',
      dataIndex: 'area',
      key: 'area',
      render: (area: number) => `${area} 亩`,
    },
    {
      title: '当前作物',
      key: 'crops',
      render: (_, record) =>
        record.crops.length > 0
          ? record.crops.map((c) => c.name).join(', ')
          : '-',
    },
  ]

  const rowSelection = {
    selectedRowKeys: selectedPlotIds,
    onChange: (keys: React.Key[]) => setSelectedPlotIds(keys as string[]),
  }

  // Step 2: 配置作物 - 更新配置
  const handleCropChange = (plotId: string, field: keyof CropConfig, value: string | number) => {
    setCropConfigs((prev) => ({
      ...prev,
      [plotId]: {
        ...prev[plotId],
        [field]: value,
      },
    }))
  }

  // Step 2 validation
  const isStep2Valid = () => {
    if (selectedPlots.length === 0) return false
    return selectedPlots.every((plot) => {
      const config = cropConfigs[plot.id]
      return config?.cropType?.trim() && config?.seedVariety?.trim() && config?.area > 0
    })
  }

  // Step 3: 确认生成
  const handleGenerate = async () => {
    setSubmitting(true)
    try {
      for (const plot of selectedPlots) {
        const config = cropConfigs[plot.id] || { cropType: '', seedVariety: '', area: 0 }
        await createPlanApi({
          plotId: plot.id,
          farmId: plot.farmId,
          cropType: config.cropType,
          seedVariety: config.seedVariety,
          area: config.area,
        })
      }
      message.success('种植计划创建成功')
      navigate('/production/plans')
    } catch {
      message.error('创建失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  // 步骤校验
  const canProceed = () => {
    if (current === 0) return selectedPlotIds.length > 0
    if (current === 1) return isStep2Valid()
    return true
  }

  const next = () => {
    if (!canProceed()) {
      if (current === 0) message.warning('请至少选择一个地块')
      else if (current === 1) message.warning('请填写完整的作物信息')
      return
    }
    // 从Step1进入Step2时，自动填充地块的作物信息
    if (current === 0) {
      setCropConfigs((prev) => {
        const nextConfigs = { ...prev }
        for (const plot of selectedPlots) {
          if (!nextConfigs[plot.id] && plot.crops.length > 0) {
            const firstCrop = plot.crops[0]
            nextConfigs[plot.id] = {
              cropType: firstCrop.name || '',
              seedVariety: '',
              area: plot.area,
            }
          }
        }
        return nextConfigs
      })
    }
    setCurrent(current + 1)
  }

  const prev = () => setCurrent(current - 1)

  const steps = [
    { title: '选择地块', description: '勾选需要规划的地块' },
    { title: '配置作物', description: '为每个地块配置作物信息' },
    { title: '确认生成', description: '核对信息并生成计划' },
  ]

  return (
    <div>
      <div className="page-header">
        <Space>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/production/plans')}>
            返回计划列表
          </Button>
          <h2 style={{ margin: 0 }}>新建种植计划</h2>
        </Space>
      </div>

      <Card>
        <Steps current={current} items={steps} style={{ marginBottom: 32 }} />
      </Card>

      <Spin spinning={loading}>
        {/* Step 1 - 选择地块 */}
        {current === 0 && (
          <Card title="选择地块">
            {plots.length === 0 && !loading ? (
              <Empty description="暂无可用地块" />
            ) : (
              <Table
                columns={step1Columns}
                dataSource={plots}
                rowKey="id"
                rowSelection={rowSelection}
                pagination={{ pageSize: 10 }}
              />
            )}
          </Card>
        )}

        {/* Step 2 - 配置作物 */}
        {current === 1 && (
          <Card title="为选中地块配置作物信息">
            {selectedPlots.length === 0 ? (
              <Empty description="未选择任何地块" />
            ) : (
              <Row gutter={[16, 16]}>
                {selectedPlots.map((plot) => {
                  const config = cropConfigs[plot.id] || { cropType: '', seedVariety: '', area: 0 }
                  return (
                    <Col xs={24} sm={12} lg={8} key={plot.id}>
                      <Card
                        size="small"
                        title={plot.name}
                        extra={<span style={{ color: '#999' }}>{plot.area} 亩</span>}
                      >
                        <Form layout="vertical" size="small">
                          <Form.Item label="作物种类" required>
                            <Input
                              placeholder="如：水稻、玉米"
                              value={config.cropType}
                              onChange={(e) => handleCropChange(plot.id, 'cropType', e.target.value)}
                            />
                          </Form.Item>
                          <Form.Item label="种子品种" required>
                            <Input
                              placeholder="如：龙粳31"
                              value={config.seedVariety}
                              onChange={(e) => handleCropChange(plot.id, 'seedVariety', e.target.value)}
                            />
                          </Form.Item>
                          <Form.Item label="种植面积（亩）" required>
                            <InputNumber
                              className="full-width"
                              min={0.01}
                              max={plot.area}
                              value={config.area || undefined}
                              onChange={(val) => handleCropChange(plot.id, 'area', val ?? 0)}
                              placeholder={`最大 ${plot.area} 亩`}
                            />
                          </Form.Item>
                        </Form>
                      </Card>
                    </Col>
                  )
                })}
              </Row>
            )}
          </Card>
        )}

        {/* Step 3 - 确认生成 */}
        {current === 2 && (
          <Card title="确认种植计划信息">
            <Alert
              title="请核对以下信息，确认无误后点击「生成计划」"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Descriptions bordered column={{ xs: 1, sm: 2 }}>
              {selectedPlots.map((plot) => {
                const config = cropConfigs[plot.id] || { cropType: '', seedVariety: '', area: 0 }
                return (
                  <Descriptions.Item key={plot.id} label={plot.name}>
                    <div>
                      <p><strong>农场：</strong>{getFarmName(plot.farmId)}</p>
                      <p><strong>作物：</strong>{config.cropType}</p>
                      <p><strong>品种：</strong>{config.seedVariety}</p>
                      <p><strong>面积：</strong>{config.area} 亩</p>
                    </div>
                  </Descriptions.Item>
                )
              })}
            </Descriptions>
          </Card>
        )}
      </Spin>

      {/* 底部导航按钮 */}
      <Card style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          {current > 0 && (
            <Button onClick={prev}>上一步</Button>
          )}
          {current < steps.length - 1 && (
            <Button type="primary" onClick={next}>
              下一步
            </Button>
          )}
          {current === steps.length - 1 && (
            <Button type="primary" loading={submitting} onClick={handleGenerate}>
              生成计划
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}

export default PlanCreate
