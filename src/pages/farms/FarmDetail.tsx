import { useEffect, useRef, useState, useCallback } from 'react'
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
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Collapse,
  Switch,
  DatePicker,
  Popconfirm,
  ColorPicker,
  message,
  Tag,
} from 'antd'
import {
  ArrowLeftOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EnvironmentOutlined,
  AimOutlined,
  ExpandOutlined,
  CompressOutlined,
} from '@ant-design/icons'
import { MapContainer, TileLayer, Polygon, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw'
import 'leaflet-draw/dist/leaflet.draw.css'
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

interface PlotFormValues extends Omit<PlotFormData, 'plantingDate' | 'landCertStart' | 'landCertEnd' | 'color'> {
  plantingDate?: Dayjs
  landCertStart?: Dayjs
  landCertEnd?: Dayjs
  color?: string | { toHexString: () => string }
}

const SOIL_TYPES = ['永久基本农田', '一般农田', '高标准农田', '其他']
const PLOT_SHAPES = ['长方形', '正方形', '不规则']
const LAND_NATURES = ['旱地', '水田']

const PLOT_COLORS = [
  '#4caf50', '#2196f3', '#ff9800', '#e91e63', '#9c27b0',
  '#00bcd4', '#ff5722', '#795548', '#607d8b', '#3f51b5',
  '#8bc34a', '#ffc107', '#f44336', '#009688', '#673ab7',
]

function getNextColor(existingColors: (string | undefined)[]): string {
  const used = new Set(existingColors.filter(Boolean))
  return PLOT_COLORS.find((c) => !used.has(c)) || PLOT_COLORS[0]
}

function getPolygonCenter(coords: [number, number][]): [number, number] {
  if (coords.length === 0) return [0, 0]
  const latSum = coords.reduce((s, c) => s + c[0], 0)
  const lngSum = coords.reduce((s, c) => s + c[1], 0)
  return [latSum / coords.length, lngSum / coords.length]
}

/** 地图控制：flyTo + 绘制工具 */
function MapController({
  onMapReady,
  drawnCoords,
  onCoordsChange,
  enableDraw,
}: {
  onMapReady: (map: L.Map) => void
  drawnCoords: [number, number][]
  onCoordsChange: (coords: [number, number][]) => void
  enableDraw: boolean
}) {
  const map = useMap()
  const drawControlRef = useRef<L.Control.Draw | null>(null)
  const drawnItemsRef = useRef<L.FeatureGroup>(new L.FeatureGroup())

  useEffect(() => {
    onMapReady(map)
  }, [map, onMapReady])

  // 初始化绘制控件
  useEffect(() => {
    if (!enableDraw) return

    map.addLayer(drawnItemsRef.current)

    const drawControl = new L.Control.Draw({
      position: 'topright',
      draw: {
        rectangle: false,
        circle: false,
        circlemarker: false,
        marker: false,
        polyline: false,
        polygon: {
          allowIntersection: false,
          shapeOptions: {
            color: '#4caf50',
            fillOpacity: 0.3,
            weight: 2,
          },
        },
      },
      edit: {
        featureGroup: drawnItemsRef.current,
      },
    })
    map.addControl(drawControl)
    drawControlRef.current = drawControl

    // 绘制完成
    const handleCreated = (e: L.LayerEvent) => {
      const layer = e.layer as L.Polygon
      drawnItemsRef.current.addLayer(layer)
      const latlngs = layer.getLatLngs()[0] as L.LatLng[]
      const coords: [number, number][] = latlngs.map((ll) => [ll.lat, ll.lng])
      onCoordsChange(coords)
    }

    // 编辑完成
    const handleEdited = () => {
      const coords: [number, number][] = []
      drawnItemsRef.current.eachLayer((layer) => {
        if (layer instanceof L.Polygon) {
          const latlngs = layer.getLatLngs()[0] as L.LatLng[]
          latlngs.forEach((ll) => coords.push([ll.lat, ll.lng]))
        }
      })
      onCoordsChange(coords)
    }

    // 删除完成
    const handleDeleted = () => {
      onCoordsChange([])
    }

    map.on(L.Draw.Event.CREATED, handleCreated)
    map.on(L.Draw.Event.EDITED, handleEdited)
    map.on(L.Draw.Event.DELETED, handleDeleted)

    return () => {
      map.removeControl(drawControl)
      map.removeLayer(drawnItemsRef.current)
      map.off(L.Draw.Event.CREATED, handleCreated)
      map.off(L.Draw.Event.EDITED, handleEdited)
      map.off(L.Draw.Event.DELETED, handleDeleted)
    }
  }, [map, enableDraw, onCoordsChange])

  // 编辑时在地图上显示已有边界并飞到该位置
  useEffect(() => {
    if (!enableDraw) return
    drawnItemsRef.current.clearLayers()
    if (drawnCoords.length > 0) {
      const polygon = L.polygon(drawnCoords, {
        color: '#4caf50',
        fillOpacity: 0.3,
        weight: 2,
      })
      drawnItemsRef.current.addLayer(polygon)
      map.fitBounds(polygon.getBounds(), { padding: [30, 30], maxZoom: 16 })
    }
  }, [drawnCoords, enableDraw, map])

  return null
}

function FarmDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { currentFarm, plots, plotsLoading } = useAppSelector((state) => state.farm)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingPlot, setEditingPlot] = useState<PlotFeature | null>(null)
  const [selectedPlotId, setSelectedPlotId] = useState<string | null>(null)
  const [drawnCoords, setDrawnCoords] = useState<[number, number][]>([])
  const [mapExpanded, setMapExpanded] = useState(false)
  const [form] = Form.useForm<PlotFormValues>()

  const mapRef = useRef<L.Map | null>(null)

  useEffect(() => {
    if (id) {
      dispatch(fetchFarm(id))
      dispatch(fetchFarmPlots(id))
    }
    return () => {
      dispatch(clearCurrentFarm())
    }
  }, [id, dispatch])

  const handleMapReady = useCallback((map: L.Map) => {
    mapRef.current = map
  }, [])

  const handleCoordsChange = useCallback((coords: [number, number][]) => {
    setDrawnCoords(coords)
  }, [])

  /** 点击地块卡片 → 地图飞到该地块 */
  const handleFlyToPlot = (plot: PlotFeature) => {
    setSelectedPlotId(plot.id)
    if (plot.center && mapRef.current) {
      mapRef.current.flyTo(plot.center, 15, { duration: 1 })
    }
  }

  const handleCreatePlot = () => {
    setEditingPlot(null)
    setDrawnCoords([])
    form.resetFields()
    setDrawerOpen(true)
  }

  const handleEditPlot = (plot: PlotFeature) => {
    setEditingPlot(plot)
    setDrawnCoords(plot.coordinates || [])
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
      color: plot.color || '#4caf50',
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
    if (id) await dispatch(fetchFarmPlots(id))
    message.success('地块已删除')
  }

  const handleDrawerSubmit = async () => {
    if (drawnCoords.length === 0) {
      message.warning('请在地图上绘制地块边界')
      return
    }
    const values = await form.validateFields()
    const plotArea = values.area ?? 0
    const crops = values.crops ?? []
    const cropsTotal = crops.reduce((sum, c) => sum + (c?.area ?? 0), 0)
    if (cropsTotal > plotArea) {
      message.warning(`作物总面积（${cropsTotal}亩）不能超过地块面积（${plotArea}亩）`)
      return
    }
    const colorValue = typeof values.color === 'string'
      ? values.color
      : values.color?.toHexString?.() ?? undefined
    const submitData: PlotFormData = {
      name: values.name,
      area: values.area ?? 0,
      coordinates: drawnCoords,
      center: getPolygonCenter(drawnCoords),
      color: editingPlot
        ? (colorValue || editingPlot.color || getNextColor(plots.map((p) => p.color)))
        : (colorValue || getNextColor(plots.map((p) => p.color))),
      soilType: values.soilType,
      plotShape: values.plotShape,
      landNature: values.landNature,
      irrigationFacility: values.irrigationFacility ?? false,
      address: values.address,
      crops,
      planter: values.planter,
      plantingDate: values.plantingDate?.format('YYYY-MM-DD') ?? '',
      landCertNumber: values.landCertNumber,
      landCertArea: values.landCertArea,
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
    // 从后端重新拉取，确保数据一致
    if (id) await dispatch(fetchFarmPlots(id))
    setDrawerOpen(false)
  }

  const mapCenter: [number, number] =
    plots.length > 0
      ? plots[0].center
      : currentFarm
        ? [currentFarm.latitude, currentFarm.longitude]
        : [45.25, 127.53]

  return (
    <div className="farm-detail">
      <div className="farm-detail__header">
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/farms')}>
          返回农场列表
        </Button>
      </div>

      {currentFarm && (
        <Card className="farm-detail__info">
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

      <Row gutter={20} className="farm-detail__body" style={{ flex: 1, minHeight: 0 }}>
        {/* 左侧：地块列表 */}
        <Col xs={24} lg={8} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div className="farm-detail__plots-header">
            <h3>地块列表（{plots.length}）</h3>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreatePlot}>
              新建地块
            </Button>
          </div>

          <Spin spinning={plotsLoading} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            {plots.length === 0 && !plotsLoading ? (
              <Empty description="暂无地块" />
            ) : (
              <div className="farm-detail__plots-list">
                {plots.map((plot) => (
                  <Card
                    key={plot.id}
                    size="small"
                    className={`plot-card ${selectedPlotId === plot.id ? 'plot-card--selected' : ''}`}
                    onClick={() => handleFlyToPlot(plot)}
                    extra={
                      <>
                        <Button
                          type="text"
                          size="small"
                          icon={<AimOutlined />}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleFlyToPlot(plot)
                          }}
                          title="定位到地图"
                        />
                        <Button
                          type="text"
                          size="small"
                          icon={<EditOutlined />}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditPlot(plot)
                          }}
                        />
                        <Popconfirm
                          title="确定删除该地块？"
                          onConfirm={() => handleDeletePlot(plot.id)}
                        >
                          <Button
                            type="text"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </Popconfirm>
                      </>
                    }
                  >
                    <div className="plot-card__content">
                      <div className="plot-card__row">
                        <span className="plot-card__title">{plot.name}</span>
                        <span className="plot-card__area">{plot.area} 亩</span>
                      </div>
                      <div className="plot-card__row">
                        <span className="plot-card__detail">
                          {plot.soilType || '-'} · {plot.landNature || '-'} · {plot.plotShape || '-'}
                        </span>
                        {plot.irrigationFacility && <Tag color="cyan" style={{ fontSize: 11 }}>有灌溉</Tag>}
                      </div>
                      {plot.crops.length > 0 && (
                        <div className="plot-card__row">
                          <span className="plot-card__crops">
                            {plot.crops.map((c, i) => (
                              <Tag key={i} color="green" style={{ fontSize: 11 }}>
                                {c.name} {c.area}亩
                              </Tag>
                            ))}
                          </span>
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
        <Col xs={24} lg={16} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <Card title="地块地图" className="farm-detail__map-card" style={{ height: '100%' }}>
            <div className="farm-detail__map-container">
              <MapContainer
                center={mapCenter}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom
              >
                <MapController
                  onMapReady={handleMapReady}
                  drawnCoords={[]}
                  onCoordsChange={() => {}}
                  enableDraw={false}
                />
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
                        fillOpacity: selectedPlotId === plot.id ? 0.5 : 0.2,
                        weight: selectedPlotId === plot.id ? 4 : 2,
                      }}
                      eventHandlers={{
                        click: () => setSelectedPlotId(plot.id),
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
        width={720}
        extra={
          <Button type="primary" onClick={handleDrawerSubmit}>
            保存
          </Button>
        }
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Collapse
            defaultActiveKey={['basic', 'map', 'planting', 'cert']}
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
                      <Col span={8}>
                        <Form.Item name="area" label="面积（亩）" rules={[{ required: true }]}>
                          <InputNumber style={{ width: '100%' }} min={0} placeholder="0" />
                        </Form.Item>
                      </Col>
                      <Col span={10}>
                        <Form.Item name="address" label="地址">
                          <Input placeholder="省/市/县/镇/村" />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item name="color" label="地块颜色">
                          <ColorPicker
                            format="hex"
                            presets={[{ label: '推荐颜色', colors: PLOT_COLORS }]}
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                  </>
                ),
              },
              {
                key: 'map',
                label: '地块位置（在地图上绘制）',
                children: (
                  <div>
                    <div style={{ position: 'relative' }}>
                      <div style={{ height: 300, borderRadius: 8, overflow: 'hidden' }}>
                        <MapContainer
                          center={drawnCoords.length > 0 ? getPolygonCenter(drawnCoords) : mapCenter}
                          zoom={drawnCoords.length > 0 ? 16 : 14}
                          style={{ height: '100%', width: '100%' }}
                          scrollWheelZoom
                        >
                          <MapController
                            onMapReady={() => {}}
                            drawnCoords={drawnCoords}
                            onCoordsChange={handleCoordsChange}
                            enableDraw
                          />
                          <TileLayer
                            url="https://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}"
                            subdomains={['1', '2', '3', '4']}
                            maxZoom={18}
                          />
                        </MapContainer>
                      </div>
                      <Button
                        icon={<ExpandOutlined />}
                        size="small"
                        style={{ position: 'absolute', bottom: 8, left: 8, zIndex: 1000 }}
                        onClick={() => setMapExpanded(true)}
                      />
                    </div>
                    {drawnCoords.length > 0 ? (
                      <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
                        已绘制 {drawnCoords.length} 个顶点，可在地图上编辑或删除
                      </div>
                    ) : (
                      <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
                        使用右侧绘图工具在地图上绘制地块边界
                      </div>
                    )}
                  </div>
                ),
              },
              {
                key: 'planting',
                label: '种植信息',
                children: (
                  <>
                    <Form.List name="crops">
                      {(fields, operation) => (
                        <>
                          {fields.map((field) => (
                            <Row key={field.key} gutter={12} align="middle" style={{ marginBottom: 8 }}>
                              <Col flex="auto">
                                <Row gutter={8}>
                                  <Col span={14}>
                                    <Form.Item
                                      {...field}
                                      name={[field.name, 'name']}
                                      noStyle
                                      rules={[{ required: true, message: '请输入作物名称' }]}
                                    >
                                      <Input placeholder="作物名称" />
                                    </Form.Item>
                                  </Col>
                                  <Col span={8}>
                                    <Form.Item
                                      {...field}
                                      name={[field.name, 'area']}
                                      noStyle
                                      rules={[
                                        { required: true, message: '请输入面积' },
                                        { type: 'number', min: 0.01, message: '面积必须大于0' },
                                      ]}
                                    >
                                      <InputNumber style={{ width: '100%' }} min={0} placeholder="面积（亩）" />
                                    </Form.Item>
                                  </Col>
                                  <Col span={2}>
                                    <Button
                                      type="text"
                                      danger
                                      icon={<DeleteOutlined />}
                                      onClick={() => operation.remove(field.name)}
                                    />
                                  </Col>
                                </Row>
                              </Col>
                            </Row>
                          ))}
                          <Form.Item>
                            <Button
                              type="dashed"
                              block
                              icon={<PlusOutlined />}
                              onClick={() => operation.add({ name: '', area: 0 })}
                            >
                              添加作物
                            </Button>
                          </Form.Item>
                        </>
                      )}
                    </Form.List>
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

      {/* 放大地图浮窗 */}
      <Modal
        open={mapExpanded}
        onCancel={() => setMapExpanded(false)}
        footer={null}
        width="85vw"
        styles={{ body: { padding: 0, height: '75vh' } }}
        destroyOnClose
        centered
      >
        <div style={{ position: 'relative', height: '100%' }}>
          <MapContainer
            center={drawnCoords.length > 0 ? getPolygonCenter(drawnCoords) : mapCenter}
            zoom={drawnCoords.length > 0 ? 16 : 14}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom
          >
            <MapController
              onMapReady={() => {}}
              drawnCoords={drawnCoords}
              onCoordsChange={handleCoordsChange}
              enableDraw
            />
            <TileLayer
              url="https://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}"
              subdomains={['1', '2', '3', '4']}
              maxZoom={18}
            />
          </MapContainer>
          <Button
            icon={<CompressOutlined />}
            style={{ position: 'absolute', bottom: 16, left: 16, zIndex: 1000 }}
            onClick={() => setMapExpanded(false)}
          >
            收起
          </Button>
        </div>
      </Modal>
    </div>
  )
}

export default FarmDetail
