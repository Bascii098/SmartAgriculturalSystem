import {
  Sun,
  CloudSun,
  Cloudy,
  Cloud,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudSnow,
  Snowflake,
  CloudSunRain,
  CloudLightning,
  CloudHail,
} from 'lucide-react'

export interface PlotWeather {
  temp: number
  code: number
  humidity: number
  windSpeed: number
}

const iconSize = 16

export const weatherMap: Record<number, { icon: React.ReactNode; label: string; color: string }> = {
  0:  { icon: <Sun size={iconSize} />,              label: '晴',         color: '#faad14' },
  1:  { icon: <CloudSun size={iconSize} />,         label: '少云',       color: '#d4b106' },
  2:  { icon: <Cloudy size={iconSize} />,           label: '多云',       color: '#8c8c8c' },
  3:  { icon: <Cloud size={iconSize} />,            label: '阴',         color: '#595959' },
  45: { icon: <CloudFog size={iconSize} />,         label: '雾',         color: '#bfbfbf' },
  48: { icon: <CloudFog size={iconSize} />,         label: '雾凇',       color: '#bfbfbf' },
  51: { icon: <CloudDrizzle size={iconSize} />,     label: '小毛毛雨',   color: '#69b1ff' },
  53: { icon: <CloudDrizzle size={iconSize} />,     label: '毛毛雨',     color: '#4096ff' },
  55: { icon: <CloudDrizzle size={iconSize} />,     label: '大毛毛雨',   color: '#1677ff' },
  61: { icon: <CloudRain size={iconSize} />,        label: '小雨',       color: '#69b1ff' },
  63: { icon: <CloudRain size={iconSize} />,        label: '中雨',       color: '#4096ff' },
  65: { icon: <CloudRain size={iconSize} />,        label: '大雨',       color: '#1677ff' },
  71: { icon: <Snowflake size={iconSize} />,        label: '小雪',       color: '#69b1ff' },
  73: { icon: <Snowflake size={iconSize} />,        label: '中雪',       color: '#4096ff' },
  75: { icon: <CloudSnow size={iconSize} />,        label: '大雪',       color: '#85a5ff' },
  80: { icon: <CloudSunRain size={iconSize} />,     label: '阵雨',       color: '#69b1ff' },
  81: { icon: <CloudSunRain size={iconSize} />,     label: '中阵雨',     color: '#4096ff' },
  82: { icon: <CloudSunRain size={iconSize} />,     label: '大阵雨',     color: '#1677ff' },
  95: { icon: <CloudLightning size={iconSize} />,   label: '雷暴',       color: '#ff4d4f' },
  96: { icon: <CloudHail size={iconSize} />,        label: '雷暴+冰雹', color: '#ff4d4f' },
  99: { icon: <CloudLightning size={iconSize} />,   label: '强雷暴',     color: '#cf1322' },
}

export async function fetchPlotWeather(lat: number, lng: number): Promise<PlotWeather> {
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m`,
  )
  const data = await res.json()
  return {
    temp: data.current.temperature_2m,
    code: data.current.weather_code,
    humidity: data.current.relative_humidity_2m,
    windSpeed: data.current.wind_speed_10m,
  }
}

// ====== 天气预警（和风天气 API） ======

const QWEATHER_HOST = 'nv3qqhv7hn.re.qweatherapi.com'
const QWEATHER_KEY = 'a12e7b6ff3194501844b47dbb09a35df'

export interface WeatherWarning {
  id: string
  warningType: string
  warningLevel: '蓝色' | '黄色' | '橙色' | '红色'
  description: string
  farmId: string
  farmName: string
}

interface FarmWeatherInfo {
  farmId: string
  farmName: string
  lat: number
  lng: number
}

/** 和风天气预警等级映射 */
const LEVEL_MAP: Record<string, '蓝色' | '黄色' | '橙色' | '红色'> = {
  Blue: '蓝色',
  Yellow: '黄色',
  Orange: '橙色',
  Red: '红色',
}

/** 为单个农场获取和风天气预警 */
async function fetchWarningsForFarm(farm: FarmWeatherInfo): Promise<WeatherWarning[]> {
  try {
    const location = `${farm.lng},${farm.lat}`
    const res = await fetch(
      `https://${QWEATHER_HOST}/v7/warning/now?location=${location}&key=${QWEATHER_KEY}`,
    )
    const data = await res.json()
    if (data.code !== '200' || !data.warning) return []

    return data.warning
      .filter((w: any) => w.status === 'active')
      .map((w: any) => ({
        id: `${farm.farmId}-${w.id}`,
        warningType: w.typeName || '气象预警',
        warningLevel: LEVEL_MAP[w.level] || '黄色',
        description: w.text || w.title || '',
        farmId: farm.farmId,
        farmName: farm.farmName,
      }))
  } catch {
    return []
  }
}

/**
 * 按农场聚合地块，调用和风天气 API 获取真实灾害预警
 * @param farms 农场列表，每个包含 farmId、farmName、lat、lng
 */
export async function fetchWeatherWarnings(farms: FarmWeatherInfo[]): Promise<WeatherWarning[]> {
  const results = await Promise.all(farms.map((f) => fetchWarningsForFarm(f)))
  return results.flat()
}
