import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Typography, Skeleton, Alert, Card } from 'antd'
import {
  GlobalOutlined,
  TeamOutlined,
  EnvironmentOutlined,
  ExperimentOutlined,
  RightOutlined,
  RiseOutlined,
  CloudOutlined,
  WarningOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'
import { useAppSelector } from '@/store/hooks'
import { getPlotsApi, getWeatherApi, getWeatherWarningsApi, type WeatherData } from '@/services/api'
import type { PlotFeature } from '@/types/plot'
import type { DisasterWarning } from '@/types/production'

const { Text } = Typography

interface StatItem {
  key: string
  label: string
  value: number | string
  icon: React.ReactNode
  iconClass: string
}

interface ShortcutItem {
  key: string
  title: string
  desc: string
  icon: React.ReactNode
  path: string
}

function Dashboard() {
  const navigate = useNavigate()
  const username = useAppSelector((state) => state.auth.username)
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn)

  const [plots, setPlots] = useState<PlotFeature[]>([])
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [warnings, setWarnings] = useState<DisasterWarning[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getPlotsApi().then(setPlots).catch(() => {}),
      getWeatherApi().then(setWeather).catch(() => {}),
      getWeatherWarningsApi().then(setWarnings).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  // 统计数据
  const stats: StatItem[] = useMemo(() => {
    const totalArea = plots.reduce((sum, p) => sum + (p.area || 0), 0)
    const totalCrops = plots.reduce((sum, p) => sum + (p.crops?.length || 0), 0)
    const uniqueOwners = new Set(plots.map((p) => p.owner).filter(Boolean)).size

    return [
      {
        key: 'plots',
        label: '地块总数',
        value: loading ? '...' : plots.length,
        icon: <GlobalOutlined />,
        iconClass: 'stat-card__icon--green',
      },
      {
        key: 'area',
        label: '总面积（亩）',
        value: loading ? '...' : totalArea.toFixed(0),
        icon: <RiseOutlined />,
        iconClass: 'stat-card__icon--gold',
      },
      {
        key: 'owners',
        label: '种植户数',
        value: loading ? '...' : uniqueOwners,
        icon: <TeamOutlined />,
        iconClass: 'stat-card__icon--blue',
      },
      {
        key: 'crops',
        label: '作物种类',
        value: loading ? '...' : totalCrops,
        icon: <ExperimentOutlined />,
        iconClass: 'stat-card__icon--brown',
      },
    ]
  }, [plots, loading])

  const shortcuts: ShortcutItem[] = [
    {
      key: 'gis',
      title: 'GIS 可视化',
      desc: '查看地块分布与作物信息',
      icon: <GlobalOutlined />,
      path: '/gis',
    },
    {
      key: 'growers',
      title: '种植者管理',
      desc: '管理种植户与合作社信息',
      icon: <TeamOutlined />,
      path: '/growers',
    },
    {
      key: 'farms',
      title: '农场管理',
      desc: '农场信息管理与维护',
      icon: <EnvironmentOutlined />,
      path: '/farms',
    },
  ]

  // 欢迎语
  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 6) return '夜深了'
    if (hour < 9) return '早上好'
    if (hour < 12) return '上午好'
    if (hour < 14) return '中午好'
    if (hour < 18) return '下午好'
    return '晚上好'
  }, [])

  const today = useMemo(() => {
    const d = new Date()
    const weekDays = ['日', '一', '二', '三', '四', '五', '六']
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 星期${weekDays[d.getDay()]}`
  }, [])

  // 模拟最近动态
  const activities = [
    { text: '地块「东区麦田」作物数据已更新', time: '10分钟前', dot: 'stat-card__icon--green' as const },
    { text: '新种植户「张三」完成信息登记', time: '1小时前', dot: 'stat-card__icon--blue' as const },
    { text: '交接申请：地块「南区菜地」待确认', time: '3小时前', dot: 'stat-card__icon--gold' as const },
    { text: '系统完成每日数据备份', time: '5小时前', dot: 'stat-card__icon--green' as const },
  ]

  return (
    <div className="dashboard">
      {/* 欢迎区 */}
      <div className="dashboard__welcome">
        <div className="dashboard__welcome-title">
          {greeting}，{isLoggedIn ? username : '管理员'}
        </div>
        <div className="dashboard__welcome-sub">{today}</div>
      </div>

      {/* 统计卡片 */}
      <div className="stats-row">
        {stats.map((stat) => (
          <Card className="stat-card" key={stat.key} styles={{ body: { padding: 0 } }}>
            <div className={`stat-card__icon ${stat.iconClass}`}>{stat.icon}</div>
            <div>
              {loading ? (
                <Skeleton.Input active size="small" style={{ width: 48, height: 28 }} />
              ) : (
                <div className="stat-card__value">{stat.value}</div>
              )}
              <div className="stat-card__label">{stat.label}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* 快捷入口 */}
      <div className="shortcuts-row">
        {shortcuts.map((item) => (
          <Card
            className="shortcut-card"
            key={item.key}
            hoverable
            onClick={() => navigate(item.path)}
            styles={{ body: { padding: '24px' } }}
          >
            <div className="shortcut-card__icon">{item.icon}</div>
            <div>
              <div className="shortcut-card__title">{item.title}</div>
              <div className="shortcut-card__desc">{item.desc}</div>
            </div>
            <RightOutlined className="shortcut-card__arrow" />
          </Card>
        ))}
      </div>

      {/* 下半部分：天气+预警 + 动态 */}
      <div className="dashboard-grid">
        <div className="dashboard-left-col">
          {/* 实时天气 */}
          <Card
            className="dashboard-card"
            title={
              <span className="dashboard-card__title">
                <CloudOutlined className="dashboard-card__title-icon" />
                实时天气
              </span>
            }
          >
            {weather ? (
              <div>
                <div className="weather-widget">
                  <span className="weather-widget__icon">
                    {weather.temperature > 30 ? '☀️' : weather.temperature > 20 ? '🌤' : weather.temperature > 10 ? '⛅' : '🌥'}
                  </span>
                  <div>
                    <div className="weather-widget__temp">{weather.temperature}°C</div>
                    <Text type="secondary">{weather.condition}</Text>
                  </div>
                </div>
                <div className="weather-widget__detail">
                  <span>湿度 {weather.humidity}%</span>
                  <span>风速 {weather.windSpeed}</span>
                </div>
              </div>
            ) : (
              <Skeleton active paragraph={{ rows: 2 }} />
            )}
          </Card>

          {/* 灾害预警 */}
          <Card
            className="dashboard-card"
            title={
              <span className="dashboard-card__title">
                <WarningOutlined className="dashboard-card__title-icon" />
                灾害预警
              </span>
            }
          >
            {loading ? (
              <Skeleton active paragraph={{ rows: 2 }} />
            ) : warnings.length === 0 ? (
              <div className="warning-empty">
                <CheckCircleOutlined className="warning-empty__icon" />
                <span>当前无生效预警</span>
              </div>
            ) : (
              <div className="warning-list">
                {warnings.map((w) => {
                  const alertType =
                    w.warningLevel === '红色' ? 'error' :
                    w.warningLevel === '橙色' ? 'warning' :
                    w.warningLevel === '黄色' ? 'warning' : 'info'
                  return (
                    <Alert
                      key={w.id}
                      type={alertType}
                      showIcon
                      message={`${w.warningType}（${w.warningLevel}预警）`}
                      description={
                        <div>
                          <div>{w.description}</div>
                          <div className="warning-time">
                            {w.startTime} ~ {w.endTime}
                          </div>
                        </div>
                      }
                      style={{ marginBottom: 8 }}
                    />
                  )
                })}
              </div>
            )}
          </Card>
        </div>

        {/* 最近动态 */}
        <Card
          className="dashboard-card"
          title={<span className="dashboard-card__title">最近动态</span>}
        >
          {activities.map((item, i) => (
            <div className="activity-item" key={i}>
              <span className={`activity-item__dot ${item.dot}`} />
              <span className="activity-item__text">{item.text}</span>
              <span className="activity-item__time">{item.time}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}

export default Dashboard
