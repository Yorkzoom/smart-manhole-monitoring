export interface SensorMeta {
  label: string
  unit: string
  decimals: number
  icon: string
  color: string
  barMax: number
  thresholds: { warning: number; critical: number }
  range: string
}

export interface SensorData {
  timestamp: string
  temperature: number
  humidity: number
  tilt_angle: number
  mq2: number
  mq4: number
  light: number
  risk_score: number
  risk_level: number
  [key: string]: string | number
}

export interface AiAnalysis {
  risk_level: string
  summary: string
  trend_analysis: string
  anomalies: string[]
  suggestions: string[]
  analyzed_at: string
}

export interface Alert {
  time: string
  text: string
  level: number
}

export interface InitPayload {
  current: SensorData
  history: SensorData[]
  alerts: Alert[]
  meta: Record<string, SensorMeta>
  location: string
  lat: number
  lng: number
}

export interface LocationData {
  name: string
  lat: number
  lng: number
}

export interface SensorDataWithTime extends SensorData {
  _time: number
}
