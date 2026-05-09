import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Button,
  Card,
  Descriptions,
  Empty,
  Row,
  Col,
  Spin,
  Drawer,
  Form,
  Input,
  InputNumber,
  Select,
  Collapse,
  Switch,
  DatePicker,
  Popconfirm,
  message,
  Tag,
} from 'antd'
import {
  ArrowLeftOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons'
import { MapContainer, TileLayer, Polygon, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  fetchFarm,
  fetchFarmPlots,
  addPlot,
  editPlot,
  removePlot,
  clearCurrentFarm,
} from '@/store/farmSlice'
import type { PlotFeature, PlotFormData } from '@/types/plot'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'

/** 表单值类型（日期字段使用 Dayjs） */
interface PlotFormValues extends Omit<PlotFormData, 'plantingDate' | 'landCertStart' | 'landCertEnd'> {
  plantingDate?: Dayjs
  landCertStart?: Dayjs
  landCertEnd?: Dayjs
}

const SOIL_TYPES = ['永久基本农田', '一般农田', '高标准农田', '其他']
const PLOT_SHAPES = ['长方形', '正方形', '不规则']
const LAND_NATURES = ['旱地', '水田']

function FarmDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { currentFarm, plots, plotsLoading } = useAppSelector((state) => state.farm)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingPlot, setEditingPlot] = useState<PlotFeature | null>(null)
  const [form] = Form.useForm<PlotFormValues>()

  useEffect(() => {
    if (id) {
      dispatch(fetchFarm(id))
      dispatch(fetchFarmPlots(id))
    }
    return () => {
      dispatch(clearCurrentFarm())
    }
  }, [id, dispatch])

  const handleCreatePlot = () => {
    setEditingPlot(null)
    form.resetFields()
    setDrawerOpen(true)
  }

  const handleEditPlot = (plot: PlotFeature) => {
    setEditingPlot(plot)
    form.setFieldsValue({
      name: plot.name,
      soilType: plot.soilType,
      plotShape: plot.plotShape,
      landNature: plot.landNature,
      irrigationFacility: plot.irrigationFacility,
      area: plot.area,
      address: plot.address,
      crops: plot.crops,
      coordinates: plot.coordinates,
      center: plot.center,
      planter: plot.planter,
      plantingDate: plot.plantingDate ? dayjs(plot.plantingDate) : undefined,
      landCertNumber: plot.landCertNumber,
      landCertArea: plot.landCertArea,
      landCertStart: plot.landCertStart ? dayjs(plot.landCertStart) : undefined,
      landCertEnd: plot.landCertEnd ? dayjs(plot.landCertEnd) : undefined,
    })
    setDrawerOpen(true)
  }

  const handleDeletePlot = async (plotId: string) => {
    await dispatch(removePlot(plotId))
    message.success('地块已删除')
  }

  const handleDrawerSubmit = async () => {
    const values = await form.validateFields()
    const submitData: PlotFormData = {
      ...values,
      plantingDate: values.plantingDate?.format('YYYY-MM-DD') ?? '',
      landCertStart: values.landCertStart?.format('YYYY-MM-DD') ?? '',
      landCertEnd: values.landCertEnd?.format('YYYY-MM-DD') ?? '',
    }
    if (editingPlot) {
      await dispatch(editPlot({ id: editingPlot.id, data: submitData }))
      message.success('地块已更新')
    } else {
      await dispatch(addPlot({ farmId: id!, data: submitData }))
      message.success('地块已创建')
    }
    setDrawerOpen(false)
  }

  // 计算地图中心：如果有地块则取第一个地块的中心，否则用农场坐标
  const mapCenter: [number, number] =
    plots.length > 0
      ? plots[0].center
      : currentFarm
        ? [currentFarm.latitude, currentFarm.longitude]
        : [45.25, 127.53]

  return (
    <div className="farm-detail">
      <div className="farm-detail__header">
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/farms')}
        >
          返回农场列表
        </Button>
      </div>

      {currentFarm && (
        <Card className="farm-detail__info" style={{ marginBottom: 20 }}>
          <Descriptions title={currentFarm.name} column={{ xs: 1, sm: 2, md: 3 }}>
            <Descriptions.Item label="农场地址">
              <EnvironmentOutlined /> {currentFarm.address}
            </Descriptions.Item>
            <Descriptions.Item label="负责人">
              {currentFarm.managerName || currentFarm.manager}
            </Descriptions.Item>
            <Descriptions.Item label="经纬度">
              {currentFarm.longitude}, {currentFarm.latitude}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      <Row gutter={20} className="farm-detail__body">
        {/* 左侧：地块列表 */}
        <Col xs={24} lg={12}>
          <div className="farm-detail__plots-header">
            <h3>地块列表（{plots.length}）</h3>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreatePlot}>
              新建地块
            </Button>
          </div>

          <Spin spinning={plotsLoading}>
            {plots.length === 0 && !plotsLoading ? (
              <Empty description="暂无地块">
                <Button type="primary" icon={<PlusOutlined />} onClick={handleCreatePlot}>
                  新建地块
                </Button>
              </Empty>
            ) : (
              <div className="farm-detail__plots-list">
                {plots.map((plot) => (
                  <Card
                    key={plot.id}
                    size="small"
                    className="plot-card"
                    extra={
                      <>
                        <Button
                          type="text"
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => handleEditPlot(plot)}
                        />
                        <Popconfirm
                          title="确定删除该地块？"
                          onConfirm={() => handleDeletePlot(plot.id)}
                        >
                          <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                      </>
                    }
                  >
                    <div className="plot-card__content">
                      <div className="plot-card__title">{plot.name}</div>
                      <div className="plot-card__meta">
                        <Tag>{plot.soilType || '未设置土质'}</Tag>
                        <span>{plot.area} 亩</span>
                        {plot.landCertNumber && <Tag color="blue">{plot.landCertNumber}</Tag>}
                      </div>
                      {plot.crops.length > 0 && (
                        <div className="plot-card__crops">
                          {plot.crops.map((c, i) => (
                            <Tag key={i} color="green">
                              {c.name} {c.area}亩
                            </Tag>
                          ))}
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Spin>
        </Col>

        {/* 右侧：地图 */}
        <Col xs={24} lg={12}>
          <Card title="地块地图" className="farm-detail__map-card">
            <div className="farm-detail__map-container" style={{ height: 500 }}>
              <MapContainer
                center={mapCenter}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom
              >
                <TileLayer
                  url="https://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}"
                  subdomains={['1', '2', '3', '4']}
                  maxZoom={18}
                />
                {plots.map((plot) =>
                  plot.coordinates.length > 0 ? (
                    <Polygon
                      key={plot.id}
                      positions={plot.coordinates}
                      pathOptions={{
                        color: plot.color || '#4caf50',
                        fillOpacity: 0.3,
                        weight: 2,
                      }}
                    >
                      <Popup>
                        <strong>{plot.name}</strong>
                        <br />
                        面积：{plot.area} 亩
                        {plot.crops.length > 0 && (
                          <>
                            <br />
                            作物：{plot.crops.map((c) => c.name).join('、')}
                          </>
                        )}
                      </Popup>
                    </Polygon>
                  ) : null,
                )}
              </MapContainer>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 地块创建/编辑 Drawer */}
      <Drawer
        title={editingPlot ? '编辑地块' : '新建地块'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={520}
        extra={
          <Button type="primary" onClick={handleDrawerSubmit}>
            保存
          </Button>
        }
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Collapse
            defaultActiveKey={['basic', 'planting', 'cert']}
            ghost
            items={[
              {
                key: 'basic',
                label: '基本信息',
                children: (
                  <>
                    <Form.Item name="name" label="地块名称" rules={[{ required: true }]}>
                      <Input placeholder="请输入地块名称" />
                    </Form.Item>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item name="soilType" label="土质类型">
                          <Select placeholder="选择土质类型" options={SOIL_TYPES.map((v) => ({ label: v, value: v }))} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="plotShape" label="地块形状">
                          <Select placeholder="选择地块形状" options={PLOT_SHAPES.map((v) => ({ label: v, value: v }))} />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item name="landNature" label="土地性质">
                          <Select placeholder="选择土地性质" options={LAND_NATURES.map((v) => ({ label: v, value: v }))} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="irrigationFacility" label="灌溉设施" valuePropName="checked">
                          <Switch checkedChildren="有" unCheckedChildren="无" />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item name="area" label="面积（亩）" rules={[{ required: true }]}>
                          <InputNumber style={{ width: '100%' }} min={0} placeholder="0" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="address" label="地址">
                          <Input placeholder="省/市/县/镇/村" />
                        </Form.Item>
                      </Col>
                    </Row>
                  </>
                ),
              },
              {
                key: 'planting',
                label: '种植信息',
                children: (
                  <>
                    <Form.Item name="planter" label="种植员">
                      <Input placeholder="请输入种植员姓名" />
                    </Form.Item>
                    <Form.Item name="plantingDate" label="种植时间">
                      <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                  </>
                ),
              },
              {
                key: 'cert',
                label: '土地确权信息',
                children: (
                  <>
                    <Form.Item name="landCertNumber" label="确权证号">
                      <Input placeholder="请输入确权证号" />
                    </Form.Item>
                    <Form.Item name="landCertArea" label="确权面积（亩）">
                      <InputNumber style={{ width: '100%' }} min={0} placeholder="0" />
                    </Form.Item>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item name="landCertStart" label="确权期限起">
                          <DatePicker style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="landCertEnd" label="确权期限止">
                          <DatePicker style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                    </Row>
                  </>
                ),
              },
            ]}
          />
        </Form>
      </Drawer>
    </div>
  )
}

export default FarmDetail
