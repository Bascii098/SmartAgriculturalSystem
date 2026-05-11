import { useEffect, useRef, useState, useMemo } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import ReactECharts from 'echarts-for-react'
import { AutoComplete, Input, Button, Descriptions, Typography, Empty } from 'antd'
import { SearchOutlined, CloseOutlined } from '@ant-design/icons'
import type { PlotFeature } from '@/types/plot'
import { getPlotsApi, getWeatherApi, type WeatherData } from '@/services/api'
import '@/styles/GIS.scss'

// 高德卫星影像瓦片
const AMAP_TILE_URL =
  'https://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}'

const DEFAULT_CENTER: [number, number] = [36.855, 118.765]
const DEFAULT_ZOOM = 12

// 修复 Leaflet 默认图标在打包工具中的路径问题
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'
const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})
L.Marker.prototype.options.icon = DefaultIcon

const { Title, Text } = Typography

function GIS() {
  const mapRef = useRef<L.Map | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const polygonRefs = useRef<Map<string, L.Polygon>>(new Map())

  const [selectedPlot, setSelectedPlot] = useState<PlotFeature | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [plots, setPlots] = useState<PlotFeature[]>([])
  const [weather, setWeather] = useState<WeatherData | null>(null)

  // 从 API 获取地块数据
  useEffect(() => {
    getPlotsApi()
      .then(setPlots)
      .catch(() => console.error('获取地块数据失败'))
  }, [])

  // 面板打开时获取天气
  useEffect(() => {
    if (panelOpen) {
      getWeatherApi()
        .then(setWeather)
        .catch(() => {})
    }
  }, [panelOpen])

  const searchOptions = useMemo(
    () => plots.map((p) => ({ label: p.name, value: p.name })),
    [plots],
  )

  const handleSearchSelect = (value: string) => {
    const plot = plots.find((p) => p.name === value)
    if (!plot || !mapRef.current) return

    // 地图飞到地块中心
    mapRef.current.flyTo(plot.center, 15, { duration: 1 })

    // 高亮 2 秒
    const polygon = polygonRefs.current.get(plot.id)
    if (polygon) {
      polygon.setStyle({ fillOpacity: 0.6, weight: 4 })
      setTimeout(() => polygon.setStyle({ fillOpacity: 0.3, weight: 2 }), 2000)
    }

    setSelectedPlot(plot)
    setPanelOpen(true)
    setSearchText('')
  }

  // ECharts 饼图配置
  const pieOption = useMemo(
    () =>
      selectedPlot
        ? {
            tooltip: {
              trigger: 'item' as const,
              formatter: '{b}: {c} 亩 ({d}%)',
            },
            series: [
              {
                type: 'pie' as const,
                radius: ['45%', '75%'],
                data: selectedPlot.crops.map((c) => ({
                  name: c.name,
                  value: c.area,
                })),
                label: { formatter: '{b}\n{d}%' },
                color: ['#4caf50', '#8bc34a', '#ffa726', '#795548', '#29b6f6'],
              },
            ],
          }
        : null,
    [selectedPlot],
  )

  // Effect 1：初始化空地图（只执行一次）
  useEffect(() => {
    if (!mapContainerRef.current) return

    const map = L.map(mapContainerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
      attributionControl: false,
    })

    // 高德瓦片（仅底图）
    L.tileLayer(AMAP_TILE_URL, {
      subdomains: ['1', '2', '3', '4'],
      maxZoom: 18,
      minZoom: 4,
    }).addTo(map)

    mapRef.current = map

    const currentPolygons = polygonRefs.current

    return () => {
      map.remove()
      currentPolygons.clear()
    }
  }, [])

  // Effect 2：plots 数据到达后绘制多边形
  useEffect(() => {
    if (!mapRef.current || plots.length === 0) return

    // 清除旧多边形
    polygonRefs.current.forEach((p) => p.remove())
    polygonRefs.current.clear()

    // 绘制新的
    plots.forEach((plot) => {
      // 服务器返回 [lat, lng] 格式，Leaflet 也需要 [lat, lng]
      const latLngs = plot.coordinates as [number, number][]

      const polygon = L.polygon(latLngs, {
        color: plot.color || '#1890ff',
        fillColor: plot.color || '#1890ff',
        fillOpacity: 0.3,
        weight: 2,
      }).addTo(mapRef.current!)

      // 地块名称标签
      polygon.bindTooltip(plot.name, {
        permanent: true,
        direction: 'center',
        className: 'gis-plot-label',
      })

      // 点击弹出浮窗
      polygon.on('click', () => {
        setSelectedPlot(plot)
        setPanelOpen(true)
      })

      polygonRefs.current.set(plot.id, polygon)
    })
  }, [plots])

  return (
    <div className="gis-page">
      <div className="gis-map-container" ref={mapContainerRef} />

      <div className="gis-search">
        <AutoComplete
          options={searchOptions}
          onSelect={handleSearchSelect}
          value={searchText}
          onChange={setSearchText}
          placeholder="搜索地块名称..."
        >
          <Input
            prefix={<SearchOutlined />}
            placeholder="搜索地块名称..."
            allowClear
          />
        </AutoComplete>
      </div>

      <div className={`gis-panel ${panelOpen ? 'gis-panel--open' : ''}`}>
        <div className="gis-panel__header">
          <Title level={4} className="gis-panel__title">
            {selectedPlot?.name ?? ''}
          </Title>
          <Button
            type="text"
            icon={<CloseOutlined />}
            onClick={() => setPanelOpen(false)}
          />
        </div>
        {selectedPlot ? (
          <div className="gis-panel__body">
            <Descriptions column={1} size="small" className="gis-panel__desc">
              <Descriptions.Item label="总面积">
                {selectedPlot.area} 亩
              </Descriptions.Item>
              <Descriptions.Item label="地址">
                {selectedPlot.address}
              </Descriptions.Item>
              <Descriptions.Item label="所属种植户">
                {selectedPlot.owner}
              </Descriptions.Item>
            </Descriptions>

            <Title level={5}>主要作物</Title>
            {selectedPlot.crops.map((crop, index) => (
              <div className="gis-panel__crop-item" key={index}>
                <Text>{crop.name}</Text>
                <Text strong>{crop.area} 亩</Text>
              </div>
            ))}

            {pieOption && (
              <div className="gis-panel__chart">
                <Title level={5}>作物面积占比</Title>
                <ReactECharts className="gis-panel__chart-body" option={pieOption} />
              </div>
            )}

            <div className="gis-panel__weather">
              {weather ? (
                <div className="gis-panel__weather-grid">
                  <div>
                    <Text type="secondary" className="gis-panel__weather-label">温度</Text>
                    <div><Text strong>{weather.temperature}°C</Text></div>
                  </div>
                  <div>
                    <Text type="secondary" className="gis-panel__weather-label">天气</Text>
                    <div><Text strong>{weather.condition}</Text></div>
                  </div>
                  <div>
                    <Text type="secondary" className="gis-panel__weather-label">湿度</Text>
                    <div><Text strong>{weather.humidity}%</Text></div>
                  </div>
                  <div>
                    <Text type="secondary" className="gis-panel__weather-label">风力</Text>
                    <div><Text strong>{weather.windSpeed}</Text></div>
                  </div>
                </div>
              ) : (
                <Text type="secondary">天气数据获取中...</Text>
              )}
            </div>
          </div>
        ) : (
          <div
            className="gis-panel__body gis-panel__empty"
          >
            <Empty description="请点击地块或搜索" />
          </div>
        )}
      </div>
    </div>
  )
}

export default GIS
