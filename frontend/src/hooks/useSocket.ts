import { useEffect, useState, useCallback, useRef } from 'react'
import { io } from 'socket.io-client'
import type { SensorData, Alert, InitPayload, AiAnalysis, LocationData } from '../types'

const SOCKET_URL = import.meta.env.DEV ? 'http://localhost:3000' : ''

export function useSocket() {
  const [connected, setConnected] = useState(false)
  const [currentData, setCurrentData] = useState<SensorData | null>(null)
  const [history, setHistory] = useState<SensorData[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [locationName, setLocationName] = useState('??????????????16????')
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: 35.93990, lng: 120.17856 })
  const [aiAnalysis, setAiAnalysis] = useState<AiAnalysis | null>(null)
  const historyRef = useRef<SensorData[]>([])
  const locationNameRef = useRef(locationName)

  useEffect(() => { locationNameRef.current = locationName }, [locationName])

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] })

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    socket.on('init', (data: InitPayload) => {
      if (data.current) setCurrentData(data.current)
      if (data.history?.length) {
        const mapped = data.history.map(d => ({ ...d, _time: new Date(d.timestamp).getTime() }))
        historyRef.current = mapped
        setHistory(mapped)
      }
      if (data.alerts) setAlerts(data.alerts)
      if (data.location) setLocationName(data.location)
      if (typeof data.lat === 'number' && typeof data.lng === 'number') {
        setMapCenter({ lat: data.lat, lng: data.lng })
      }
    })

    socket.on('data', (data: SensorData) => {
      const point = { ...data, _time: new Date(data.timestamp).getTime() }
      setCurrentData(point)
      historyRef.current = [...historyRef.current.slice(-299), point]
      setHistory(historyRef.current)
    })

    socket.on('alerts', (data: Alert[]) => setAlerts(data))
    socket.on('location', (data: LocationData) => {
      setLocationName(data.name)
      setMapCenter({ lat: data.lat, lng: data.lng })
    })
    socket.on('ai_analysis', (data: AiAnalysis) => setAiAnalysis(data))

    return () => { socket.disconnect() }
  }, [])

  const saveLocation = useCallback((name: string) => {
    fetch('/api/location', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }).catch(err => console.error('[??] ????:', err))
  }, [])

  const moveMarker = useCallback((lat: number, lng: number, name?: string) => {
    fetch('/api/location', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name || locationNameRef.current,
        lat,
        lng,
      }),
    }).catch(err => console.error('[??] ????:', err))
  }, [])

  // Desktop notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Send notification when risk level >= 2
  const prevRiskRef = useRef(-1);
  useEffect(() => {
    if (!currentData || currentData.risk_level < 1) {
      if (currentData) prevRiskRef.current = currentData.risk_level;
      return;
    }
    if (prevRiskRef.current >= 1) { prevRiskRef.current = currentData.risk_level; return; }
    prevRiskRef.current = currentData.risk_level;
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('警告: 风险等级升高', {
        body: `当前风险评分: ${currentData.risk_score.toFixed(1)} - ${currentData.risk_level >= 3 ? '紧急' : '高风险'}`,
      });
    }
  }, [currentData]);

  const [lastUpdateTime, setLastUpdateTime] = useState<number | null>(null);
  const [isOnline, setIsOnline] = useState(false);

  // Track last data time
  useEffect(() => {
    if (currentData) {
      setLastUpdateTime(Date.now());
      setIsOnline(true);
    }
  }, [currentData]);

  // Check online status every second
  useEffect(() => {
    const timer = setInterval(() => {
      if (lastUpdateTime && Date.now() - lastUpdateTime > 15000) {
        setIsOnline(false);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [lastUpdateTime]);

  const [stats, setStats] = useState<any>(null);

  // Fetch stats every 30s
  useEffect(() => {
    const fetchStats = () => {
      fetch('/api/stats?hours=1')
        .then(r => r.json())
        .then(d => setStats(d))
        .catch(() => {});
    };
    fetchStats();
    const timer = setInterval(fetchStats, 30000);
    return () => clearInterval(timer);
  }, []);

  return {
    connected,
    currentData,
    history,
    alerts,
    locationName,
    mapCenter,
    aiAnalysis,
    saveLocation,
    moveMarker,
    lastUpdateTime,
    isOnline,
    stats,
  }
}



