import { useState, useEffect } from 'react'
import { Space, Tag, Typography } from 'antd'
import {
  ClockCircleOutlined,
  CalendarOutlined,
} from '@ant-design/icons'
import { Cloud } from 'lucide-react'
import { Lunar } from 'lunar-javascript'
import { weatherMap } from '@/utils/weather'

const { Text } = Typography

const iconSize = 16

function getGregorian(): string {
  const now = new Date()
  const y = now.getFullYear()
  const M = now.getMonth() + 1
  const d = now.getDate()
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']
  const w = weekDays[now.getDay()]
  return `${y}年${M}月${d}日 星期${w}`
}

function getLunar(): string {
  const lunar = Lunar.fromDate(new Date())
  return `${lunar.getYearInGanZhi()}年（${lunar.getYearShengXiao()}） ${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`
}

function HeaderInfo() {
  const [time, setTime] = useState('')
  const [weather, setWeather] = useState<{ temp: number; code: number } | null>(null)

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setTime(
        now.toLocaleTimeString('zh-CN', { hour12: false }),
      )
    }
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=39.9&longitude=116.4&current=temperature_2m,weather_code',
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.current) {
          setWeather({
            temp: data.current.temperature_2m,
            code: data.current.weather_code,
          })
        }
      })
      .catch(() => null)
  }, [])

  return (
    <Space size="middle" className="header-info">
      <Tag icon={<CalendarOutlined />} color="default">
        {getGregorian()}
      </Tag>
      <Tag icon={<CalendarOutlined />} color="default">
        {getLunar()}
      </Tag>
      <Tag color="default">
        {weather && weatherMap[weather.code] ? (
          <Space size={4}>
            <span style={{ color: weatherMap[weather.code].color }}>
              {weatherMap[weather.code].icon}
            </span>
            {weatherMap[weather.code].label} {weather.temp}°C
          </Space>
        ) : weather ? (
          <Space size={4}>
            <Cloud size={iconSize} />
            未知 {weather.temp}°C
          </Space>
        ) : (
          '加载中…'
        )}
      </Tag>
      <Tag icon={<ClockCircleOutlined />} color="default">
        <Text code className="header-time">
          {time}
        </Text>
      </Tag>
    </Space>
  )
}

export default HeaderInfo
