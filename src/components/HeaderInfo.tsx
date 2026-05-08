import { useState, useEffect } from 'react'
import { Space, Tag, Typography } from 'antd'
import {
  ClockCircleOutlined,
  CalendarOutlined,
  CloudOutlined,
} from '@ant-design/icons'
import { Lunar } from 'lunar-javascript'

const { Text } = Typography

interface WeatherData {
  temp: number
  code: number
}

const weatherMap: Record<number, string> = {
  0: '☀️ 晴',
  1: '🌤 少云',
  2: '⛅ 多云',
  3: '☁️ 阴',
  45: '🌫 雾',
  48: '🌫 雾凇',
  51: '🌧 小毛毛雨',
  53: '🌧 毛毛雨',
  55: '🌧 大毛毛雨',
  61: '🌧 小雨',
  63: '🌧 中雨',
  65: '🌧 大雨',
  71: '❄️ 小雪',
  73: '❄️ 中雪',
  75: '❄️ 大雪',
  80: '🌦 阵雨',
  81: '🌦 中阵雨',
  82: '🌦 大阵雨',
  95: '⛈ 雷暴',
  96: '⛈ 雷暴+冰雹',
  99: '⛈ 强雷暴',
}

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
  const [weather, setWeather] = useState<WeatherData | null>(null)

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
    fetch('https://ipapi.co/json/')
      .then((res) => res.json())
      .then(({ latitude, longitude }) => {
        if (latitude && longitude) {
          return fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code`,
          )
        }
        throw new Error('No location')
      })
      .then((res) => res.json())
      .then((data) => {
        if (data.current) {
          setWeather({
            temp: data.current.temperature_2m,
            code: data.current.weather_code,
          })
        }
      })
      .catch(() => {
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
      })
  }, [])

  return (
    <Space size="middle" style={{ marginRight: 16 }}>
      <Tag icon={<CalendarOutlined />} color="default">
        {getGregorian()}
      </Tag>
      <Tag icon={<CalendarOutlined />} color="default">
        {getLunar()}
      </Tag>
      <Tag icon={<CloudOutlined />} color="default">
        {weather
          ? `${weatherMap[weather.code] ?? '未知'} ${weather.temp}°C`
          : '加载中…'}
      </Tag>
      <Tag icon={<ClockCircleOutlined />} color="default">
        <Text code style={{ fontSize: 14 }}>
          {time}
        </Text>
      </Tag>
    </Space>
  )
}

export default HeaderInfo
