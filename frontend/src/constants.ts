import type { SensorMeta } from './types'

export const SENSOR_META: Record<string, SensorMeta> = {
  temperature: {
    label: '温度', unit: '°C', decimals: 1, icon: 'T',
    color: '#ff6b6b', barMax: 50,
    thresholds: { warning: 35, critical: 45 },
    range: '正常 < 35°C | > 45°C 危险',
  },
  humidity: {
    label: '湿度', unit: '%', decimals: 0, icon: 'H',
    color: '#4dabf7', barMax: 100,
    thresholds: { warning: 80, critical: 90 },
    range: '正常 20~80% | 危险 > 90%',
  },
  tilt_angle: {
    label: '倾斜角度', unit: '°', decimals: 1, icon: 'A',
    color: '#69db7c', barMax: 30,
    thresholds: { warning: 10, critical: 20 },
    range: '正常 < 10° | > 20° 危险',
  },
  mq2: {
    label: '可燃气体', unit: '', decimals: 0, icon: 'G',
    color: '#ffd43b', barMax: 3000,
    thresholds: { warning: 2000, critical: 2800 },
    range: '正常 < 1800 | > 2800 危险',
  },
  mq4: {
    label: '甲烷', unit: '', decimals: 0, icon: 'M',
    color: '#ff922b', barMax: 2500,
    thresholds: { warning: 1500, critical: 2000 },
    range: '正常 < 1500 | > 2000 危险',
  },
  light: {
    label: '光照强度', unit: 'lux', decimals: 0, icon: 'L',
    color: '#da77f2', barMax: 3000,
    thresholds: { warning: 2000, critical: 3000 },
    range: '正常 < 1000 lux | > 3000 lux 异常',
  },
}

export const RISK_COLORS: Record<number, { fg: string; label: string }> = {
  0: { fg: '#00e676', label: '低风险' },
  1: { fg: '#ffab00', label: '中风险' },
  2: { fg: '#ff6d00', label: '高风险' },
  3: { fg: '#ff1744', label: '紧急风险' },
}

export const AI_RISK_MAP: Record<string, { color: string; label: string }> = {
  low: { color: '#00e676', label: '低风险' },
  mid: { color: '#ffab00', label: '中风险' },
  high: { color: '#ff6d00', label: '高风险' },
  critical: { color: '#ff1744', label: '紧急' },
}
