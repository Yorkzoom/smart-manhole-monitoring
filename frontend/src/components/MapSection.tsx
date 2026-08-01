import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { SensorData } from '../types'
import { SENSOR_META } from '../constants'

interface MapSectionProps {
  center: { lat: number; lng: number }
  currentData: SensorData | null
  onMoveMarker: (lat: number, lng: number) => void
}

const RISK_LEVEL_COLORS = ['#00e676', '#ffab00', '#ff6d00', '#ff1744']
const LEVEL_LABELS = ['低', '中', '高', '紧急']

export default function MapSection({ center, currentData, onMoveMarker }: MapSectionProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.CircleMarker | null>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    const map = L.map(mapRef.current, {
      center: [center.lat, center.lng],
      zoom: 17,
      zoomControl: true,
      attributionControl: false,
    })

    L.tileLayer('https://webrd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
      maxZoom: 19,
      subdomains: ['webrd01', 'webrd02', 'webrd03', 'webrd04'],
    }).addTo(map)

    mapInstanceRef.current = map

    const marker = L.circleMarker([center.lat, center.lng], {
      radius: 14,
      fillColor: '#00e676',
      color: '#00e676',
      weight: 2,
      opacity: 0.6,
      fillOpacity: 0.8,
    }).addTo(map)

    markerRef.current = marker

    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng
      marker.setLatLng([lat, lng])
      onMoveMarker(lat, lng)
    })

    setTimeout(() => map.invalidateSize(), 100)

    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Update marker when center changes from socket
  useEffect(() => {
    const map = mapInstanceRef.current
    const marker = markerRef.current
    if (!map || !marker) return
    marker.setLatLng([center.lat, center.lng])
    map.setView([center.lat, center.lng], 17, { animate: true })
  }, [center.lat, center.lng])

  // Update marker color and popup when data changes
  useEffect(() => {
    const marker = markerRef.current
    if (!marker || !currentData) return

    const level = currentData.risk_level
    const color = RISK_LEVEL_COLORS[level] || '#00e676'
    const statusLabel = LEVEL_LABELS[level] || '未知'

    marker.setStyle({ fillColor: color, color })
    marker.setRadius(level >= 2 ? 16 : 14)

    const rows = Object.entries(SENSOR_META).map(([key, meta]) => {
      const val = currentData[key] as number
      return `<tr>
        <td style="color:#888;padding-right:8px">${meta.icon} ${meta.label}</td>
        <td style="color:#e0e4ea;font-family:monospace;text-align:right">${val.toFixed(meta.decimals)}<span style="color:#666;font-size:11px;margin-left:2px">${meta.unit}</span></td>
      </tr>`
    }).join('')

    const popupContent = `
      <div style="min-width:200px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.06)">
          <span style="font-size:13px;color:#e0e4ea;font-weight:600">井盖状态</span>
          <span style="font-size:11px;padding:2px 8px;border-radius:10px;background:${color}20;color:${color}">${statusLabel}</span>
        </div>
        <table style="font-size:12px;width:100%">${rows}</table>
        <div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.06);font-size:11px;color:#666">
          风险评分: <span style="color:${color}">${currentData.risk_score.toFixed(1)}</span>
        </div>
      </div>
    `

    if (!marker.getPopup()) {
      marker.bindPopup(popupContent, {
        className: 'map-popup-custom',
        closeButton: true,
        maxWidth: 280,
        offset: [0, -14],
      })
    } else {
      marker.setPopupContent(popupContent)
    }
  }, [currentData])

  return (
    <section id="map" className="bg-bg py-8">
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 lg:px-16">
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
          viewport={{ once: true, margin: '-100px' }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-px bg-stroke" />
            <span className="text-xs text-muted uppercase tracking-[0.3em]">位置总览</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-display italic text-text-primary">
            地理 <span className="text-muted">位置</span>
          </h2>
          <p className="text-sm text-muted mt-2">点击地图可重新定位井盖位置</p>
        </motion.div>

        <motion.div
          className="relative rounded-3xl overflow-hidden border border-stroke"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          viewport={{ once: true, margin: '-50px' }}
        >
          <style>{`
            .map-popup-custom .leaflet-popup-content-wrapper {
              background: #0a0a0a;
              color: #e0e4ea;
              border-radius: 12px;
              padding: 4px;
              border: 1px solid rgba(255,255,255,0.08);
              box-shadow: 0 8px 32px rgba(0,0,0,0.6);
            }
            .map-popup-custom .leaflet-popup-tip {
              background: #0a0a0a;
              border: 1px solid rgba(255,255,255,0.08);
            }
            .map-popup-custom .leaflet-popup-close-button {
              color: #666 !important;
              font-size: 16px !important;
              top: 8px !important;
              right: 8px !important;
            }
            .map-popup-custom .leaflet-popup-close-button:hover {
              color: #e0e4ea !important;
            }
            .map-container .leaflet-tile-pane {
              filter: brightness(0.7) invert(1) hue-rotate(180deg) saturate(0.6);
            }
            .map-container .leaflet-control-zoom {
              border: none !important;
              margin: 12px !important;
            }
            .map-container .leaflet-control-zoom a {
              background: #0a0a0a !important;
              color: #e0e4ea !important;
              border-color: rgba(255,255,255,0.1) !important;
              width: 32px !important;
              height: 32px !important;
              line-height: 32px !important;
              font-size: 16px !important;
            }
            .map-container .leaflet-control-zoom a:hover {
              background: #1a1a1a !important;
            }
            .map-container .leaflet-control-attribution { display: none !important; }
          `}</style>
          <div className="map-container">
            <div ref={mapRef} className="w-full" style={{ height: '420px' }} />
          </div>
        </motion.div>
      </div>
    </section>
  )
}
